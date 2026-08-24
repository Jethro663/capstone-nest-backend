from __future__ import annotations

import json
import logging
import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .retrieval_service import similarity_search
from .schemas import RequestUser, TutorRecommendationDto
from .student_tutor_service import bootstrap_student_tutor

logger = logging.getLogger(__name__)

OBJECTIVE_TYPES = ("multiple_choice", "multiple_select", "true_false", "dropdown")
GUARDRAIL_PATTERNS = (
    r"ignore (all|the) (rules|instructions)",
    r"bypass",
    r"jailbreak",
    r"give (me )?(the )?exact answer",
    r"answer key",
    r"hack",
    r"admin password",
    r"system prompt",
)
HELPER_PROMPT_PATTERNS = (
    r"\bhelp me\b",
    r"\bcan you help\b",
    r"\bsummar(y|ize)\b",
    r"\bstudy plan\b",
    r"\bwhat should i study next\b",
    r"\breview\b",
    r"\bvocab(ulary)?\b",
    r"\bsimpl(er|ify)?\b",
    r"\bexplain\b",
    r"\bclarify\b",
    r"\banalog(y|ies)\b",
    r"\bgive me a question\b",
    r"\bquiz me\b",
    r"\bunclear\b",
    r"\bkey ideas?\b",
    r"\bmain ideas?\b",
    r"\bwhat should i review\b",
    r"\bsuggest other lessons?\b",
)
STUDY_COACH_SECTION_PATTERN = re.compile(
    r"(?im)^#{1,3}\s*(main idea|break it down|simple analogy|try this now|watch out)\b"
)


def _clean_coach_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _split_coach_sentences(value: str | None) -> list[str]:
    text = (value or "").strip()
    if not text:
        return []
    normalized = text.replace("\r", "\n")
    chunks = [
        part.strip(" -\t")
        for part in re.split(r"(?:\n+|(?<=[.!?])\s+)", normalized)
        if part.strip(" -\t")
    ]
    unique: list[str] = []
    seen: set[str] = set()
    for chunk in chunks:
        lowered = chunk.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        unique.append(chunk)
    return unique


def _coach_heading(title: str, body: str) -> str:
    return f"## {title}\n{body.strip()}"


def _coach_bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items if item.strip())


def _build_study_coach_reply(
    *,
    main_idea: str,
    breakdown: list[str] | None = None,
    try_now: list[str] | None = None,
    analogy: str | None = None,
    watch_out: list[str] | None = None,
) -> str:
    sections = [_coach_heading("Main idea", _clean_coach_text(main_idea))]

    breakdown_items = [_clean_coach_text(item) for item in (breakdown or []) if item.strip()]
    if breakdown_items:
        sections.append(_coach_heading("Break it down", _coach_bullets(breakdown_items[:3])))

    analogy_text = _clean_coach_text(analogy)
    if analogy_text:
        sections.append(_coach_heading("Simple analogy", analogy_text))

    try_now_items = [_clean_coach_text(item) for item in (try_now or []) if item.strip()]
    if try_now_items:
        sections.append(_coach_heading("Try this now", _coach_bullets(try_now_items[:3])))

    watch_out_items = [_clean_coach_text(item) for item in (watch_out or []) if item.strip()]
    if watch_out_items:
        sections.append(_coach_heading("Watch out", _coach_bullets(watch_out_items[:3])))

    return "\n\n".join(section for section in sections if section.strip())


def _default_try_now_steps(
    *,
    message: str,
    quick_action: str | None,
    lesson_title: str | None,
) -> list[str]:
    lesson_label = (lesson_title or "this lesson").strip() or "this lesson"
    request_text = f"{quick_action or ''} {message}".lower()
    if "quiz" in request_text or "question" in request_text:
        return [
            f"Answer one practice question from {lesson_label} without looking at your notes first.",
            "Check which clue from the lesson helped you most.",
        ]
    if "study" in request_text or "review" in request_text:
        return [
            f"List the top two ideas from {lesson_label} that still feel shaky.",
            "Spend five minutes rewriting each one in your own words.",
        ]
    return [
        f"Say the rule from {lesson_label} in your own words.",
        "Test it on one quick example before moving on.",
    ]


