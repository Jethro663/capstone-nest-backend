from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .retrieval_service import similarity_search
from .schemas import RequestUser

INTERVENTION_RECOMMENDATION_SYSTEM_PROMPT = """You generate concise, grounded intervention recommendations for teachers in a high-school LMS.

Rules:
- Use only the supplied mistake summary, weak concepts, and retrieved lesson evidence.
- Keep the tone teacher-facing and practical.
- Do not invent student performance details that are not provided.
- Return valid JSON only.
"""

INTERVENTION_RECOMMENDATION_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "teacherActions": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
            "maxItems": 4,
        },
        "studentFocus": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2,
            "maxItems": 4,
        },
    },
    "required": ["summary", "teacherActions", "studentFocus"],
}


async def recommend_intervention_case(
    db: AsyncSession,
    user: RequestUser,
    *,
    case_id: str,
    note: str | None = None,
) -> dict[str, Any]:
    case_row = await db.execute(
        sa_text(
            """
            SELECT
              ic.id,
              ic.class_id,
              ic.student_id,
              ic.status,
              ic.trigger_score,
              ic.threshold_applied,
              c.teacher_id,
              c.subject_name,
              c.subject_code,
              s.grade_level
            FROM intervention_cases ic
            INNER JOIN classes c ON c.id = ic.class_id
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE ic.id = :caseId
            """
        ),
        {"caseId": case_id},
    )
    intervention_case = case_row.mappings().first()
    if not intervention_case:
        raise HTTPException(404, "Intervention case not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(intervention_case["teacher_id"]) != user.id:
        raise HTTPException(403, "You do not have access to this intervention case")
    if intervention_case["status"] != "active":
        raise HTTPException(400, "Only active intervention cases can be recommended")

    mistakes_rows = await db.execute(
        sa_text(
            """
            SELECT
              q.id AS question_id,
              q.content,
              q.explanation,
              q.concept_tags,
              r.student_answer,
              a.id AS assessment_id,
              a.title AS assessment_title
            FROM assessment_attempts aa
            INNER JOIN assessments a ON a.id = aa.assessment_id
            INNER JOIN assessment_responses r ON r.attempt_id = aa.id
            INNER JOIN assessment_questions q ON q.id = r.question_id
            WHERE aa.student_id = :studentId
              AND a.class_id = :classId
              AND r.is_correct = false
            ORDER BY aa.submitted_at DESC NULLS LAST, r.created_at DESC
            LIMIT 12
            """
        ),
        {
            "studentId": str(intervention_case["student_id"]),
            "classId": str(intervention_case["class_id"]),
        },
    )
    mistakes = [dict(row) for row in mistakes_rows.mappings()]
    if not mistakes:
        raise HTTPException(400, "No incorrect assessment responses found for this intervention case")

    concept_counts: dict[str, int] = {}
    for row in mistakes:
        concept_tags = row.get("concept_tags") or []
        if isinstance(concept_tags, str):
            try:
                concept_tags = json.loads(concept_tags)
            except json.JSONDecodeError:
                concept_tags = []
        if not concept_tags:
            concept_tags = [row["content"][:80]]
        for concept in concept_tags:
            key = str(concept).strip()
            if not key:
                continue
            concept_counts[key] = concept_counts.get(key, 0) + 1

    weak_concepts = sorted(concept_counts, key=concept_counts.get, reverse=True)[:5]
    retrieval_query = "\n".join(
        [row["content"] for row in mistakes[:6]]
        + [row.get("explanation") or "" for row in mistakes[:4]]
        + weak_concepts
        + ([note] if note else [])
    )

    chunks = await similarity_search(
        db,
        query_text=retrieval_query,
        class_id=str(intervention_case["class_id"]),
        top_k=10,
        only_published=True,
    )

    recommended_lessons: list[dict[str, Any]] = []
    seen_lessons: set[str] = set()
    for chunk in chunks:
        lesson_id = chunk.get("lessonId")
        metadata = chunk.get("metadataJson") or {}
        if not lesson_id or lesson_id in seen_lessons:
            continue
        seen_lessons.add(lesson_id)
        recommended_lessons.append(
            {
                "lessonId": lesson_id,
                "title": metadata.get("lessonTitle") or "Review lesson",
                "reason": f"Matches weak concepts: {', '.join(weak_concepts[:2])}",
                "chunkId": chunk["id"],
            }
        )
        if len(recommended_lessons) >= 3:
            break

    assessment_rows = await db.execute(
        sa_text(
            """
            SELECT id, title, description, passing_score
            FROM assessments
            WHERE class_id = :classId
              AND is_published = true
            ORDER BY created_at DESC
            LIMIT 3
            """
        ),
        {"classId": str(intervention_case["class_id"])},
    )
    recommended_assessments = [
        {
            "assessmentId": str(row["id"]),
            "title": row["title"],
            "reason": "Recent published assessment available for retry and checking mastery.",
        }
        for row in assessment_rows.mappings()
    ][:2]

    lesson_evidence = "\n".join(
        f"- {item['title']}: {item['reason']}" for item in recommended_lessons
    ) or "- No strong lesson evidence found"
    ai_summary = {
        "summary": "Review the student's most repeated weak concepts using the recommended lessons before assigning another check for understanding.",
        "teacherActions": [
            "Revisit one weak concept at a time using the linked lesson.",
            "Give a short guided retry after the review.",
        ],
        "studentFocus": weak_concepts[:3],
    }
    try:
        prompt = f"""
Subject: {intervention_case["subject_name"]} ({intervention_case["subject_code"]})
Grade level: {intervention_case["grade_level"] or "Unknown"}
Trigger score: {intervention_case["trigger_score"]}
Threshold: {intervention_case["threshold_applied"]}
Weak concepts: {json.dumps(weak_concepts, ensure_ascii=False)}
Teacher note: {note or "[None]"}

Recommended lesson evidence:
{lesson_evidence}
"""
        raw = await ollama_client.generate(
            prompt,
            INTERVENTION_RECOMMENDATION_SYSTEM_PROMPT,
            task="intervention",
            response_format=INTERVENTION_RECOMMENDATION_FORMAT,
        )
        ai_summary = json.loads(raw)
    except Exception:
        pass

    for concept_key, evidence_count in list(concept_counts.items())[:8]:
        await db.execute(
            sa_text(
                """
                INSERT INTO student_concept_mastery (
                  student_id,
                  class_id,
                  concept_key,
                  evidence_count,
                  error_count,
                  mastery_score,
                  last_seen_at,
                  updated_at
                )
                VALUES (
                  :studentId,
                  :classId,
                  :conceptKey,
                  :evidenceCount,
                  :errorCount,
                  :masteryScore,
                  NOW(),
                  NOW()
                )
                ON CONFLICT (student_id, class_id, concept_key)
                DO UPDATE SET
                  evidence_count = GREATEST(student_concept_mastery.evidence_count, EXCLUDED.evidence_count),
                  error_count = GREATEST(student_concept_mastery.error_count, EXCLUDED.error_count),
                  mastery_score = LEAST(student_concept_mastery.mastery_score, EXCLUDED.mastery_score),
                  last_seen_at = NOW(),
                  updated_at = NOW()
                """
            ),
            {
                "studentId": str(intervention_case["student_id"]),
                "classId": str(intervention_case["class_id"]),
                "conceptKey": concept_key,
                "evidenceCount": evidence_count,
                "errorCount": evidence_count,
                "masteryScore": max(0, 100 - (evidence_count * 20)),
            },
        )

    job_row = await db.execute(
        sa_text(
            """
            INSERT INTO ai_generation_jobs (
              job_type,
              class_id,
              teacher_id,
              status,
              source_filters
            )
            VALUES (
              'remedial_plan_generation',
              :classId,
              :teacherId,
              'completed',
              :sourceFilters
            )
            RETURNING id
            """
        ).bindparams(bindparam("sourceFilters", type_=postgresql.JSONB)),
        {
            "classId": str(intervention_case["class_id"]),
            "teacherId": user.id,
            "sourceFilters": {
                "caseId": case_id,
                "weakConcepts": weak_concepts,
            },
        },
    )
    job_id = job_row.scalar_one()

    structured_output = {
        "caseId": case_id,
        "weakConcepts": weak_concepts,
        "recommendedLessons": recommended_lessons,
        "recommendedAssessments": recommended_assessments,
        "aiSummary": ai_summary,
        "note": note,
    }
    output_row = await db.execute(
        sa_text(
            """
            INSERT INTO ai_generation_outputs (
              job_id,
              output_type,
              target_class_id,
              target_teacher_id,
              source_filters,
              structured_output,
              status
            )
            VALUES (
              :jobId,
              'intervention_recommendation',
              :classId,
              :teacherId,
              :sourceFilters,
              :structuredOutput,
              'completed'
            )
            RETURNING id
            """
        ).bindparams(
            bindparam("sourceFilters", type_=postgresql.JSONB),
            bindparam("structuredOutput", type_=postgresql.JSONB),
        ),
        {
            "jobId": job_id,
            "classId": str(intervention_case["class_id"]),
            "teacherId": user.id,
            "sourceFilters": {"caseId": case_id},
            "structuredOutput": structured_output,
        },
    )
    output_id = output_row.scalar_one()
    await db.commit()

    return {
        "jobId": str(job_id),
        "outputId": str(output_id),
        "caseId": case_id,
        "weakConcepts": weak_concepts,
        "recommendedLessons": recommended_lessons,
        "recommendedAssessments": recommended_assessments,
        "aiSummary": ai_summary,
        "suggestedAssignmentPayload": {
            "lessonIds": [item["lessonId"] for item in recommended_lessons],
            "assessmentIds": [item["assessmentId"] for item in recommended_assessments],
            "note": f"AI recommendation based on weak concepts: {', '.join(weak_concepts[:3])}",
        },
    }
