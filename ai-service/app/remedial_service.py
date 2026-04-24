from __future__ import annotations

import json
import re
from html import unescape
from typing import Any

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .indexing_pipeline import get_class_index_status, reindex_class_content
from .retrieval_service import normalize_library_subject_key, similarity_search
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

FAILED_RETRY_ASSESSMENT_SQL = """
            SELECT
              a.id,
              a.title,
              a.description,
              a.passing_score,
              MAX(aa.submitted_at) AS latest_submitted_at,
              a.created_at AS assessment_created_at
            FROM assessments a
            INNER JOIN assessment_attempts aa
              ON aa.assessment_id = a.id
            WHERE a.class_id = :classId
              AND a.is_published = true
              AND aa.student_id = :studentId
              AND aa.is_submitted = true
              AND aa.passed = false
            GROUP BY a.id, a.title, a.description, a.passing_score, a.created_at
            ORDER BY latest_submitted_at DESC NULLS LAST, assessment_created_at DESC
            LIMIT 12
            """

HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")
QUOTED_TERM_PATTERN = re.compile(r"[\"“”']([^\"“”']+)[\"“”']")


def _sanitize_plain_text(value: Any, *, max_length: int | None = None) -> str:
    if value is None:
        return ""

    cleaned = unescape(str(value)).replace("\xa0", " ")
    cleaned = HTML_TAG_PATTERN.sub(" ", cleaned)
    cleaned = WHITESPACE_PATTERN.sub(" ", cleaned).strip(" -:;,.")

    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[: max_length - 1].rstrip(" -:;,.") + "..."
    return cleaned


def _normalize_concept_labels(
    raw_tags: Any,
    *,
    fallback_text: str | None = None,
) -> list[str]:
    tags = raw_tags or []
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except json.JSONDecodeError:
            tags = [tags]

    normalized: list[str] = []
    for tag in tags:
        cleaned = _sanitize_plain_text(tag, max_length=80)
        if cleaned:
            normalized.append(cleaned)

    if normalized:
        return normalized

    fallback = _sanitize_plain_text(fallback_text, max_length=80)
    return [fallback] if fallback else []


def _derive_question_focus_label(question_text: Any) -> str:
    cleaned = _sanitize_plain_text(question_text, max_length=140)
    if not cleaned:
        return ""

    lowered = cleaned.lower().rstrip("?")
    quoted_term = ""
    quoted_match = QUOTED_TERM_PATTERN.search(str(question_text or ""))
    if quoted_match:
        quoted_term = _sanitize_plain_text(quoted_match.group(1), max_length=40)

    if "which operation" in lowered:
        if "both" in lowered:
            return "intersection of sets"
        if " or " in lowered or "either" in lowered:
            return "union of sets"
        return "set operation selection"

    if "venn diagram" in lowered and "rectangular region" in lowered:
        return "universal set in a Venn diagram"

    if "venn diagram" in lowered:
        return "Venn diagrams"

    if "conjunction" in lowered and quoted_term:
        if "set" in lowered:
            return f'conjunction "{quoted_term}" in set problems'
        return f'conjunction "{quoted_term}"'

    for prefix in (
        "what does ",
        "what is ",
        "which of the following is ",
        "which of the following describes ",
        "which statement best describes ",
        "what diagram is used to ",
    ):
        if lowered.startswith(prefix):
            candidate = _sanitize_plain_text(cleaned[len(prefix) :], max_length=80)
            if candidate:
                return candidate[0].upper() + candidate[1:]

    return cleaned


async def _ensure_intervention_index_ready(
    db: AsyncSession,
    class_id: str,
) -> dict[str, Any]:
    index_status = await get_class_index_status(db, class_id)
    if index_status.get("needsReindex") or int(index_status.get("chunksIndexed") or 0) <= 0:
        await reindex_class_content(db, class_id)
        index_status = await get_class_index_status(db, class_id)
    return index_status