def _format_generated_study_reply(
    *,
    reply: str,
    message: str,
    quick_action: str | None,
    lesson_title: str | None,
) -> str:
    clean_reply = (reply or "").strip()
    if not clean_reply:
        clean_reply = (
            "I found relevant class sources, but I need you to narrow the question to one concept "
            "so I can explain it clearly."
        )
    if STUDY_COACH_SECTION_PATTERN.search(clean_reply):
        return clean_reply

    sentences = _split_coach_sentences(clean_reply)
    main_idea = sentences[0] if sentences else clean_reply
    breakdown = sentences[1:3] or [main_idea]
    return _build_study_coach_reply(
        main_idea=main_idea,
        breakdown=breakdown,
        try_now=_default_try_now_steps(
            message=message,
            quick_action=quick_action,
            lesson_title=lesson_title,
        ),
    )


async def bootstrap_ja_practice(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str | None = None,
) -> dict[str, Any]:
    data = await bootstrap_student_tutor(db, user, class_id=class_id)
    if not data.get("classes"):
        return {
            **data,
            "hasEvidence": False,
            "evidenceSummary": {
                "completedLessons": 0,
                "attempts": 0,
                "recommendations": 0,
            },
        }
    return {
        **data,
        "hasEvidence": bool(data.get("recentLessons") or data.get("recentAttempts")),
        "evidenceSummary": {
            "completedLessons": len(data.get("recentLessons") or []),
            "attempts": len(data.get("recentAttempts") or []),
            "recommendations": len(data.get("recommendations") or []),
        },
    }


async def _assert_student_class_access(
    db: AsyncSession,
    user_id: str,
    class_id: str,
) -> None:
    row = await db.execute(
        sa_text(
            """
            SELECT 1
            FROM enrollments
            WHERE student_id = :userId
              AND class_id = :classId
              AND status = 'enrolled'
            """
        ),
        {"userId": user_id, "classId": class_id},
    )
    if row.first() is None:
        raise HTTPException(403, "You do not have access to this class")


def _normalize_options(options_json: Any) -> list[dict[str, Any]]:
    options = options_json or []
    if isinstance(options, str):
        try:
            options = json.loads(options)
        except json.JSONDecodeError:
            options = []
    if not isinstance(options, list):
        return []
    normalized: list[dict[str, Any]] = []
    for row in options:
        if not isinstance(row, dict):
            continue
        option_id = row.get("id")
        text = row.get("text")
        if not option_id or text is None:
            continue
        normalized.append(
            {
                "id": str(option_id),
                "text": str(text),
                "order": int(row.get("order") or 0),
                "isCorrect": bool(row.get("isCorrect")),
            }
        )
    normalized.sort(key=lambda item: item["order"])
    return normalized


def _build_answer_key(
    *,
    question_type: str,
    options: list[dict[str, Any]],
) -> dict[str, Any] | None:
    correct_ids = [item["id"] for item in options if item["isCorrect"]]
    if question_type in {"multiple_choice", "true_false", "dropdown"}:
        if len(correct_ids) != 1:
            return None
        answer_key: dict[str, Any] = {"correctOptionId": correct_ids[0]}
        if question_type == "true_false":
            option_text = next(
                (
                    str(item["text"]).strip().lower()
                    for item in options
                    if item["id"] == correct_ids[0]
                ),
                "",
            )
            if option_text in {"true", "false"}:
                answer_key["correctValue"] = option_text == "true"
        return answer_key

    if question_type == "multiple_select":
        if len(correct_ids) == 0:
            return None
        return {"correctOptionIds": correct_ids}

    return None


async def _fetch_recent_wrong_question_ids(
    db: AsyncSession,
    *,
    student_id: str,
    class_id: str,
    allowed_assessment_ids: list[str],
) -> list[str]:
    if not allowed_assessment_ids:
        return []
    rows = await db.execute(
        sa_text(
            """
            SELECT DISTINCT r.question_id
            FROM assessment_responses r
            INNER JOIN assessment_attempts aa ON aa.id = r.attempt_id
            INNER JOIN assessments a ON a.id = aa.assessment_id
            WHERE aa.student_id = :studentId
              AND aa.is_submitted = true
              AND a.class_id = :classId
              AND a.id IN :assessmentIds
              AND COALESCE(r.is_correct, false) = false
            ORDER BY r.question_id
            LIMIT 40
            """
        ).bindparams(bindparam("assessmentIds", expanding=True)),
        {
            "studentId": student_id,
            "classId": class_id,
            "assessmentIds": allowed_assessment_ids,
        },
    )
    return [str(row["question_id"]) for row in rows.mappings()]


