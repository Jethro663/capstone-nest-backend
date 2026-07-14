from __future__ import annotations

import json
import re
from typing import Any, Awaitable, Callable

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .job_lifecycle import prepare_fenced_output_commit
from .schemas import GenerateLessonPlanRequest, RequestUser

LESSON_PLAN_SYSTEM_PROMPT = """You generate grounded, teacher-facing daily lesson plans for a school LMS.

Rules:
- Use only the supplied class performance evidence and lesson/module anchor context.
- Stay inside the selected module or lesson scope.
- Return valid JSON only.
- Write for classroom use, not for technical analysts.
- Keep wording clear and practical for a Filipino K-12 teacher preparing a DepEd-style DLP.
"""

LESSON_PLAN_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "header": {"type": "object"},
        "classProfile": {
            "type": "string",
            "enum": ["excelling", "mixed", "struggling"],
        },
        "evidenceSummary": {"type": "string"},
        "objectives": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 6,
        },
        "contentOrSubjectMatter": {"type": "string"},
        "learningResources": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 8,
        },
        "procedures": {"type": "object"},
        "assessment": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 6,
        },
        "remarks": {"type": "string"},
        "reflection": {"type": "string"},
        "assignmentOrHomeExtension": {"type": "string"},
        "differentiation": {"type": "object"},
        "safeguards": {
            "type": "array",
            "items": {"type": "string"},
            "maxItems": 6,
        },
    },
    "required": [
        "header",
        "classProfile",
        "evidenceSummary",
        "objectives",
        "contentOrSubjectMatter",
        "learningResources",
        "procedures",
        "assessment",
        "remarks",
        "reflection",
        "assignmentOrHomeExtension",
        "differentiation",
        "safeguards",
    ],
}