async def _load_assessment_concept_map(
    db: AsyncSession,
    assessment_ids: list[str],
) -> dict[str, set[str]]:
    normalized_ids = [assessment_id for assessment_id in assessment_ids if assessment_id]
    if not normalized_ids:
        return {}

    concept_rows = await db.execute(
        sa_text(
            """
            SELECT assessment_id, concept_tags
            FROM assessment_questions
            WHERE assessment_id IN :assessmentIds
            """
        ).bindparams(bindparam("assessmentIds", expanding=True)),
        {
            "assessmentIds": normalized_ids,
        },
    )

    concept_map: dict[str, set[str]] = {}
    for row in concept_rows.mappings():
        assessment_id = str(row.get("assessment_id") or "")
        if not assessment_id:
            continue
        normalized = {
            label.lower()
            for label in _normalize_concept_labels(row.get("concept_tags"))
            if label
        }
        if assessment_id not in concept_map:
            concept_map[assessment_id] = set()
        concept_map[assessment_id].update(normalized)
    return concept_map


async def recommend_intervention_case(
    db: AsyncSession,
    user: RequestUser,
    *,
    case_id: str,
    note: str | None = None,
    existing_job_id: str | None = None,
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
    concept_display: dict[str, str] = {}
    for row in mistakes:
        question_text = _sanitize_plain_text(row.get("content"), max_length=140)
        explanation_text = _sanitize_plain_text(row.get("explanation"), max_length=180)
        fallback_focus = _derive_question_focus_label(question_text or explanation_text)
        concept_tags = _normalize_concept_labels(
            row.get("concept_tags"),
            fallback_text=fallback_focus or question_text or explanation_text,
        )
        for concept in concept_tags:
            label = _sanitize_plain_text(concept, max_length=80)
            key = label.lower()
            if not key:
                continue
            concept_display.setdefault(key, label)
            concept_counts[key] = concept_counts.get(key, 0) + 1

    weak_concepts = [
        concept_display[key]
        for key in sorted(concept_counts, key=concept_counts.get, reverse=True)[:5]
    ]
    retrieval_query = "\n".join(
        [_sanitize_plain_text(row.get("content"), max_length=260) for row in mistakes[:6]]
        + [_sanitize_plain_text(row.get("explanation"), max_length=220) for row in mistakes[:4]]
        + weak_concepts
        + ([_sanitize_plain_text(note, max_length=200)] if note else [])
    )

    index_status = await _ensure_intervention_index_ready(
        db,
        str(intervention_case["class_id"]),
    )
    chunks: list[dict[str, Any]] = []
    if int(index_status.get("chunksIndexed") or 0) > 0:
        chunks = await similarity_search(
            db,
            query_text=retrieval_query,
            class_id=str(intervention_case["class_id"]),
            teacher_id=user.id,
            subject_key=normalize_library_subject_key(
                intervention_case["subject_code"],
                intervention_case["subject_name"],
            ),
            grade_level=str(intervention_case["grade_level"])
            if intervention_case["grade_level"]
            else None,
            top_k=10,
            only_published=True,
            policy_name="remedial",
            concept_hints=weak_concepts,
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
                "reason": chunk.get("selectionReason")
                or f"Matches weak concepts: {', '.join(weak_concepts[:2])}",
                "chunkId": chunk["id"],
                "scoreBreakdown": chunk.get("scoreBreakdown") or {},
                "sourceReference": chunk.get("sourceReference"),
                "confidence": round(
                    float(chunk.get("scoreBreakdown", {}).get("combined", 0.62))
                    if isinstance(chunk.get("scoreBreakdown"), dict)
                    else 0.62,
                    2,
                ),
                "evidence": {
                    "policy": "retrieval.remedial",
                    "selectionReason": chunk.get("selectionReason"),
                    "chunkId": chunk.get("id"),
                    "sourceReference": chunk.get("sourceReference"),
                },
            }
        )
        if len(recommended_lessons) >= 3:
            break

    assessment_rows = await db.execute(
        sa_text(FAILED_RETRY_ASSESSMENT_SQL),
        {
            "classId": str(intervention_case["class_id"]),
            "studentId": str(intervention_case["student_id"]),
        },
    )
    assessment_candidates = [
        {
            "assessmentId": str(row["id"]),
            "title": row["title"],
            "reason": "Recent failed published assessment available for retry and checking mastery.",
            "confidence": 0.45,
            "evidence": {
                "policy": "class.published.fallback",
                "conceptMatches": [],
            },
        }
        for row in assessment_rows.mappings()
    ]
    concept_map = await _load_assessment_concept_map(
        db,
        [
            candidate["assessmentId"]
            for candidate in assessment_candidates
            if candidate["assessmentId"]
        ],
    )

    weak_set = {concept.lower() for concept in weak_concepts}
    for candidate in assessment_candidates:
        concept_tags = concept_map.get(candidate["assessmentId"], set())
        overlap = sorted(
            {
                weak
                for weak in weak_set
                if any(weak in tag or tag in weak for tag in concept_tags)
            }
        )
        if overlap:
            candidate["reason"] = (
                f"Concept-aligned retry targeting: {', '.join(overlap[:2])}."
            )
            candidate["confidence"] = 0.7
            candidate["evidence"] = {
                "policy": "assessment.concept_match",
                "conceptMatches": overlap,
            }

    concept_aligned = [
        candidate for candidate in assessment_candidates if candidate["confidence"] > 0.6
    ]
    fallback_candidates = [
        candidate for candidate in assessment_candidates if candidate["confidence"] <= 0.6
    ]
    recommended_assessments = (concept_aligned + fallback_candidates)[:2]

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
    evidence_packet = {
        "weakConcepts": weak_concepts,
        "recommendedLessons": recommended_lessons,
        "recommendedAssessments": recommended_assessments,
        "mistakeSample": [
            {
                "questionId": str(row["question_id"]),
                "assessmentTitle": row["assessment_title"],
                "question": _sanitize_plain_text(row.get("content"), max_length=220),
                "explanation": _sanitize_plain_text(row.get("explanation"), max_length=220),
            }
            for row in mistakes[:5]
        ],
    }
    try:
        prompt = f"""
Subject: {intervention_case["subject_name"]} ({intervention_case["subject_code"]})
Grade level: {intervention_case["grade_level"] or "Unknown"}
Trigger score: {intervention_case["trigger_score"]}
Threshold: {intervention_case["threshold_applied"]}
Weak concepts: {json.dumps(weak_concepts, ensure_ascii=False)}
Teacher note: {note or "[None]"}
Evidence packet:
{json.dumps(evidence_packet, ensure_ascii=False)}

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

    if existing_job_id:
        await db.execute(
            sa_text(
                """
                UPDATE ai_generation_jobs
                SET
                  status = 'processing',
                  error_message = NULL,
                  source_filters = :sourceFilters,
                  updated_at = NOW()
                WHERE id = :jobId
                """
            ).bindparams(bindparam("sourceFilters", type_=postgresql.JSONB)),
            {
                "jobId": existing_job_id,
                "sourceFilters": {
                    "caseId": case_id,
                    "weakConcepts": weak_concepts,
                },
            },
        )
        job_id = existing_job_id
    else:
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

    suggested_assignment_payload = {
        "lessonIds": [item["lessonId"] for item in recommended_lessons],
        "assessmentIds": [item["assessmentId"] for item in recommended_assessments],
        "lessonAssignments": [
            {
                "lessonId": item["lessonId"],
                "xpAwarded": 20,
                "label": f"AI plan: {item['title']}",
            }
            for item in recommended_lessons
        ],
        "assessmentAssignments": [
            {
                "assessmentId": item["assessmentId"],
                "xpAwarded": 30,
                "label": f"AI plan: {item['title']}",
            }
            for item in recommended_assessments
        ],
        "note": "AI recommendation based on weak concepts: "
        + ", ".join(weak_concepts[:3]),
    }

    structured_output = {
        "caseId": case_id,
        "weakConcepts": weak_concepts,
        "recommendedLessons": recommended_lessons,
        "recommendedAssessments": recommended_assessments,
        "aiSummary": ai_summary,
        "evidencePacket": evidence_packet,
        "suggestedAssignmentPayload": suggested_assignment_payload,
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
    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_jobs
            SET
              status = 'completed',
              error_message = NULL,
              updated_at = NOW()
            WHERE id = :jobId
            """
        ),
        {"jobId": job_id},
    )
    await db.commit()

    return {
        "jobId": str(job_id),
        "outputId": str(output_id),
        "caseId": case_id,
        "weakConcepts": weak_concepts,
        "recommendedLessons": recommended_lessons,
        "recommendedAssessments": recommended_assessments,
        "aiSummary": ai_summary,
        "evidencePacket": evidence_packet,
        "suggestedAssignmentPayload": suggested_assignment_payload,
    }