async def _fetch_candidate_questions(
    db: AsyncSession,
    *,
    class_id: str,
    allowed_assessment_ids: list[str],
) -> list[dict[str, Any]]:
    if not allowed_assessment_ids:
        return []
    rows = await db.execute(
        sa_text(
            """
            SELECT
              q.id AS question_id,
              q.content AS question_content,
              q.type AS question_type,
              q.explanation AS question_explanation,
              q.concept_tags AS concept_tags,
              a.id AS assessment_id,
              a.title AS assessment_title,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', o.id,
                    'text', o.text,
                    'isCorrect', o.is_correct,
                    'order', o."order"
                  )
                  ORDER BY o."order"
                ) FILTER (WHERE o.id IS NOT NULL),
                '[]'::json
              ) AS options_json
            FROM assessment_questions q
            INNER JOIN assessments a ON a.id = q.assessment_id
            LEFT JOIN assessment_question_options o ON o.question_id = q.id
            WHERE a.class_id = :classId
              AND a.is_published = true
              AND a.id IN :assessmentIds
              AND q.type IN ('multiple_choice', 'multiple_select', 'true_false', 'dropdown')
            GROUP BY
              q.id,
              q.content,
              q.type,
              q.explanation,
              q.concept_tags,
              a.id,
              a.title
            ORDER BY a.created_at DESC, q."order" ASC
            """
        ).bindparams(bindparam("assessmentIds", expanding=True)),
        {
            "classId": class_id,
            "assessmentIds": allowed_assessment_ids,
        },
    )
    return [dict(row) for row in rows.mappings()]


async def _retrieve_priority_question_ids(
    db: AsyncSession,
    *,
    class_id: str,
    recommendation: TutorRecommendationDto | None,
    allowed_assessment_ids: list[str],
) -> list[str]:
    if not recommendation:
        return []
    focus_text = recommendation.focus_text.strip()
    if not focus_text:
        return []
    chunks = await similarity_search(
        db,
        query_text=focus_text,
        class_id=class_id,
        top_k=20,
        assessment_ids=allowed_assessment_ids or None,
        only_published=True,
        policy_name="student_tutor",
        reference_assessment_id=recommendation.assessment_id,
        reference_question_id=recommendation.question_id,
    )
    ordered_ids: list[str] = []
    seen: set[str] = set()
    for chunk in chunks:
        qid = chunk.get("questionId")
        if not qid or qid in seen:
            continue
        seen.add(qid)
        ordered_ids.append(str(qid))
    return ordered_ids


async def generate_ja_practice_session_packet(
    db: AsyncSession,
    *,
    user: RequestUser,
    class_id: str,
    question_count: int,
    recommendation: TutorRecommendationDto | None,
    allowed_lesson_ids: list[str] | None,
    allowed_assessment_ids: list[str] | None,
) -> dict[str, Any]:
    await _assert_student_class_access(db, user.id, class_id)

    lesson_ids = [entry for entry in (allowed_lesson_ids or []) if entry]
    assessment_ids = [entry for entry in (allowed_assessment_ids or []) if entry]
    if not lesson_ids and not assessment_ids:
        raise HTTPException(
            400,
            "No visible class evidence is available for JA practice generation",
        )

    class_row = await db.execute(
        sa_text(
            """
            SELECT c.subject_name, c.subject_code, s.name AS section_name
            FROM classes c
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE c.id = :classId
            """
        ),
        {"classId": class_id},
    )
    class_info = class_row.mappings().first()
    if not class_info:
        raise HTTPException(404, "Class not found")

    wrong_question_ids = await _fetch_recent_wrong_question_ids(
        db,
        student_id=user.id,
        class_id=class_id,
        allowed_assessment_ids=assessment_ids,
    )
    retrieval_priority_ids = await _retrieve_priority_question_ids(
        db,
        class_id=class_id,
        recommendation=recommendation,
        allowed_assessment_ids=assessment_ids,
    )
    candidate_rows = await _fetch_candidate_questions(
        db,
        class_id=class_id,
        allowed_assessment_ids=assessment_ids,
    )

    question_map: dict[str, dict[str, Any]] = {
        str(row["question_id"]): row for row in candidate_rows
    }
    ordered_ids: list[str] = []
    seen_ids: set[str] = set()

    def push_ids(ids: list[str]) -> None:
        for item_id in ids:
            if item_id in seen_ids or item_id not in question_map:
                continue
            seen_ids.add(item_id)
            ordered_ids.append(item_id)

    if recommendation and recommendation.question_id:
        push_ids([recommendation.question_id])
    push_ids(retrieval_priority_ids)
    push_ids(wrong_question_ids)
    push_ids(list(question_map.keys()))

    selected_items: list[dict[str, Any]] = []
    selected_question_ids: set[str] = set()
    for question_id in ordered_ids:
        row = question_map.get(question_id)
        if not row or question_id in selected_question_ids:
            continue
        qtype = str(row["question_type"])
        options = _normalize_options(row.get("options_json"))
        answer_key = _build_answer_key(question_type=qtype, options=options)
        if answer_key is None:
            continue

        citation = {
            "label": f"{row['assessment_title']}",
            "assessmentId": str(row["assessment_id"]),
            "questionId": question_id,
        }
        selected_items.append(
            {
                "id": f"q-{len(selected_items) + 1}",
                "itemType": qtype,
                "prompt": str(row["question_content"]),
                "options": [
                    {
                        "id": option["id"],
                        "text": option["text"],
                        "order": option["order"],
                    }
                    for option in options
                ],
                "answerKey": answer_key,
                "hint": "Use the strongest clue from your class material before answering.",
                "explanation": str(row.get("question_explanation") or "").strip() or None,
                "citations": [citation],
                "validation": {
                    "deterministic": True,
                    "sourceType": "assessment_question",
                    "assessmentId": str(row["assessment_id"]),
                    "questionId": question_id,
                },
            }
        )
        selected_question_ids.add(question_id)
        if len(selected_items) >= question_count:
            break

    if len(selected_items) < question_count:
        raise HTTPException(
            400,
            "Insufficient objective evidence to generate a complete JA practice session",
        )

    class_label = f"{class_info['subject_name']} ({class_info['subject_code']})"
    if class_info["section_name"]:
        class_label = f"{class_label} - {class_info['section_name']}"

    return {
        "classLabel": class_label,
        "groundingStatus": "grounded",
        "sourceSnapshot": {
            "allowedLessonCount": len(lesson_ids),
            "allowedAssessmentCount": len(assessment_ids),
            "candidateQuestionCount": len(candidate_rows),
            "selectedQuestionCount": len(selected_items),
            "recentWrongQuestionCount": len(wrong_question_ids),
        },
        "items": selected_items[:question_count],
    }