def _clean_text(value: Any, *, max_length: int | None = None) -> str:
    if value is None:
        return ""
    text = str(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if max_length and len(text) > max_length:
        text = text[: max_length - 3].rstrip() + "..."
    return text


def _string_list(value: Any, *, fallback: list[str] | None = None) -> list[str]:
    if not isinstance(value, list):
        return list(fallback or [])
    normalized = [_clean_text(item, max_length=240) for item in value]
    filtered = [item for item in normalized if item]
    return filtered or list(fallback or [])


def _procedure_list(value: Any, fallback_line: str) -> list[str]:
    normalized = _string_list(value)
    return normalized or [fallback_line]


def _normalize_header_map(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    normalized: dict[str, str] = {}
    for key, raw in value.items():
        if not isinstance(key, str):
            continue
        cleaned = _clean_text(raw, max_length=180)
        if cleaned:
            normalized[key] = cleaned
    return normalized


def _extract_block_text(content: Any) -> str:
    if isinstance(content, str):
        return _clean_text(content, max_length=420)
    if isinstance(content, dict):
        for key in ("text", "content", "body", "caption", "question", "prompt"):
            if key in content:
                cleaned = _clean_text(content.get(key), max_length=420)
                if cleaned:
                    return cleaned
        serialized = json.dumps(content, ensure_ascii=False)
        return _clean_text(serialized, max_length=420)
    return _clean_text(content, max_length=420)


def _derive_class_profile(summary: dict[str, Any]) -> str:
    total_students = int(summary.get("totalStudents") or 0)
    at_risk_count = int(summary.get("atRiskCount") or 0)
    average_blended = float(summary.get("averageBlendedScore") or 0)
    risk_rate = (at_risk_count / total_students) if total_students > 0 else 0

    if total_students > 0 and risk_rate >= 0.35:
        return "struggling"
    if total_students > 0 and at_risk_count == 0 and average_blended >= 85:
        return "excelling"
    if average_blended >= 88 and risk_rate <= 0.1:
        return "excelling"
    if average_blended <= 72:
        return "struggling"
    return "mixed"


def _default_procedures(class_profile: str, anchor_title: str) -> dict[str, list[str]]:
    review_line = (
        f"Review the previous discussion connected to {anchor_title} and surface common misconceptions."
    )
    guided_line = (
        "Guide learners through the core example before moving to independent work."
    )
    remediation_line = (
        "Provide scaffolded reteaching for learners needing support and extend practice for fast finishers."
    )
    if class_profile == "excelling":
        guided_line = (
            "Use a brief guided example, then move quickly to student-led explanation and deeper application."
        )
        remediation_line = (
            "Offer challenge tasks that extend the lesson while keeping a short checkpoint for any learner who needs clarification."
        )
    elif class_profile == "struggling":
        guided_line = (
            "Model each step slowly, check understanding after every move, and use concrete examples before abstract tasks."
        )
        remediation_line = (
            "Reteach the prerequisite skill in a small group and give a short supported practice set before enrichment."
        )

    return {
        "review": [review_line],
        "purpose": [f"Set the purpose of the lesson around {anchor_title} and why it matters today."],
        "examples": [f"Present one clear worked example anchored to {anchor_title}."],
        "guidedPractice": [guided_line],
        "mastery": ["Let learners complete a short check-for-understanding aligned with the lesson objective."],
        "application": ["Ask learners to apply the skill in a practical or contextualized task."],
        "generalization": ["Guide the class to summarize the rule, process, or key takeaway in their own words."],
        "evaluation": ["Use a brief formative assessment to confirm whether the objective was met."],
        "remediationOrEnrichment": [remediation_line],
    }


def _default_differentiation(class_profile: str) -> dict[str, list[str]]:
    support = [
        "Provide a step-by-step prompt card and pair struggling learners with guided teacher check-ins.",
    ]
    core = [
        "Keep the main task aligned to the class objective with one short independent practice set.",
    ]
    enrichment = [
        "Give advanced learners a transfer task that uses the same concept in a new context.",
    ]

    if class_profile == "excelling":
        enrichment = [
            "Move advanced learners into a richer application or peer-explanation task after the main check.",
        ]
    elif class_profile == "struggling":
        support = [
            "Use manipulatives or highly concrete examples first, then fade support one step at a time.",
        ]
        core = [
            "Reduce the volume of independent items and increase teacher-guided checkpoints.",
        ]

    return {
        "support": support,
        "core": core,
        "enrichment": enrichment,
    }


def _normalize_lesson_plan_output(
    payload: dict[str, Any],
    *,
    fallback_header: dict[str, str],
    class_profile: str | None = None,
    anchor_title: str = "the selected lesson",
) -> dict[str, Any]:
    header = {
        **fallback_header,
        **_normalize_header_map(payload.get("header")),
    }
    normalized_profile = payload.get("classProfile")
    if normalized_profile not in {"excelling", "mixed", "struggling"}:
        normalized_profile = class_profile or "mixed"

    procedures = payload.get("procedures")
    procedure_map = procedures if isinstance(procedures, dict) else {}
    default_procedures = _default_procedures(normalized_profile, anchor_title)

    differentiation = payload.get("differentiation")
    differentiation_map = differentiation if isinstance(differentiation, dict) else {}
    default_differentiation = _default_differentiation(normalized_profile)

    safeguards = _string_list(payload.get("safeguards"))
    if not safeguards:
        safeguards = ["Keep the plan anchored to the selected class module or lesson and adjust if new evidence appears."]

    normalized = {
        "header": header,
        "classProfile": normalized_profile,
        "evidenceSummary": _clean_text(
            payload.get("evidenceSummary"),
            max_length=600,
        )
        or "Lesson plan tailored from current class performance signals and the selected teaching anchor.",
        "objectives": _string_list(
            payload.get("objectives"),
            fallback=[f"Demonstrate understanding of {anchor_title} through guided and independent work."],
        ),
        "contentOrSubjectMatter": _clean_text(
            payload.get("contentOrSubjectMatter"),
            max_length=500,
        )
        or anchor_title,
        "learningResources": _string_list(
            payload.get("learningResources"),
            fallback=["Class lesson content", "Teacher-prepared examples"],
        ),
        "procedures": {
            "review": _procedure_list(
                procedure_map.get("review"),
                default_procedures["review"][0],
            ),
            "purpose": _procedure_list(
                procedure_map.get("purpose"),
                default_procedures["purpose"][0],
            ),
            "examples": _procedure_list(
                procedure_map.get("examples"),
                default_procedures["examples"][0],
            ),
            "guidedPractice": _procedure_list(
                procedure_map.get("guidedPractice"),
                default_procedures["guidedPractice"][0],
            ),
            "mastery": _procedure_list(
                procedure_map.get("mastery"),
                default_procedures["mastery"][0],
            ),
            "application": _procedure_list(
                procedure_map.get("application"),
                default_procedures["application"][0],
            ),
            "generalization": _procedure_list(
                procedure_map.get("generalization"),
                default_procedures["generalization"][0],
            ),
            "evaluation": _procedure_list(
                procedure_map.get("evaluation"),
                default_procedures["evaluation"][0],
            ),
            "remediationOrEnrichment": _procedure_list(
                procedure_map.get("remediationOrEnrichment"),
                default_procedures["remediationOrEnrichment"][0],
            ),
        },
        "assessment": _string_list(
            payload.get("assessment"),
            fallback=["Use a short formative check aligned to the objective."],
        ),
        "remarks": _clean_text(payload.get("remarks"), max_length=400),
        "reflection": _clean_text(payload.get("reflection"), max_length=400)
        or "Reflect on which learners still need support and what should be adjusted in the next session.",
        "assignmentOrHomeExtension": _clean_text(
            payload.get("assignmentOrHomeExtension"),
            max_length=400,
        )
        or "Give a short follow-up task that reinforces the lesson objective.",
        "differentiation": {
            "support": _string_list(
                differentiation_map.get("support"),
                fallback=default_differentiation["support"],
            ),
            "core": _string_list(
                differentiation_map.get("core"),
                fallback=default_differentiation["core"],
            ),
            "enrichment": _string_list(
                differentiation_map.get("enrichment"),
                fallback=default_differentiation["enrichment"],
            ),
        },
        "safeguards": safeguards,
    }
    return normalized


async def _load_class_context(
    db: AsyncSession,
    *,
    class_id: str,
    user: RequestUser,
) -> dict[str, Any]:
    row = await db.execute(
        sa_text(
            """
            SELECT
              c.id,
              c.teacher_id,
              c.subject_name,
              c.subject_code,
              c.school_year,
              s.name AS section_name,
              s.grade_level,
              u.first_name AS teacher_first_name,
              u.last_name AS teacher_last_name
            FROM classes c
            LEFT JOIN sections s ON s.id = c.section_id
            LEFT JOIN users u ON u.id = c.teacher_id
            WHERE c.id = :classId
            """
        ),
        {"classId": class_id},
    )
    class_info = row.mappings().first()
    if not class_info:
        raise HTTPException(404, "Class not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(class_info["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only generate lesson plans for your own classes")
    return dict(class_info)


async def _load_performance_summary(
    db: AsyncSession,
    *,
    class_id: str,
) -> dict[str, Any]:
    row = await db.execute(
        sa_text(
            """
            SELECT
              COUNT(*)::int AS total_students,
              SUM(CASE WHEN has_data THEN 1 ELSE 0 END)::int AS students_with_data,
              SUM(CASE WHEN is_at_risk THEN 1 ELSE 0 END)::int AS at_risk_count,
              AVG(blended_score)::float AS average_blended_score,
              AVG(assessment_average)::float AS assessment_average,
              AVG(class_record_average)::float AS class_record_average,
              MAX(threshold_applied)::float AS threshold_applied
            FROM performance_snapshots
            WHERE class_id = :classId
            """
        ),
        {"classId": class_id},
    )
    raw = row.mappings().first() or {}
    return {
        "totalStudents": int(raw.get("total_students") or 0),
        "studentsWithData": int(raw.get("students_with_data") or 0),
        "atRiskCount": int(raw.get("at_risk_count") or 0),
        "averageBlendedScore": float(raw.get("average_blended_score") or 0),
        "assessmentAverage": float(raw.get("assessment_average") or 0),
        "classRecordAverage": float(raw.get("class_record_average") or 0),
        "thresholdApplied": float(raw.get("threshold_applied") or 74),
    }


async def _load_weak_concepts(
    db: AsyncSession,
    *,
    class_id: str,
) -> list[str]:
    rows = await db.execute(
        sa_text(
            """
            SELECT concept_key, error_count, evidence_count
            FROM student_concept_mastery
            WHERE class_id = :classId
            ORDER BY error_count DESC, evidence_count DESC, updated_at DESC
            LIMIT 8
            """
        ),
        {"classId": class_id},
    )
    concepts: list[str] = []
    for row in rows.mappings():
        label = _clean_text(row.get("concept_key"), max_length=120)
        if label:
            concepts.append(label)
    return concepts


async def _load_lesson_blocks(
    db: AsyncSession,
    *,
    lesson_ids: list[str],
) -> dict[str, list[str]]:
    normalized_ids = [lesson_id for lesson_id in lesson_ids if lesson_id]
    if not normalized_ids:
        return {}
    rows = await db.execute(
        sa_text(
            """
            SELECT lesson_id, content
            FROM lesson_content_blocks
            WHERE lesson_id IN :lessonIds
            ORDER BY lesson_id, "order"
            """
        ).bindparams(bindparam("lessonIds", expanding=True)),
        {"lessonIds": normalized_ids},
    )
    block_map: dict[str, list[str]] = {}
    for row in rows.mappings():
        lesson_id = str(row.get("lesson_id") or "")
        block_map.setdefault(lesson_id, [])
        extracted = _extract_block_text(row.get("content"))
        if extracted:
            block_map[lesson_id].append(extracted)
    return block_map


async def _load_anchor_context(
    db: AsyncSession,
    *,
    class_id: str,
    body: GenerateLessonPlanRequest,
) -> dict[str, Any]:
    if body.anchor_type == "lesson":
        lesson_row = await db.execute(
            sa_text(
                """
                SELECT id, title, description, is_draft
                FROM lessons
                WHERE id = :anchorId AND class_id = :classId
                """
            ),
            {"anchorId": body.anchor_id, "classId": class_id},
        )
        lesson = lesson_row.mappings().first()
        if not lesson:
            raise HTTPException(404, "Selected lesson was not found in this class")
        block_map = await _load_lesson_blocks(db, lesson_ids=[body.anchor_id])
        return {
            "anchorType": "lesson",
            "anchorId": body.anchor_id,
            "title": lesson["title"],
            "description": _clean_text(lesson.get("description"), max_length=400),
            "moduleTitle": "",
            "lessonIds": [body.anchor_id],
            "lessonSummaries": [
                {
                    "lessonId": body.anchor_id,
                    "title": lesson["title"],
                    "description": _clean_text(lesson.get("description"), max_length=320),
                    "blocks": block_map.get(body.anchor_id, [])[:8],
                }
            ],
        }

    if body.anchor_type != "module":
        raise HTTPException(400, "anchorType must be either module or lesson")

    module_row = await db.execute(
        sa_text(
            """
            SELECT id, title, description
            FROM class_modules
            WHERE id = :anchorId AND class_id = :classId
            """
        ),
        {"anchorId": body.anchor_id, "classId": class_id},
    )
    module = module_row.mappings().first()
    if not module:
        raise HTTPException(404, "Selected module was not found in this class")

    lessons_row = await db.execute(
        sa_text(
            """
            SELECT l.id, l.title, l.description
            FROM module_sections ms
            INNER JOIN module_items mi ON mi.module_section_id = ms.id
            INNER JOIN lessons l ON l.id = mi.lesson_id
            WHERE ms.module_id = :moduleId
              AND mi.item_type = 'lesson'
            ORDER BY ms."order", mi."order", l."order"
            LIMIT 6
            """
        ),
        {"moduleId": body.anchor_id},
    )
    lesson_rows = [dict(row) for row in lessons_row.mappings()]
    lesson_ids = [str(row["id"]) for row in lesson_rows]
    block_map = await _load_lesson_blocks(db, lesson_ids=lesson_ids)

    return {
        "anchorType": "module",
        "anchorId": body.anchor_id,
        "title": module["title"],
        "description": _clean_text(module.get("description"), max_length=400),
        "moduleTitle": module["title"],
        "lessonIds": lesson_ids,
        "lessonSummaries": [
            {
                "lessonId": str(row["id"]),
                "title": row["title"],
                "description": _clean_text(row.get("description"), max_length=320),
                "blocks": block_map.get(str(row["id"]), [])[:6],
            }
            for row in lesson_rows
        ],
    }


def _build_fallback_header(
    *,
    class_info: dict[str, Any],
    body: GenerateLessonPlanRequest,
    anchor_context: dict[str, Any],
) -> dict[str, str]:
    teacher_name = " ".join(
        part
        for part in [
            _clean_text(class_info.get("teacher_first_name")),
            _clean_text(class_info.get("teacher_last_name")),
        ]
        if part
    ).strip()
    lesson_title = anchor_context["title"]
    return {
        "instructionalFormat": body.header.instructional_format
        if body.header and body.header.instructional_format
        else "Detailed Lesson Plan",
        "schoolName": body.header.school_name
        if body.header and body.header.school_name
        else "Nexora LMS",
        "quarter": body.header.quarter if body.header and body.header.quarter else "",
        "date": body.header.date if body.header and body.header.date else "",
        "startTime": body.header.start_time if body.header and body.header.start_time else "",
        "endTime": body.header.end_time if body.header and body.header.end_time else "",
        "schoolYear": _clean_text(class_info.get("school_year")),
        "sectionName": _clean_text(class_info.get("section_name")),
        "gradeLevel": _clean_text(class_info.get("grade_level")),
        "learningArea": _clean_text(class_info.get("subject_name")),
        "subjectCode": _clean_text(class_info.get("subject_code")),
        "teacherName": teacher_name,
        "moduleTitle": _clean_text(anchor_context.get("moduleTitle")),
        "lessonTitle": _clean_text(lesson_title),
    }


def _fallback_lesson_plan(
    *,
    class_profile: str,
    weak_concepts: list[str],
    anchor_context: dict[str, Any],
    header: dict[str, str],
    performance_summary: dict[str, Any],
    teacher_note: str | None,
) -> dict[str, Any]:
    anchor_title = _clean_text(anchor_context.get("title"), max_length=200)
    leading_concepts = ", ".join(weak_concepts[:3]) if weak_concepts else anchor_title
    resource_titles = [anchor_title]
    resource_titles.extend(
        summary["title"] for summary in anchor_context.get("lessonSummaries", [])[:3]
    )
    resources = [title for title in resource_titles if title]
    if teacher_note:
        resources.append(f"Teacher note: {_clean_text(teacher_note, max_length=180)}")

    summary = (
        f"This {class_profile} class lesson plan is grounded on {anchor_title}"
        f" and current performance signals around {leading_concepts}."
    )
    if class_profile == "excelling":
        summary = (
            f"This excelling class lesson plan extends {anchor_title} through deeper application while preserving one quick mastery check."
        )
    elif class_profile == "struggling":
        summary = (
            f"This struggling class lesson plan narrows the scope of {anchor_title} and prioritizes reteaching of {leading_concepts}."
        )

    return _normalize_lesson_plan_output(
        {
            "header": header,
            "classProfile": class_profile,
            "evidenceSummary": summary,
            "objectives": [
                f"Explain the core idea behind {anchor_title}.",
                f"Apply {anchor_title} in a short guided task.",
                "Show mastery through a formative check.",
            ],
            "contentOrSubjectMatter": anchor_title,
            "learningResources": resources or ["Class lesson content"],
            "assessment": [
                "Exit ticket with 3 short items aligned to the lesson objective.",
            ],
            "remarks": "",
            "reflection": (
                "Note which learners still need guided support and which learners are ready for the next progression."
            ),
            "assignmentOrHomeExtension": (
                "Complete one short follow-up practice connected to the day's objective."
            ),
            "differentiation": _default_differentiation(class_profile),
            "safeguards": [
                "Adjust the pace if live classroom responses show weaker prerequisite understanding than expected.",
            ],
        },
        fallback_header=header,
        class_profile=class_profile,
        anchor_title=anchor_title,
    )


def _render_anchor_evidence(anchor_context: dict[str, Any]) -> str:
    parts = [
        f"Anchor type: {anchor_context['anchorType']}",
        f"Anchor title: {anchor_context['title']}",
    ]
    if anchor_context.get("description"):
        parts.append(f"Anchor description: {anchor_context['description']}")
    for lesson_summary in anchor_context.get("lessonSummaries", [])[:4]:
        parts.append(
            "\n".join(
                [
                    f"Lesson: {lesson_summary['title']}",
                    (
                        f"Description: {lesson_summary['description']}"
                        if lesson_summary.get("description")
                        else ""
                    ),
                    (
                        "Evidence blocks:\n- " + "\n- ".join(lesson_summary.get("blocks", [])[:4])
                        if lesson_summary.get("blocks")
                        else ""
                    ),
                ]
            ).strip()
        )
    return "\n\n".join(part for part in parts if part)


async def generate_class_lesson_plan(
    db: AsyncSession,
    user: RequestUser,
    body: GenerateLessonPlanRequest,
    *,
    existing_job_id: str | None = None,
    execution_lease_id: str | None = None,
    progress_callback: Callable[[str, int], Awaitable[None]] | None = None,
) -> dict[str, Any]:
    class_info = await _load_class_context(db, class_id=body.class_id, user=user)
    if progress_callback:
        await progress_callback("Reviewing class performance", 28)
    performance_summary = await _load_performance_summary(db, class_id=body.class_id)
    weak_concepts = await _load_weak_concepts(db, class_id=body.class_id)
    class_profile = _derive_class_profile(performance_summary)

    if progress_callback:
        await progress_callback("Loading selected lesson source", 44)
    anchor_context = await _load_anchor_context(
        db,
        class_id=body.class_id,
        body=body,
    )
    header = _build_fallback_header(
        class_info=class_info,
        body=body,
        anchor_context=anchor_context,
    )

    if progress_callback:
        await progress_callback("Drafting lesson plan", 72)

    prompt = f"""
Create one DepEd-style Detailed Lesson Plan for the next class meeting.

Class summary:
{json.dumps(performance_summary, ensure_ascii=False)}

Derived class profile:
{class_profile}

Weak concepts:
{json.dumps(weak_concepts[:6], ensure_ascii=False)}

Teacher note:
{_clean_text(body.teacher_note, max_length=400) or "[None]"}

Header defaults:
{json.dumps(header, ensure_ascii=False)}

Selected teaching anchor:
{_render_anchor_evidence(anchor_context)}

Return only JSON. Keep procedures practical and classroom-ready.
"""

    structured_output: dict[str, Any]
    try:
        raw = await ollama_client.generate(
            prompt,
            LESSON_PLAN_SYSTEM_PROMPT,
            task="quiz_generation",
            response_format=LESSON_PLAN_FORMAT,
        )
        parsed = json.loads(raw)
        structured_output = _normalize_lesson_plan_output(
            parsed if isinstance(parsed, dict) else {},
            fallback_header=header,
            class_profile=class_profile,
            anchor_title=_clean_text(anchor_context.get("title"), max_length=180),
        )
    except Exception:
        structured_output = _fallback_lesson_plan(
            class_profile=class_profile,
            weak_concepts=weak_concepts,
            anchor_context=anchor_context,
            header=header,
            performance_summary=performance_summary,
            teacher_note=body.teacher_note,
        )

    structured_output["metadata"] = {
        "classId": body.class_id,
        "anchorType": body.anchor_type,
        "anchorId": body.anchor_id,
        "weakConcepts": weak_concepts[:6],
        "performanceSummary": performance_summary,
    }

    if existing_job_id:
        await prepare_fenced_output_commit(
            db,
            job_id=existing_job_id,
            execution_lease_id=execution_lease_id,
            progress_callback=progress_callback,
            status_message="Saving lesson plan",
            progress_percent=88,
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
                  'class_lesson_plan_generation',
                  :classId,
                  :teacherId,
                  'completed',
                  :sourceFilters
                )
                RETURNING id
                """
            ).bindparams(bindparam("sourceFilters", type_=postgresql.JSONB)),
            {
                "classId": body.class_id,
                "teacherId": user.id,
                "sourceFilters": {
                    "anchorType": body.anchor_type,
                    "anchorId": body.anchor_id,
                    "teacherNote": body.teacher_note,
                    "header": body.header.model_dump(by_alias=True) if body.header else {},
                },
            },
        )
        job_id = job_row.scalar_one()

    if progress_callback and not existing_job_id:
        await progress_callback("Saving lesson plan", 88)

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
              'class_lesson_plan',
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
            "classId": body.class_id,
            "teacherId": user.id,
            "sourceFilters": {
                "anchorType": body.anchor_type,
                "anchorId": body.anchor_id,
            },
            "structuredOutput": structured_output,
        },
    )
    output_id = output_row.scalar_one()

    if not existing_job_id:
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
        "classProfile": structured_output["classProfile"],
        "header": structured_output["header"],
        "message": "AI lesson plan draft created for teacher review.",
    }


async def save_lesson_plan_draft(
    db: AsyncSession,
    *,
    job_id: str,
    user: RequestUser,
    structured_output: dict[str, Any],
) -> dict[str, Any]:
    job_row = await db.execute(
        sa_text(
            """
            SELECT id, teacher_id, class_id
            FROM ai_generation_jobs
            WHERE id = :jobId
            """
        ),
        {"jobId": job_id},
    )
    job = job_row.mappings().first()
    if not job:
        raise HTTPException(404, "Lesson plan job not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(job["teacher_id"]) != user.id:
        raise HTTPException(403, "You do not have access to this lesson plan job")

    output_row = await db.execute(
        sa_text(
            """
            SELECT id, structured_output
            FROM ai_generation_outputs
            WHERE job_id = :jobId
              AND output_type = 'class_lesson_plan'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"jobId": job_id},
    )
    output = output_row.mappings().first()
    if not output:
        raise HTTPException(409, "Lesson plan output is not ready yet")

    existing_output = output.get("structured_output") or {}
    existing_map = existing_output if isinstance(existing_output, dict) else {}
    existing_header = _normalize_header_map(existing_map.get("header"))
    anchor_title = _clean_text(
        existing_header.get("lessonTitle") or existing_header.get("moduleTitle"),
        max_length=180,
    ) or "the selected lesson"

    normalized = _normalize_lesson_plan_output(
        structured_output or {},
        fallback_header=existing_header,
        class_profile=existing_map.get("classProfile")
        if isinstance(existing_map.get("classProfile"), str)
        else None,
        anchor_title=anchor_title,
    )
    normalized["metadata"] = existing_map.get("metadata") if isinstance(existing_map.get("metadata"), dict) else {}

    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_outputs
            SET
              structured_output = :structuredOutput,
              updated_at = NOW()
            WHERE id = :outputId
            """
        ).bindparams(bindparam("structuredOutput", type_=postgresql.JSONB)),
        {
            "outputId": output["id"],
            "structuredOutput": normalized,
        },
    )
    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_jobs
            SET
              updated_at = NOW()
            WHERE id = :jobId
            """
        ),
        {"jobId": job_id},
    )
    await db.commit()

    return {
        "jobId": str(job_id),
        "outputId": str(output["id"]),
        "jobType": "class_lesson_plan_generation",
        "status": "completed",
        "statusMessage": "Draft saved",
        "structuredOutput": normalized,
    }