async def bootstrap_ja_ask(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str | None = None,
) -> dict[str, Any]:
    return await bootstrap_ja_practice(db, user, class_id=class_id)


async def bootstrap_ja_review(
    db: AsyncSession,
    user: RequestUser,
    *,
    class_id: str | None = None,
) -> dict[str, Any]:
    return await bootstrap_ja_practice(db, user, class_id=class_id)


def _is_guardrail_prompt(text: str) -> bool:
    normalized = (text or "").strip().lower()
    if not normalized:
        return False
    return any(re.search(pattern, normalized) for pattern in GUARDRAIL_PATTERNS)


def _is_helper_prompt(text: str) -> bool:
    normalized = (text or "").strip().lower()
    if not normalized:
        return False
    return any(re.search(pattern, normalized) for pattern in HELPER_PROMPT_PATTERNS)


def _is_low_confidence_context_match(chunks: list[dict[str, Any]]) -> bool:
    if not chunks:
        return True
    top_chunk = chunks[0]
    distance = float(top_chunk.get("distance") or 99.0)
    score_breakdown = top_chunk.get("scoreBreakdown") or {}
    lexical_score = float(score_breakdown.get("lexical") or 0.0)
    final_score = float(score_breakdown.get("final") or 0.0)
    return distance > 1.2 and lexical_score < 0.5 and final_score < 3.2


def _format_citation(chunk: dict[str, Any]) -> dict[str, Any]:
    metadata = chunk.get("metadataJson") or {}
    label = (
        metadata.get("lessonTitle")
        or metadata.get("assessmentTitle")
        or metadata.get("title")
        or chunk.get("sourceReference")
        or "Class material"
    )
    return {
        "label": str(label),
        "lessonId": chunk.get("lessonId"),
        "assessmentId": chunk.get("assessmentId"),
        "questionId": chunk.get("questionId"),
        "sourceType": chunk.get("sourceType"),
        "snippet": _clean_coach_text(str(chunk.get("chunkText") or ""))[:220],
    }


def _stringify_content(content: Any) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        preferred_keys = ["text", "question", "prompt", "body", "caption", "title"]
        ordered_values = [str(content[key]).strip() for key in preferred_keys if content.get(key)]
        if ordered_values:
            return "\n".join(ordered_values)
        return json.dumps(content, ensure_ascii=True)
    if isinstance(content, list):
        return "\n".join(_stringify_content(item) for item in content if item)
    return str(content)


def _chunk_fallback_text(text: str, *, max_chars: int = 1800) -> list[str]:
    normalized = re.sub(r"\s+", " ", (text or "").strip())
    if not normalized:
        return []
    return [
        normalized[start : start + max_chars].strip()
        for start in range(0, min(len(normalized), max_chars * 4), max_chars)
        if normalized[start : start + max_chars].strip()
    ]


async def _fetch_selected_lesson_fallback_chunks(
    db: AsyncSession,
    *,
    class_id: str,
    lesson_id: str,
) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              l.id AS lesson_id,
              l.title AS lesson_title,
              b.id AS block_id,
              b.type AS block_type,
              b.content AS block_content,
              b.metadata AS block_metadata
            FROM lessons l
            LEFT JOIN lesson_content_blocks b ON b.lesson_id = l.id
            WHERE l.id = :lessonId
              AND l.class_id = :classId
            ORDER BY b."order" ASC, b.created_at ASC
            """
        ),
        {
            "lessonId": lesson_id,
            "classId": class_id,
        },
    )
    mappings = [dict(row) for row in rows.mappings()]
    if not mappings:
        return []

    lesson_title = str(mappings[0].get("lesson_title") or "").strip() or "Selected lesson"
    lesson_parts: list[str] = []
    for row in mappings:
        block_text = _stringify_content(row.get("block_content")).strip()
        if block_text:
            lesson_parts.append(block_text)
            continue
        metadata_text = _stringify_content(row.get("block_metadata")).strip()
        if metadata_text and metadata_text != "{}":
            lesson_parts.append(metadata_text)

    if not lesson_parts:
        return []

    fallback_chunks: list[dict[str, Any]] = []
    for idx, chunk_text in enumerate(_chunk_fallback_text("\n\n".join(lesson_parts))):
        fallback_chunks.append(
            {
                "chunkText": chunk_text,
                "lessonId": lesson_id,
                "assessmentId": None,
                "questionId": None,
                "sourceType": "lesson_block",
                "metadataJson": {
                    "lessonTitle": lesson_title,
                    "sourceReference": f"lesson:{lesson_id}:fallback:{idx}",
                },
                "distance": 0.05,
                "scoreBreakdown": {"lexical": 1.0, "final": 5.0},
            }
        )
    return fallback_chunks


def _question_focus_text(question_content: Any, question_type: str) -> str:
    text = re.sub(r"<[^>]+>", " ", str(question_content or ""))
    text = re.sub(r"\s+", " ", text).strip()
    lower_text = text.lower()
    if "∩" in text or "&cap;" in lower_text or "intersection" in lower_text:
        return "the overlapping elements in the set statement"
    if "∪" in text or "&cup;" in lower_text or "union" in lower_text:
        return "every unique element in the set statement"
    if question_type == "multiple_select":
        return "each option independently before locking multiple answers"
    if question_type == "true_false":
        return "the exact claim before choosing true or false"
    return "the key clue in the question statement"


async def generate_ja_ask_response(
    db: AsyncSession,
    *,
    user: RequestUser,
    class_id: str,
    thread_id: str,
    message: str,
    quick_action: str | None,
    lesson_id: str | None,
    lesson_title: str | None,
    history: list[dict[str, str]] | None,
    allowed_lesson_ids: list[str] | None,
    allowed_assessment_ids: list[str] | None,
) -> dict[str, Any]:
    await _assert_student_class_access(db, user.id, class_id)

    if _is_guardrail_prompt(message):
        return {
            "blocked": True,
            "reason": "policy_guardrail",
            "reply": _build_study_coach_reply(
                main_idea="I cannot give direct answer keys or help bypass JA safety rules.",
                breakdown=[
                    "I can still explain the concept, give a guided hint, or help you review the lesson safely."
                ],
                try_now=[
                    "Ask for a concept explanation from the selected lesson.",
                    "Request one guided practice question instead of the final answer.",
                ],
                watch_out=[
                    "JA stays grounded to visible class material and avoids cheating help."
                ],
            ),
            "citations": [],
            "insufficientEvidence": False,
        }

    lesson_ids = [entry for entry in (allowed_lesson_ids or []) if entry]
    assessment_ids = [entry for entry in (allowed_assessment_ids or []) if entry]
    if not lesson_ids and not assessment_ids:
        raise HTTPException(400, "No visible class evidence is available for JA Ask")
    selected_lesson_id = lesson_id if lesson_id in lesson_ids else None
    selected_lesson_title = (lesson_title or "").strip() or None
    helper_prompt = _is_helper_prompt(message)

    query_seed = message.strip()
    if quick_action:
        query_seed = f"{quick_action}: {query_seed}"

    chunks = await similarity_search(
        db,
        query_text=query_seed,
        class_id=class_id,
        top_k=6,
        lesson_ids=([selected_lesson_id] if selected_lesson_id else lesson_ids) or None,
        assessment_ids=None if selected_lesson_id else assessment_ids or None,
        only_published=True,
        policy_name="student_tutor",
        reference_lesson_id=selected_lesson_id,
    )

    if selected_lesson_id and helper_prompt and len(chunks) < 1:
        fallback_seed = selected_lesson_title or "current lesson overview"
        if quick_action:
            fallback_seed = f"{quick_action}: {fallback_seed}"
        chunks = await similarity_search(
            db,
            query_text=fallback_seed,
            class_id=class_id,
            top_k=6,
            lesson_ids=[selected_lesson_id],
            assessment_ids=None,
            only_published=True,
            policy_name="student_tutor",
            reference_lesson_id=selected_lesson_id,
        )

    if selected_lesson_id and helper_prompt and len(chunks) < 1:
        chunks = await _fetch_selected_lesson_fallback_chunks(
            db,
            class_id=class_id,
            lesson_id=selected_lesson_id,
        )

    if selected_lesson_id and not helper_prompt and _is_low_confidence_context_match(chunks):
        lesson_label = selected_lesson_title or "the selected lesson"
        return {
            "blocked": True,
            "reason": "lesson_context_mismatch",
            "reply": _build_study_coach_reply(
                main_idea=f"That question looks outside {lesson_label}.",
                breakdown=[
                    "The selected lesson context does not match the concept you asked about."
                ],
                try_now=[
                    f"Ask about {lesson_label} directly.",
                    "Switch to a different visible lesson context first.",
                ],
                watch_out=[
                    "JA only answers from the lesson context and visible class evidence it can ground."
                ],
            ),
            "citations": [],
            "insufficientEvidence": False,
        }

    if len(chunks) < 1:
        if helper_prompt:
            if selected_lesson_id:
                lesson_label = selected_lesson_title or "the selected lesson"
                return {
                    "blocked": False,
                    "reason": None,
                    "reply": _build_study_coach_reply(
                        main_idea=f"I do not have enough readable class evidence for {lesson_label} yet.",
                        breakdown=[
                            "The lesson exists, but the available material is too thin for a confident grounded explanation."
                        ],
                        try_now=[
                            "Try another visible lesson with fuller content.",
                            "Ask your teacher to publish clearer lesson material first.",
                        ],
                        watch_out=[
                            "JA would rather be explicit about weak evidence than guess."
                        ],
                    ),
                    "citations": [],
                    "insufficientEvidence": True,
                }
            return {
                "blocked": False,
                "reason": None,
                "reply": _build_study_coach_reply(
                    main_idea="I can help with summaries, explanations, study plans, and review guidance.",
                    breakdown=[
                        "JA works best when one visible lesson is selected first."
                    ],
                    try_now=[
                        "Pick one visible lesson in JA Hub before asking.",
                        "Then ask for a summary, explanation, quiz, or study plan.",
                    ],
                ),
                "citations": [],
                "insufficientEvidence": False,
            }
        return {
            "blocked": False,
            "reason": None,
            "reply": _build_study_coach_reply(
                main_idea="I cannot answer that confidently from your visible class sources yet.",
                breakdown=[
                    "Your question needs a clearer lesson or assessment context before JA can ground it safely."
                ],
                try_now=[
                    "Select a specific visible lesson first.",
                    "Then ask one focused follow-up about that material.",
                ],
                watch_out=[
                    "JA avoids filling gaps with unsupported guesses."
                ],
            ),
            "citations": [],
            "insufficientEvidence": True,
        }

    citations = [_format_citation(chunk) for chunk in chunks[:4]]
    source_context = "\n\n".join(
        f"[Source {idx + 1}] {chunk.get('chunkText', '')[:700]}"
        for idx, chunk in enumerate(chunks[:4])
    )
    history_context = "\n".join(
        f"{entry.get('role', 'user')}: {entry.get('content', '')[:280]}"
        for entry in (history or [])[-6:]
    )
    prompt = (
        "You are JA Ask in Nexora LMS. Answer using only the provided class sources.\n"
        "Rules:\n"
        "- Do not provide direct cheating answers.\n"
        "- If evidence is thin, say so.\n"
        "- Respond in plain text with these exact headings when relevant: "
        "## Main idea, ## Break it down, optional ## Simple analogy, ## Try this now, optional ## Watch out.\n"
        "- Use short bullets for Break it down, Try this now, and Watch out.\n"
        "- Keep the tone supportive, lesson-grounded, and specific.\n\n"
        f"Thread: {thread_id}\n"
        f"Selected lesson context: {selected_lesson_title or 'none'}\n"
        f"Student message: {message.strip()}\n"
        f"Quick action: {quick_action or 'none'}\n"
        f"Recent conversation:\n{history_context or 'n/a'}\n\n"
        f"Grounding sources:\n{source_context}\n"
    )
    try:
        reply = await ollama_client.generate(prompt=prompt, task="chat")
    except Exception as exc:
        logger.warning(
            "JA Ask generation failed; returning cited lesson fallback",
            exc_info=exc,
        )
        return {
            "blocked": False,
            "reason": "ai_runtime_unavailable",
            "reply": _build_study_coach_reply(
                main_idea=(
                    "The AI model is temporarily unavailable, so I will keep this "
                    "response grounded in your selected lesson."
                ),
                breakdown=[
                    str(chunk.get("chunkText") or "").strip()[:240]
                    for chunk in chunks[:2]
                    if str(chunk.get("chunkText") or "").strip()
                ],
                try_now=[
                    "Review the cited lesson passage and identify its key term.",
                    "Try asking one narrower question about that cited passage.",
                ],
                watch_out=[
                    "JA is not generating new claims while the AI model is unavailable."
                ],
            ),
            "citations": citations,
            "insufficientEvidence": False,
            "degraded": True,
        }
    return {
        "blocked": False,
        "reason": None,
        "reply": _format_generated_study_reply(
            reply=reply or "",
            message=message,
            quick_action=quick_action,
            lesson_title=selected_lesson_title,
        ),
        "citations": citations,
        "insufficientEvidence": False,
        "degraded": False,
    }


async def _fetch_review_attempt_questions(
    db: AsyncSession,
    *,
    student_id: str,
    class_id: str,
    attempt_id: str,
) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              aa.id AS attempt_id,
              a.id AS assessment_id,
              a.title AS assessment_title,
              q.id AS question_id,
              q.content AS question_content,
              q.type AS question_type,
              q.explanation AS question_explanation,
              q.concept_tags AS concept_tags,
              COALESCE(r.is_correct, false) AS is_correct,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', o.id,
                    'text', o.text,
                    'isCorrect', o.is_correct,
                    'order', o."order"
                  )
                  ORDER BY o."order"
                ) FILTER (WHERE o.id IS NOT NULL),
                '[]'::json
              ) AS options_json
            FROM assessment_attempts aa
            INNER JOIN assessments a ON a.id = aa.assessment_id
            INNER JOIN assessment_questions q ON q.assessment_id = a.id
            LEFT JOIN assessment_responses r
              ON r.attempt_id = aa.id
             AND r.question_id = q.id
            LEFT JOIN assessment_question_options o ON o.question_id = q.id
            WHERE aa.id = :attemptId
              AND aa.student_id = :studentId
              AND aa.is_submitted = true
              AND a.class_id = :classId
              AND a.is_published = true
              AND q.type IN ('multiple_choice', 'multiple_select', 'true_false', 'dropdown')
            GROUP BY
              aa.id,
              a.id,
              a.title,
              q.id,
              q.content,
              q.type,
              q.explanation,
              q.concept_tags,
              r.is_correct
            ORDER BY q."order" ASC
            """
        ),
        {
            "attemptId": attempt_id,
            "studentId": student_id,
            "classId": class_id,
        },
    )
    return [dict(row) for row in rows.mappings()]


async def _fetch_class_lessons_for_review(db: AsyncSession, class_id: str) -> list[dict[str, Any]]:
    rows = await db.execute(
        sa_text(
            """
            SELECT
              l.id AS "lessonId",
              l.title AS "title",
              m.title AS "moduleTitle",
              l.summary AS "summary",
              l.content AS "content"
            FROM lessons l
            INNER JOIN class_modules m ON m.id = l.module_id
            WHERE m.class_id = :classId
            ORDER BY m.order_index ASC, l.order_index ASC
            """
        ),
        {"classId": class_id},
    )
    results = []
    for r in rows.mappings():
        mod_title = str(r["moduleTitle"] or "").strip()
        les_title = str(r["title"] or "").strip()
        full_title = f"{mod_title}: {les_title}" if mod_title and les_title and mod_title not in les_title else les_title or mod_title
        results.append({
            "lessonId": str(r["lessonId"]),
            "title": full_title,
            "sourceReference": full_title,
            "summary": str(r["summary"] or ""),
            "content": str(r["content"] or ""),
            "clueText": f"{r['summary'] or ''} {r['content'] or ''}".strip(),
        })
    return results


async def generate_ja_review_session_packet(
    db: AsyncSession,
    *,
    user: RequestUser,
    class_id: str,
    attempt_id: str,
    question_count: int,
    allowed_lesson_ids: list[str] | None,
    allowed_assessment_ids: list[str] | None,
) -> dict[str, Any]:
    await _assert_student_class_access(db, user.id, class_id)
    rows = await _fetch_review_attempt_questions(
        db,
        student_id=user.id,
        class_id=class_id,
        attempt_id=attempt_id,
    )
    if not rows:
        raise HTTPException(400, "No eligible submitted attempt found for JA Review")

    assessment_id = str(rows[0]["assessment_id"])
    if allowed_assessment_ids and assessment_id not in allowed_assessment_ids:
        raise HTTPException(403, "Assessment is outside visible JA review evidence")

    sorted_rows = sorted(
        rows,
        key=lambda item: (bool(item.get("is_correct")),),
    )
    class_lessons = await _fetch_class_lessons_for_review(db, class_id)
    from .remedial_service import _build_guided_question_review_hint, _clean_clue_text

    selected_items: list[dict[str, Any]] = []
    for row in sorted_rows:
        qtype = str(row["question_type"])
        options = _normalize_options(row.get("options_json"))
        answer_key = _build_answer_key(question_type=qtype, options=options)
        if answer_key is None:
            continue
        is_correct = bool(row.get("is_correct"))
        explanation = str(row.get("question_explanation") or "").strip()
        concept_tags = row.get("concept_tags")
        concept_label = concept_tags[0] if isinstance(concept_tags, list) and concept_tags else None
        assessment_title = str(row.get("assessment_title") or "").strip()

        # Clean assessment title if it has prefixes like Quiz # or Assessment #
        clean_assessment_title = re.sub(r"^(?:Quiz|Assessment|Exam)\s*\d+[\s:\-]*", "", assessment_title, flags=re.IGNORECASE).strip() or assessment_title

        grounded_clue = _build_guided_question_review_hint(
            {"content": row.get("question_content"), "explanation": explanation, "options": options},
            concept_label,
            class_lessons,
            fallback_title=clean_assessment_title,
        )
        clean_hint = _clean_clue_text(grounded_clue or explanation or f"Review key concept: {concept_label or 'lesson topic'}.")

        selected_items.append(
            {
                "id": f"r-{len(selected_items) + 1}",
                "itemType": qtype,
                "prompt": str(row["question_content"]).strip(),
                "options": [
                    {"id": opt["id"], "text": opt["text"], "order": opt["order"]}
                    for opt in options
                ],
                "answerKey": answer_key,
                "hint": clean_hint,
                "explanation": _clean_clue_text(explanation) or clean_hint,
                "citations": [
                    {
                        "label": str(row["assessment_title"]),
                        "assessmentId": assessment_id,
                        "questionId": str(row["question_id"]),
                    }
                ],
                "validation": {
                    "deterministic": True,
                    "sourceType": "assessment_question",
                    "assessmentId": assessment_id,
                    "questionId": str(row["question_id"]),
                    "attemptId": attempt_id,
                },
            }
        )
        if len(selected_items) >= question_count:
            break

    if not selected_items:
        raise HTTPException(
            400,
            "Insufficient objective assessment evidence for JA Review session",
        )

    class_row = await db.execute(
        sa_text(
            """
            SELECT c.subject_name, c.subject_code, s.name AS section_name
            FROM classes c
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE c.id = :classId
            """
        ),
        {"classId": class_id},
    )
    class_info = class_row.mappings().first()
    class_label = "Class"
    if class_info:
        class_label = f"{class_info['subject_name']} ({class_info['subject_code']})"
        if class_info["section_name"]:
            class_label = f"{class_label} - {class_info['section_name']}"

    return {
        "classLabel": class_label,
        "groundingStatus": "grounded",
        "sourceSnapshot": {
            "attemptId": attempt_id,
            "assessmentId": assessment_id,
            "allowedLessonCount": len([entry for entry in (allowed_lesson_ids or []) if entry]),
            "allowedAssessmentCount": len([entry for entry in (allowed_assessment_ids or []) if entry]),
            "selectedQuestionCount": len(selected_items),
        },
        "items": selected_items,
    }
