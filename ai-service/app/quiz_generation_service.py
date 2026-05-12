from __future__ import annotations

import json
import logging
import re
import hashlib
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from fastapi import HTTPException
from sqlalchemy import bindparam, text as sa_text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from . import ollama_client
from .retrieval_service import normalize_library_subject_key, similarity_search
from .schemas import GenerateQuizDraftRequest, RequestUser

logger = logging.getLogger(__name__)


def _normalize_quiz_draft_output(
    structured_output: dict[str, Any] | None,
    *,
    fallback_title: str,
    fallback_description: str,
    existing_output: dict[str, Any] | None = None,
) -> dict[str, Any]:
    base = existing_output if isinstance(existing_output, dict) else {}
    candidate = structured_output if isinstance(structured_output, dict) else {}

    title = str(candidate.get("title") or base.get("title") or fallback_title).strip()
    if not title:
        title = fallback_title

    description = str(
        candidate.get("description")
        or base.get("description")
        or fallback_description
    ).strip()

    normalized_questions: list[dict[str, Any]] = []
    raw_questions = candidate.get("questions")
    if not isinstance(raw_questions, list):
        raw_questions = base.get("questions")
    if not isinstance(raw_questions, list):
        raw_questions = []

    for question in raw_questions:
        if not isinstance(question, dict):
            continue
        content = str(question.get("content") or "").strip()
        if not content:
            continue

        normalized_question: dict[str, Any] = {
            "type": str(question.get("type") or "multiple_choice").strip().lower()
            or "multiple_choice",
            "content": content,
            "points": _safe_positive_int(question.get("points")),
        }
        for key in (
            "id",
            "difficulty",
            "cognitiveLevel",
            "provenance",
            "groundingScore",
            "issueIds",
            "expectedAnswer",
            "rubric",
            "reviewed",
        ):
            if key in question:
                normalized_question[key] = question[key]

        explanation = str(question.get("explanation") or "").strip()
        if explanation:
            normalized_question["explanation"] = explanation

        concept_tags = question.get("conceptTags")
        if isinstance(concept_tags, list):
            normalized_question["conceptTags"] = [
                str(tag).strip()
                for tag in concept_tags
                if str(tag).strip()
            ]

        options = question.get("options")
        if isinstance(options, list):
            normalized_options: list[dict[str, Any]] = []
            for option_order, option in enumerate(options, start=1):
                if not isinstance(option, dict):
                    continue
                option_text = str(option.get("text") or "").strip()
                if not option_text:
                    continue
                normalized_options.append(
                    {
                        "text": option_text,
                        "isCorrect": bool(option.get("isCorrect")),
                        "order": _safe_positive_int(option.get("order"), option_order),
                    }
                )
            if normalized_options:
                normalized_question["options"] = normalized_options

        normalized_questions.append(normalized_question)

    normalized = {
        "title": title,
        "description": description or fallback_description,
        "questions": normalized_questions,
    }

    if isinstance(base.get("blueprint"), dict):
        normalized["blueprint"] = base["blueprint"]
    if isinstance(base.get("blueprintSource"), str):
        normalized["blueprintSource"] = base["blueprintSource"]
    for key in (
        "qualityGate",
        "reviewRequired",
        "reviewState",
        "reviewIssues",
        "sourceManifest",
        "audit",
    ):
        if key in candidate:
            normalized[key] = candidate[key]
        elif key in base:
            normalized[key] = base[key]

    return normalized

QUIZ_GENERATION_SYSTEM_PROMPT = """You generate grounded draft assessments for a high-school LMS.

RULES:
- Use only the provided source material.
- Output valid JSON only.
- Create questions that test understanding, not trivia.
- Avoid duplicating the provided existing questions.
- Prefer clear wording suitable for Grade 7-10 students.

JSON FORMAT:
{
  "title": "Assessment title",
  "description": "Short teacher-facing summary",
  "questions": [
    {
      "type": "multiple_choice",
      "content": "Question text",
      "points": 1,
      "explanation": "Why the correct answer is correct",
      "conceptTags": ["concept 1", "concept 2"],
      "options": [
        { "text": "Option A", "isCorrect": false, "order": 1 },
        { "text": "Option B", "isCorrect": true, "order": 2 }
      ]
    }
  ]
}
"""

QUIZ_GENERATION_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "content": {"type": "string"},
                    "points": {"type": "integer"},
                    "explanation": {"type": "string"},
                    "conceptTags": {"type": "array", "items": {"type": "string"}},
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "isCorrect": {"type": "boolean"},
                                "order": {"type": "integer"},
                            },
                            "required": ["text", "isCorrect", "order"],
                        },
                    },
                },
                "required": ["type", "content", "points", "explanation", "conceptTags", "options"],
            },
        },
    },
    "required": ["title", "description", "questions"],
}

QUIZ_BLUEPRINT_FORMAT: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "description": {"type": "string"},
        "conceptCoverage": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
            "maxItems": 8,
        },
        "questionBlueprints": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "intent": {"type": "string"},
                    "difficulty": {"type": "string"},
                    "sourceCitation": {"type": "string"},
                },
                "required": ["intent", "difficulty", "sourceCitation"],
            },
        },
    },
    "required": ["title", "description", "conceptCoverage", "questionBlueprints"],
}


def _normalize_question_text(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", (value or "").lower()))


def _extract_json_payload(raw: str) -> str:
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    first = cleaned.find("{")
    last = cleaned.rfind("}")
    if first == -1 or last <= first:
        raise ValueError("Model output did not contain a JSON object")
    return cleaned[first : last + 1]


def _parse_generation_output(raw: str) -> dict[str, Any]:
    cleaned = _extract_json_payload(raw)
    parsed = json.loads(cleaned)
    if not isinstance(parsed.get("questions"), list) or not parsed["questions"]:
        raise ValueError("Generated output does not contain any questions")
    return parsed


def _dedupe_generated_questions(
    generated: list[dict[str, Any]],
    existing_texts: set[str],
) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    seen_generated = set(existing_texts)
    for question in generated:
        normalized = _normalize_question_text(question.get("content", ""))
        if not normalized or normalized in seen_generated:
            continue
        seen_generated.add(normalized)
        deduped.append(question)
    return deduped


def _html_to_text(value: Any) -> str:
    text = re.sub(r"<[^>]+>", " ", str(value or ""))
    return re.sub(r"\s+", " ", text).strip()


def _safe_positive_int(value: Any, default: int = 1) -> int:
    try:
        return max(1, int(value or default))
    except (TypeError, ValueError, OverflowError):
        return default


def _token_set(value: Any) -> set[str]:
    return set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", _html_to_text(value).lower()))


def _issue(
    *,
    code: str,
    severity: str,
    message: str,
    question_index: int | None = None,
    option_index: int | None = None,
    scope: str = "question",
    resolved: bool = False,
    resolution: str | None = None,
) -> dict[str, Any]:
    seed = f"{code}:{scope}:{question_index}:{option_index}:{message}"
    return {
        "id": f"quiz-issue-{hashlib.sha1(seed.encode('utf-8')).hexdigest()[:10]}",
        "code": code,
        "severity": severity,
        "scope": scope,
        "message": message,
        "questionIndex": question_index,
        "optionIndex": option_index,
        "resolved": resolved,
        "resolution": resolution,
    }


def _question_id(question: dict[str, Any], index: int) -> str:
    seed = json.dumps(
        {
            "index": index,
            "type": question.get("type"),
            "content": _normalize_question_text(str(question.get("content") or "")),
        },
        sort_keys=True,
    )
    return f"q-{hashlib.sha1(seed.encode('utf-8')).hexdigest()[:12]}"


def _source_title(item: dict[str, Any]) -> str:
    metadata = item.get("metadataJson") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    return str(
        metadata.get("lessonTitle")
        or metadata.get("assessmentTitle")
        or metadata.get("title")
        or item.get("sourceReference")
        or item.get("sourceType")
        or "Source"
    )


def _source_manifest(source_chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    manifest: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in source_chunks:
        chunk_id = str(item.get("id") or "")
        if not chunk_id or chunk_id in seen:
            continue
        seen.add(chunk_id)
        manifest.append(
            {
                "chunkId": chunk_id,
                "sourceType": item.get("sourceType"),
                "sourceId": item.get("sourceId"),
                "sourceReference": item.get("sourceReference"),
                "sourceTitle": _source_title(item),
                "sourceSnippet": _sanitize_prompt_text(item.get("chunkText") or "", max_chars=260),
                "confidence": float((item.get("scoreBreakdown") or {}).get("final") or 0),
                "selectionReason": item.get("selectionReason"),
            }
        )
    return manifest


def _best_provenance(
    question: dict[str, Any],
    source_chunks: list[dict[str, Any]],
) -> tuple[dict[str, Any], float]:
    question_tokens = _token_set(
        " ".join(
            [
                str(question.get("content") or ""),
                str(question.get("explanation") or ""),
                " ".join(str(option.get("text") or "") for option in question.get("options") or [] if isinstance(option, dict)),
            ]
        )
    )
    best_item = source_chunks[0] if source_chunks else {}
    best_overlap = 0
    for item in source_chunks:
        overlap = len(question_tokens & _token_set(item.get("chunkText") or ""))
        if overlap > best_overlap:
            best_item = item
            best_overlap = overlap
    source_tokens = _token_set(best_item.get("chunkText") or "")
    confidence = min(1.0, best_overlap / max(4, len(question_tokens))) if question_tokens else 0.0
    provenance = {
        "chunkId": str(best_item.get("id") or ""),
        "sourceType": best_item.get("sourceType"),
        "sourceId": best_item.get("sourceId"),
        "sourceReference": best_item.get("sourceReference"),
        "sourceTitle": _source_title(best_item),
        "sourceSnippet": _sanitize_prompt_text(best_item.get("chunkText") or "", max_chars=260),
        "confidence": confidence,
        "selectionReason": best_item.get("selectionReason"),
    }
    if not source_tokens:
        confidence = 0.0
    return provenance, confidence


def _normalize_options(raw_options: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_options, list):
        return []
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for option_order, option in enumerate(raw_options, start=1):
        if not isinstance(option, dict):
            continue
        option_text = _html_to_text(option.get("text"))
        if not option_text:
            continue
        fingerprint = _normalize_question_text(option_text)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        normalized.append(
            {
                "text": option_text,
                "isCorrect": bool(option.get("isCorrect")),
                "order": _safe_positive_int(option.get("order"), len(normalized) + 1),
            }
        )
    return normalized


def _fallback_source_statement(source_chunks: list[dict[str, Any]], index: int) -> tuple[str, dict[str, Any]]:
    item = source_chunks[index % len(source_chunks)] if source_chunks else {}
    text = _html_to_text(item.get("chunkText") or "")
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]
    statement = sentences[0] if sentences else text[:160].strip()
    if not statement:
        statement = "The selected source contains this concept."
    return statement, item


def _build_fallback_question(
    *,
    source_chunks: list[dict[str, Any]],
    question_type: str,
    index: int,
) -> dict[str, Any]:
    statement, item = _fallback_source_statement(source_chunks, index)
    metadata = item.get("metadataJson") or {}
    concept_tags = metadata.get("conceptTags") if isinstance(metadata, dict) else []
    if not isinstance(concept_tags, list):
        concept_tags = []
    focus = str(concept_tags[0] if concept_tags else _source_title(item)).strip() or "the selected source"
    base: dict[str, Any] = {
        "type": question_type,
        "points": 1,
        "explanation": f"This item is grounded in the selected source: {statement}",
        "conceptTags": [str(tag).strip() for tag in concept_tags[:3] if str(tag).strip()],
        "difficulty": "easy",
        "cognitiveLevel": "understand",
    }
    if question_type == "true_false":
        base.update(
            {
                "content": statement if statement.endswith(".") else f"{statement}.",
                "options": [
                    {"text": "True", "isCorrect": True, "order": 1},
                    {"text": "False", "isCorrect": False, "order": 2},
                ],
            }
        )
    elif question_type == "short_answer":
        base.update(
            {
                "content": f"Explain {focus} using the selected source.",
                "expectedAnswer": statement,
                "rubric": "Award credit when the answer accurately uses the selected source evidence.",
            }
        )
    elif question_type == "multiple_select":
        base.update(
            {
                "content": f"Which statements are supported by the selected source about {focus}?",
                "options": [
                    {"text": statement, "isCorrect": True, "order": 1},
                    {"text": f"The source connects this to {focus}.", "isCorrect": True, "order": 2},
                    {"text": "The source says this topic is unrelated to the lesson.", "isCorrect": False, "order": 3},
                    {"text": "The source says no evidence is needed for this topic.", "isCorrect": False, "order": 4},
                ],
            }
        )
    else:
        base.update(
            {
                "type": "multiple_choice",
                "content": f"Which statement is supported by the selected source about {focus}?",
                "options": [
                    {"text": statement, "isCorrect": True, "order": 1},
                    {"text": "The source says the topic is not part of the lesson.", "isCorrect": False, "order": 2},
                    {"text": "The source says the topic has no real-world examples.", "isCorrect": False, "order": 3},
                    {"text": "The source says students should ignore this concept.", "isCorrect": False, "order": 4},
                ],
            }
        )
    return base


def _validate_question_shape(
    question: dict[str, Any],
    *,
    question_index: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    qtype = str(question.get("type") or "multiple_choice").strip().lower()
    normalized: dict[str, Any] = {
        "type": qtype,
        "content": str(question.get("content") or "").strip(),
        "points": _safe_positive_int(question.get("points")),
        "explanation": str(question.get("explanation") or "").strip(),
        "conceptTags": [
            str(tag).strip()
            for tag in (question.get("conceptTags") or [])
            if str(tag).strip()
        ]
        if isinstance(question.get("conceptTags"), list)
        else [],
        "difficulty": str(question.get("difficulty") or "medium").strip().lower(),
        "cognitiveLevel": str(question.get("cognitiveLevel") or "understand").strip().lower(),
    }
    issues: list[dict[str, Any]] = []
    if not normalized["content"]:
        issues.append(
            _issue(
                code="missing_question_content",
                severity="blocking",
                message="Question text is missing.",
                question_index=question_index,
            )
        )

    options = _normalize_options(question.get("options"))
    correct_count = sum(1 for option in options if option.get("isCorrect"))
    if qtype == "multiple_choice":
        if len(options) != 4 or correct_count != 1:
            issues.append(
                _issue(
                    code="invalid_multiple_choice_options",
                    severity="blocking",
                    message="Multiple-choice questions need exactly 4 options and exactly 1 correct answer.",
                    question_index=question_index,
                )
            )
        normalized["options"] = options
    elif qtype == "multiple_select":
        if len(options) < 4 or len(options) > 6 or correct_count < 2:
            issues.append(
                _issue(
                    code="invalid_multiple_select_options",
                    severity="blocking",
                    message="Multiple-select questions need 4-6 options and at least 2 correct answers.",
                    question_index=question_index,
                )
            )
        normalized["options"] = options
    elif qtype == "true_false":
        option_map = {option["text"].strip().lower(): option for option in options}
        if set(option_map.keys()) != {"true", "false"} or correct_count != 1:
            issues.append(
                _issue(
                    code="invalid_true_false_options",
                    severity="blocking",
                    message="True/false questions need exactly True and False options with exactly 1 correct answer.",
                    question_index=question_index,
                )
            )
        normalized["options"] = [
            {"text": "True", "isCorrect": bool(option_map.get("true", {}).get("isCorrect")), "order": 1},
            {"text": "False", "isCorrect": bool(option_map.get("false", {}).get("isCorrect")), "order": 2},
        ]
    elif qtype == "short_answer":
        expected_answer = str(question.get("expectedAnswer") or question.get("answer") or "").strip()
        rubric = str(question.get("rubric") or "").strip()
        if not expected_answer and not normalized["explanation"]:
            issues.append(
                _issue(
                    code="missing_short_answer_key",
                    severity="blocking",
                    message="Short-answer questions need an expected answer or clear explanation for teacher review.",
                    question_index=question_index,
                )
            )
        if expected_answer:
            normalized["expectedAnswer"] = expected_answer
        if rubric:
            normalized["rubric"] = rubric
    else:
        normalized["type"] = "multiple_choice"
        normalized["options"] = options
        issues.append(
            _issue(
                code="unsupported_question_type",
                severity="blocking",
                message=f"Question type '{qtype}' is not supported for AI draft apply.",
                question_index=question_index,
            )
        )

    if not normalized["explanation"]:
        issues.append(
            _issue(
                code="weak_explanation",
                severity="warning",
                message="Add an explanation so the teacher can verify the answer.",
                question_index=question_index,
            )
        )
    return normalized, issues


def _prepare_quiz_questions_for_review(
    questions: list[dict[str, Any]],
    *,
    source_chunks: list[dict[str, Any]],
    question_type: str,
    requested_count: int,
    existing_question_texts: set[str],
) -> dict[str, Any]:
    normalized_questions: list[dict[str, Any]] = []
    review_issues: list[dict[str, Any]] = []
    seen = set(existing_question_texts)

    for question in questions:
        normalized_text = _normalize_question_text(str(question.get("content") or ""))
        if not normalized_text or normalized_text in seen:
            review_issues.append(
                _issue(
                    code="duplicate_question_removed",
                    severity="warning",
                    message="A duplicate or empty generated question was removed.",
                    scope="draft",
                )
            )
            continue
        seen.add(normalized_text)
        question_index = len(normalized_questions)
        normalized, shape_issues = _validate_question_shape(
            question,
            question_index=question_index,
        )
        provenance, grounding_score = _best_provenance(normalized, source_chunks)
        if grounding_score <= 0:
            shape_issues.append(
                _issue(
                    code="weak_grounding",
                    severity="blocking",
                    message="Question text is not grounded in the selected source chunks.",
                    question_index=question_index,
                )
            )
        normalized["id"] = str(question.get("id") or _question_id(normalized, question_index))
        normalized["provenance"] = provenance
        normalized["groundingScore"] = grounding_score
        normalized["issueIds"] = [issue["id"] for issue in shape_issues]
        normalized_questions.append(normalized)
        review_issues.extend(shape_issues)

    while len(normalized_questions) < requested_count and source_chunks:
        fallback = _build_fallback_question(
            source_chunks=source_chunks,
            question_type=question_type,
            index=len(normalized_questions),
        )
        question_index = len(normalized_questions)
        normalized, shape_issues = _validate_question_shape(
            fallback,
            question_index=question_index,
        )
        provenance, grounding_score = _best_provenance(normalized, source_chunks)
        repair_issue = _issue(
            code="underfilled_repaired",
            severity="warning",
            message="A deterministic source-grounded fallback question was added because generation returned too few usable questions.",
            question_index=question_index,
            resolved=True,
            resolution="deterministic_refill",
        )
        normalized["id"] = _question_id(normalized, question_index)
        normalized["provenance"] = provenance
        normalized["groundingScore"] = grounding_score
        normalized["issueIds"] = [repair_issue["id"], *[issue["id"] for issue in shape_issues]]
        normalized_questions.append(normalized)
        review_issues.append(repair_issue)
        review_issues.extend(shape_issues)

    normalized_questions = normalized_questions[:requested_count]
    unresolved_blocking = [
        issue
        for issue in review_issues
        if issue.get("severity") == "blocking" and not issue.get("resolved")
    ]
    unresolved_warnings = [
        issue
        for issue in review_issues
        if issue.get("severity") == "warning" and not issue.get("resolved")
    ]
    if not normalized_questions or unresolved_blocking:
        quality_gate = "fail"
    elif review_issues:
        quality_gate = "warn"
    else:
        quality_gate = "pass"
    review_required = bool(unresolved_blocking or unresolved_warnings)
    return {
        "questions": normalized_questions,
        "reviewIssues": review_issues,
        "reviewState": "needs_review" if review_required else "ready",
        "reviewRequired": review_required,
        "qualityGate": quality_gate,
        "sourceManifest": _source_manifest(source_chunks),
    }


def _score_quiz_golden_eval(
    structured_output: dict[str, Any],
    *,
    expected_question_count: int,
    required_source_terms: list[str] | None = None,
    forbidden_terms: list[str] | None = None,
    required_issue_codes: list[str] | None = None,
) -> dict[str, Any]:
    questions = structured_output.get("questions") if isinstance(structured_output, dict) else []
    if not isinstance(questions, list):
        questions = []
    joined_text = " ".join(str(question.get("content") or "") for question in questions if isinstance(question, dict)).lower()
    issue_codes = {
        str(issue.get("code"))
        for issue in structured_output.get("reviewIssues", [])
        if isinstance(issue, dict)
    }
    failed: list[str] = []
    if len(questions) != expected_question_count:
        failed.append("question_count")
    if any(term.lower() not in joined_text for term in required_source_terms or []):
        failed.append("required_source_terms")
    if any(term.lower() in joined_text for term in forbidden_terms or []):
        failed.append("forbidden_terms")
    if any(code not in issue_codes for code in required_issue_codes or []):
        failed.append("required_issue_codes")
    return {
        "passed": not failed,
        "failedChecks": failed,
        "questionCount": len(questions),
        "issueCodes": sorted(issue_codes),
    }


def _sanitize_prompt_text(value: str, *, max_chars: int) -> str:
    normalized = (value or "").replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]", "", normalized)
    normalized = re.sub(r"[ \t]{2,}", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
    if len(normalized) > max_chars:
        normalized = normalized[: max_chars - 3].rstrip() + "..."
    return normalized


def _build_blueprint_evidence(source_chunks: list[dict[str, Any]], *, strict: bool = False) -> str:
    max_chunks = 3 if strict else 5
    max_text_chars = 280 if strict else 520
    rendered: list[str] = []
    for item in source_chunks[:max_chunks]:
        metadata = item.get("metadataJson") or {}
        concept_tags = metadata.get("conceptTags") or []
        if not isinstance(concept_tags, list):
            concept_tags = []
        snippet = _sanitize_prompt_text(item.get("chunkText") or "", max_chars=max_text_chars)
        label = _sanitize_prompt_text(item.get("sourceReference") or item.get("sourceType") or "source", max_chars=140)
        concept_line = ", ".join(str(tag).strip() for tag in concept_tags[:4] if str(tag).strip())
        parts = [f"Citation: {label}"]
        if concept_line:
            parts.append(f"Concepts: {concept_line}")
        parts.append(f"Evidence snippet: {snippet}")
        rendered.append("\n".join(parts))
    return "\n\n".join(rendered)


def _quiz_source_filters(body: GenerateQuizDraftRequest) -> dict[str, Any]:
    return {
        "lessonIds": body.lesson_ids,
        "extractionIds": body.extraction_ids,
        "questionCount": body.question_count,
        "questionType": body.question_type,
        "assessmentType": body.assessment_type,
        "title": body.title,
        "teacherNote": body.teacher_note,
        "passingScore": body.passing_score,
        "feedbackLevel": body.feedback_level,
        "classRecordCategory": body.class_record_category,
        "quarter": body.quarter,
        "sourcePolicy": body.source_policy,
        "allowDraftSources": body.allow_draft_sources,
        "retryOfJobId": body.retry_of_job_id,
    }


def _parse_quiz_blueprint_output(raw: str) -> dict[str, Any]:
    cleaned = _extract_json_payload(raw)
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("Blueprint output is not a JSON object")
    if not isinstance(parsed.get("conceptCoverage"), list) or not parsed["conceptCoverage"]:
        raise ValueError("Blueprint output did not contain concept coverage")
    if not isinstance(parsed.get("questionBlueprints"), list) or not parsed["questionBlueprints"]:
        raise ValueError("Blueprint output did not contain question blueprints")
    return parsed


def _log_blueprint_parse_failure(
    *,
    raw: str,
    error: Exception,
    class_id: str,
    stage: str,
) -> None:
    logger.warning(
        "[quiz-blueprint] Parse failure for class %s at stage %s: %s | raw=%r",
        class_id,
        stage,
        str(error),
        _sanitize_prompt_text(raw, max_chars=500),
    )


def _fallback_quiz_blueprint(
    *,
    class_info: dict[str, Any],
    body: GenerateQuizDraftRequest,
    source_chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    concept_coverage: list[str] = []
    for item in source_chunks[: max(body.question_count, 3)]:
        metadata = item.get("metadataJson") or {}
        raw_tags = metadata.get("conceptTags") or []
        if isinstance(raw_tags, list):
            for tag in raw_tags:
                normalized = str(tag).strip()
                if normalized and normalized not in concept_coverage:
                    concept_coverage.append(normalized)
        lesson_title = str(metadata.get("lessonTitle") or "").strip()
        if lesson_title and lesson_title not in concept_coverage:
            concept_coverage.append(lesson_title)
        if len(concept_coverage) >= 8:
            break
    if not concept_coverage:
        concept_coverage.append(str(class_info["subject_name"]))

    question_blueprints: list[dict[str, str]] = []
    difficulties = ["easy", "easy", "medium", "medium", "medium", "challenging"]
    selected_sources = source_chunks[: max(body.question_count, 3)] or source_chunks[:1]
    for index in range(body.question_count):
        source = selected_sources[index % len(selected_sources)]
        metadata = source.get("metadataJson") or {}
        focus = concept_coverage[index % len(concept_coverage)]
        citation = (
            source.get("sourceReference")
            or metadata.get("lessonTitle")
            or metadata.get("assessmentTitle")
            or source.get("sourceType")
            or "class material"
        )
        question_blueprints.append(
            {
                "intent": f"Check understanding of {focus} using grounded class material.",
                "difficulty": difficulties[min(index, len(difficulties) - 1)],
                "sourceCitation": str(citation),
            }
        )

    return {
        "title": body.title or f"{class_info['subject_name']} AI Draft Quiz",
        "description": "Fallback blueprint derived from selected class evidence.",
        "conceptCoverage": concept_coverage[:8],
        "questionBlueprints": question_blueprints,
        "blueprintSource": "fallback",
    }


async def generate_quiz_draft(
    db: AsyncSession,
    user: RequestUser,
    body: GenerateQuizDraftRequest,
    *,
    existing_job_id: str | None = None,
    progress_callback: Callable[[str, int], Awaitable[None]] | None = None,
) -> dict[str, Any]:
    class_row = await db.execute(
        sa_text(
            """
            SELECT c.id, c.teacher_id, c.subject_name, c.subject_code, s.grade_level
            FROM classes c
            LEFT JOIN sections s ON s.id = c.section_id
            WHERE c.id = :classId
            """
        ),
        {"classId": body.class_id},
    )
    class_info = class_row.mappings().first()
    if not class_info:
        raise HTTPException(404, "Class not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(class_info["teacher_id"]) != user.id:
        raise HTTPException(403, "You can only generate quizzes for your own classes")

    library_subject_key = normalize_library_subject_key(
        class_info["subject_code"],
        class_info["subject_name"],
    )
    library_grade_level = str(class_info["grade_level"]) if class_info["grade_level"] else None

    if progress_callback:
        await progress_callback("Retrieving evidence", 45)

    source_chunks: list[dict[str, Any]]
    if body.lesson_ids:
        source_chunks = await similarity_search(
            db,
            query_text=body.teacher_note or class_info["subject_name"],
            class_id=body.class_id,
            teacher_id=user.id,
            subject_key=library_subject_key,
            grade_level=library_grade_level,
            top_k=max(8, body.question_count * 2),
            lesson_ids=body.lesson_ids,
            only_published=not body.allow_draft_sources,
            policy_name="quiz_generation",
        )
    elif body.extraction_ids:
        source_chunks = await similarity_search(
            db,
            query_text=body.teacher_note or class_info["subject_name"],
            class_id=body.class_id,
            teacher_id=user.id,
            subject_key=library_subject_key,
            grade_level=library_grade_level,
            top_k=max(8, body.question_count * 2),
            source_types=["extracted_module"],
            policy_name="quiz_generation",
        )
        source_chunks = [
            item for item in source_chunks if item.get("extractionId") in set(body.extraction_ids)
        ]
    else:
        source_chunks = await similarity_search(
            db,
            query_text=body.teacher_note or class_info["subject_name"],
            class_id=body.class_id,
            teacher_id=user.id,
            subject_key=library_subject_key,
            grade_level=library_grade_level,
            top_k=max(8, body.question_count * 2),
            only_published=True,
            policy_name="quiz_generation",
        )

    if not source_chunks:
        raise HTTPException(400, "No indexed source content found. Reindex the class or publish lessons first.")

    existing_questions_rows = await db.execute(
        sa_text(
            """
            SELECT q.content
            FROM assessment_questions q
            INNER JOIN assessments a ON a.id = q.assessment_id
            WHERE a.class_id = :classId
            """
        ),
        {"classId": body.class_id},
    )
    existing_question_texts = {
        _normalize_question_text(row["content"])
        for row in existing_questions_rows.mappings()
        if row["content"]
    }

    source_material = "\n\n".join(
        (
            f"[{item.get('metadataJson', {}).get('lessonTitle') or item.get('metadataJson', {}).get('assessmentTitle') or item['sourceType']}]\n"
            f"{_sanitize_prompt_text(item['chunkText'], max_chars=900)}"
        )
        for item in source_chunks[: min(len(source_chunks), 8)]
    )
    blueprint = await _build_quiz_blueprint(
        class_info=class_info,
        body=body,
        source_chunks=source_chunks,
        existing_question_texts=existing_question_texts,
    )

    if progress_callback:
        await progress_callback("Generating questions", 72)

    prompt = f"""
Subject: {class_info["subject_name"]} ({class_info["subject_code"]})
Grade level: {class_info["grade_level"] or "Unknown"}
Teacher draft title: {body.title or f"{class_info['subject_name']} AI Draft Quiz"}
Requested question count: {body.question_count}
Preferred question type: {body.question_type}
Teacher note: {body.teacher_note or "[None]"}
Blueprint:
{json.dumps(blueprint, ensure_ascii=False)}

Existing question texts to avoid:
{chr(10).join(sorted(existing_question_texts)[:30])}

Source material:
{source_material}
"""

    raw = await ollama_client.generate(
        prompt,
        QUIZ_GENERATION_SYSTEM_PROMPT,
        task="quiz_generation",
        response_format=QUIZ_GENERATION_FORMAT,
    )
    parsed = _parse_generation_output(raw)
    questions = _dedupe_generated_questions(parsed.get("questions", []), existing_question_texts)
    prepared = _prepare_quiz_questions_for_review(
        questions,
        source_chunks=source_chunks,
        question_type=body.question_type,
        requested_count=body.question_count,
        existing_question_texts=existing_question_texts,
    )

    if not prepared["questions"]:
        raise HTTPException(400, "Generated questions were duplicates of existing content. Try a narrower source selection.")

    if existing_job_id:
        await db.execute(
            sa_text(
                """
                UPDATE ai_generation_jobs
                SET
                  status = 'processing',
                  error_message = NULL,
                  updated_at = NOW()
                WHERE id = :jobId
                """
            ),
            {
                "jobId": existing_job_id,
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
                  'quiz_generation',
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
                "sourceFilters": _quiz_source_filters(body),
            },
        )
        job_id = job_row.scalar_one()

    if progress_callback:
        await progress_callback("Saving draft", 88)

    structured_output = {
        "title": parsed.get("title") or body.title or f"{class_info['subject_name']} AI Draft Quiz",
        "description": parsed.get("description") or "AI-generated draft assessment for teacher review.",
        "blueprint": blueprint,
        "blueprintSource": blueprint.get("blueprintSource", "model"),
        "questions": prepared["questions"],
        "qualityGate": prepared["qualityGate"],
        "reviewRequired": prepared["reviewRequired"],
        "reviewState": prepared["reviewState"],
        "reviewIssues": prepared["reviewIssues"],
        "sourceManifest": prepared["sourceManifest"],
        "audit": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "applyResult": None,
        },
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
              'assessment_draft',
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
            "sourceFilters": _quiz_source_filters(body),
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
        "assessmentId": None,
        "title": structured_output["title"],
        "blueprint": blueprint,
        "blueprintSource": structured_output["blueprintSource"],
        "sourceCitations": [
            {
                "chunkId": item["id"],
                "sourceReference": item.get("sourceReference"),
                "selectionReason": item.get("selectionReason"),
                "scoreBreakdown": item.get("scoreBreakdown") or {},
            }
            for item in source_chunks[: min(len(source_chunks), 6)]
        ],
        "questionsCreated": len(prepared["questions"]),
        "qualityGate": structured_output["qualityGate"],
        "reviewRequired": structured_output["reviewRequired"],
        "message": "AI draft quiz output created for teacher review.",
    }


async def save_quiz_draft(
    db: AsyncSession,
    *,
    job_id: str,
    user: RequestUser,
    structured_output: dict[str, Any],
) -> dict[str, Any]:
    job_row = await db.execute(
        sa_text(
            """
            SELECT id, teacher_id
            FROM ai_generation_jobs
            WHERE id = :jobId
            """
        ),
        {"jobId": job_id},
    )
    job = job_row.mappings().first()
    if not job:
        raise HTTPException(404, "Quiz draft job not found")

    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(job["teacher_id"]) != user.id:
        raise HTTPException(403, "You do not have access to this quiz draft job")

    output_row = await db.execute(
        sa_text(
            """
            SELECT id, structured_output
            FROM ai_generation_outputs
            WHERE job_id = :jobId
              AND output_type = 'assessment_draft'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"jobId": job_id},
    )
    output = output_row.mappings().first()
    if not output:
        raise HTTPException(409, "Quiz draft output is not ready yet")

    existing_output = output.get("structured_output") or {}
    existing_map = existing_output if isinstance(existing_output, dict) else {}
    normalized = _normalize_quiz_draft_output(
        structured_output or {},
        fallback_title=str(existing_map.get("title") or "AI Draft Quiz"),
        fallback_description=str(
            existing_map.get("description")
            or "AI-generated draft assessment for teacher review."
        ),
        existing_output=existing_map,
    )

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
        "jobType": "quiz_generation",
        "status": "completed",
        "statusMessage": "Draft saved",
        "structuredOutput": normalized,
    }


def _unresolved_blocking_issues(structured_output: dict[str, Any]) -> list[dict[str, Any]]:
    issues = structured_output.get("reviewIssues")
    if not isinstance(issues, list):
        return []
    return [
        issue
        for issue in issues
        if isinstance(issue, dict)
        and issue.get("severity") == "blocking"
        and not bool(issue.get("resolved"))
    ]


def _build_quiz_apply_preview(
    *,
    structured_output: dict[str, Any],
    source_filters: dict[str, Any] | None,
    existing_assessment_id: str | None,
) -> dict[str, Any]:
    source_filters = source_filters if isinstance(source_filters, dict) else {}
    questions = structured_output.get("questions")
    if not isinstance(questions, list):
        questions = []
    total_points = sum(_safe_positive_int(question.get("points")) for question in questions if isinstance(question, dict))
    audit = structured_output.get("audit") if isinstance(structured_output.get("audit"), dict) else {}
    apply_result = audit.get("applyResult") if isinstance(audit, dict) else None
    already_applied = isinstance(apply_result, dict) and bool(apply_result.get("assessmentId") or existing_assessment_id)

    blocked_reasons: list[str] = []
    if not questions:
        blocked_reasons.append("Add at least one reviewed question before applying.")
    if structured_output.get("qualityGate") == "fail":
        blocked_reasons.append("Rerun or repair the draft because the quality gate failed.")
    if structured_output.get("reviewRequired") is True:
        blocked_reasons.append("Finish the review checklist before applying.")
    if _unresolved_blocking_issues(structured_output):
        blocked_reasons.append("Resolve blocking review issues before applying.")

    return {
        "canApply": already_applied or not blocked_reasons,
        "alreadyApplied": already_applied,
        "blockedReasons": [] if already_applied else blocked_reasons,
        "applyResult": apply_result if isinstance(apply_result, dict) else None,
        "assessment": {
            "title": structured_output.get("title") or "AI Draft Quiz",
            "description": structured_output.get("description") or "AI-generated draft assessment for teacher review.",
            "type": source_filters.get("assessmentType") or "quiz",
            "passingScore": source_filters.get("passingScore") or 60,
            "feedbackLevel": source_filters.get("feedbackLevel") or "standard",
            "classRecordCategory": source_filters.get("classRecordCategory"),
            "quarter": source_filters.get("quarter"),
            "totalPoints": total_points,
            "questionCount": len(questions),
        },
        "questions": questions,
        "reviewIssues": structured_output.get("reviewIssues") if isinstance(structured_output.get("reviewIssues"), list) else [],
    }


async def _load_quiz_draft_record(
    db: AsyncSession,
    *,
    job_id: str,
    user: RequestUser,
) -> dict[str, Any]:
    row = await db.execute(
        sa_text(
            """
            SELECT
              j.id AS job_id,
              j.teacher_id,
              j.class_id,
              j.source_filters,
              o.id AS output_id,
              o.structured_output
            FROM ai_generation_jobs j
            INNER JOIN ai_generation_outputs o ON o.job_id = j.id
            WHERE j.id = :jobId
              AND j.job_type = 'quiz_generation'
              AND o.output_type = 'assessment_draft'
            ORDER BY o.created_at DESC
            LIMIT 1
            """
        ),
        {"jobId": job_id},
    )
    record = row.mappings().first()
    if not record:
        raise HTTPException(404, "Quiz draft output not found")
    is_admin = "admin" in [role.lower() for role in user.roles]
    if not is_admin and str(record["teacher_id"]) != user.id:
        raise HTTPException(403, "You do not have access to this quiz draft job")
    return dict(record)


async def preview_quiz_draft_apply(
    db: AsyncSession,
    *,
    job_id: str,
    user: RequestUser,
) -> dict[str, Any]:
    record = await _load_quiz_draft_record(db, job_id=job_id, user=user)
    structured_output = record.get("structured_output") if isinstance(record.get("structured_output"), dict) else {}
    preview = _build_quiz_apply_preview(
        structured_output=structured_output,
        source_filters=record.get("source_filters") if isinstance(record.get("source_filters"), dict) else {},
        existing_assessment_id=None,
    )
    return {
        "jobId": job_id,
        "outputId": str(record["output_id"]),
        **preview,
    }


async def apply_quiz_draft(
    db: AsyncSession,
    *,
    job_id: str,
    user: RequestUser,
) -> dict[str, Any]:
    record = await _load_quiz_draft_record(db, job_id=job_id, user=user)
    structured_output = record.get("structured_output") if isinstance(record.get("structured_output"), dict) else {}
    source_filters = record.get("source_filters") if isinstance(record.get("source_filters"), dict) else {}
    preview = _build_quiz_apply_preview(
        structured_output=structured_output,
        source_filters=source_filters,
        existing_assessment_id=None,
    )
    if preview["alreadyApplied"]:
        return {
            "jobId": job_id,
            "outputId": str(record["output_id"]),
            "alreadyApplied": True,
            "applyResult": preview["applyResult"],
            "preview": preview,
        }
    if not preview["canApply"]:
        raise HTTPException(409, "Quiz draft cannot be applied until review issues are resolved.")

    assessment = preview["assessment"]
    assessment_insert = await db.execute(
        sa_text(
            """
            INSERT INTO assessments (
              title,
              description,
              class_id,
              type,
              total_points,
              passing_score,
              feedback_level,
              class_record_category,
              quarter,
              is_published,
              ai_origin,
              ai_generation_output_id
            )
            VALUES (
              :title,
              :description,
              :classId,
              :assessmentType,
              :totalPoints,
              :passingScore,
              :feedbackLevel,
              :classRecordCategory,
              :quarter,
              false,
              'ai_generated',
              :outputId
            )
            RETURNING id
            """
        ),
        {
            "title": assessment["title"],
            "description": assessment["description"],
            "classId": record["class_id"],
            "assessmentType": assessment["type"],
            "totalPoints": assessment["totalPoints"],
            "passingScore": assessment["passingScore"],
            "feedbackLevel": assessment["feedbackLevel"],
            "classRecordCategory": assessment["classRecordCategory"],
            "quarter": assessment["quarter"],
            "outputId": record["output_id"],
        },
    )
    assessment_id = assessment_insert.scalar_one()
    questions_created = 0
    for order, question in enumerate(preview["questions"], start=1):
        if not isinstance(question, dict):
            continue
        question_insert = await db.execute(
            sa_text(
                """
                INSERT INTO assessment_questions (
                  assessment_id,
                  type,
                  content,
                  points,
                  "order",
                  explanation,
                  concept_tags
                )
                VALUES (
                  :assessmentId,
                  :type,
                  :content,
                  :points,
                  :order,
                  :explanation,
                  :conceptTags
                )
                RETURNING id
                """
            ).bindparams(bindparam("conceptTags", type_=postgresql.JSONB)),
            {
                "assessmentId": assessment_id,
                "type": question.get("type") or source_filters.get("questionType") or "multiple_choice",
                "content": question.get("content"),
                "points": _safe_positive_int(question.get("points")),
                "order": order,
                "explanation": question.get("explanation"),
                "conceptTags": question.get("conceptTags") or [],
            },
        )
        questions_created += 1
        question_id = question_insert.scalar_one()
        for option_order, option in enumerate(question.get("options") or [], start=1):
            if not isinstance(option, dict):
                continue
            await db.execute(
                sa_text(
                    """
                    INSERT INTO assessment_question_options (
                      question_id,
                      text,
                      is_correct,
                      "order"
                    )
                    VALUES (
                      :questionId,
                      :text,
                      :isCorrect,
                      :order
                    )
                    """
                ),
                {
                    "questionId": question_id,
                    "text": option.get("text"),
                    "isCorrect": bool(option.get("isCorrect")),
                    "order": _safe_positive_int(option.get("order"), option_order),
                },
            )

    apply_result = {
        "assessmentId": str(assessment_id),
        "outputId": str(record["output_id"]),
        "questionsCreated": questions_created,
        "totalPoints": assessment["totalPoints"],
        "appliedAt": datetime.now(timezone.utc).isoformat(),
    }
    audit = structured_output.get("audit") if isinstance(structured_output.get("audit"), dict) else {}
    structured_output["audit"] = {**audit, "applyResult": apply_result}
    structured_output["assessmentId"] = str(assessment_id)
    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_outputs
            SET structured_output = :structuredOutput,
                updated_at = NOW()
            WHERE id = :outputId
            """
        ).bindparams(bindparam("structuredOutput", type_=postgresql.JSONB)),
        {
            "outputId": record["output_id"],
            "structuredOutput": structured_output,
        },
    )
    await db.execute(
        sa_text(
            """
            UPDATE ai_generation_jobs
            SET status = 'approved',
                error_message = NULL,
                updated_at = NOW()
            WHERE id = :jobId
            """
        ),
        {"jobId": job_id},
    )
    await db.commit()
    return {
        "jobId": job_id,
        "outputId": str(record["output_id"]),
        "alreadyApplied": False,
        "applyResult": apply_result,
        "preview": {
            **preview,
            "alreadyApplied": True,
            "applyResult": apply_result,
            "blockedReasons": [],
        },
    }


async def _build_quiz_blueprint(
    *,
    class_info: dict[str, Any],
    body: GenerateQuizDraftRequest,
    source_chunks: list[dict[str, Any]],
    existing_question_texts: set[str],
) -> dict[str, Any]:
    prompt = f"""
Build a quiz blueprint before writing any questions.

Subject: {class_info["subject_name"]} ({class_info["subject_code"]})
Grade level: {class_info["grade_level"] or "Unknown"}
Requested question count: {body.question_count}
Preferred question type: {body.question_type}
Teacher note: {body.teacher_note or "[None]"}

Existing question texts to avoid:
{_sanitize_prompt_text(chr(10).join(sorted(existing_question_texts)[:20]), max_chars=1200)}

Source evidence:
{_build_blueprint_evidence(source_chunks)}

Return valid JSON only. The blueprint must specify concept coverage and one question blueprint per requested question.
"""
    raw = await ollama_client.generate(
        prompt,
        QUIZ_GENERATION_SYSTEM_PROMPT,
        task="quiz_generation",
        response_format=QUIZ_BLUEPRINT_FORMAT,
    )
    try:
        parsed = _parse_quiz_blueprint_output(raw)
        parsed["blueprintSource"] = "model"
        return parsed
    except (json.JSONDecodeError, ValueError) as err:
        _log_blueprint_parse_failure(
            raw=raw,
            error=err,
            class_id=str(class_info["id"]),
            stage="quiz_blueprint_initial",
        )

    retry_prompt = f"""
Build a compact quiz blueprint.

Return one JSON object only. Do not include commentary. Keep every string short.

Subject: {class_info["subject_name"]} ({class_info["subject_code"]})
Grade level: {class_info["grade_level"] or "Unknown"}
Requested question count: {body.question_count}
Preferred question type: {body.question_type}

Existing question texts to avoid:
{_sanitize_prompt_text(chr(10).join(sorted(existing_question_texts)[:10]), max_chars=600)}

Compact source evidence:
{_build_blueprint_evidence(source_chunks, strict=True)}
"""
    retry_raw = await ollama_client.generate(
        retry_prompt,
        QUIZ_GENERATION_SYSTEM_PROMPT,
        task="quiz_generation",
        response_format=QUIZ_BLUEPRINT_FORMAT,
    )
    try:
        parsed = _parse_quiz_blueprint_output(retry_raw)
        parsed["blueprintSource"] = "model"
        return parsed
    except (json.JSONDecodeError, ValueError) as err:
        _log_blueprint_parse_failure(
            raw=retry_raw,
            error=err,
            class_id=str(class_info["id"]),
            stage="quiz_blueprint_retry",
        )
        return _fallback_quiz_blueprint(
            class_info=class_info,
            body=body,
            source_chunks=source_chunks,
        )


def _validate_generated_questions(
    questions: list[dict[str, Any]],
    source_chunks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    evidence_seed = " ".join(item["chunkText"].lower() for item in source_chunks[:10])
    validated: list[dict[str, Any]] = []
    for question in questions:
        content = (question.get("content") or "").strip()
        explanation = (question.get("explanation") or "").strip()
        tokens = set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", content.lower()))
        explanation_tokens = set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", explanation.lower()))
        grounded_overlap = len(tokens & set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", evidence_seed)))
        if grounded_overlap == 0 and explanation_tokens and len(explanation_tokens & set(re.findall(r"[a-zA-Z][a-zA-Z0-9]{3,}", evidence_seed))) == 0:
            continue
        validated.append(question)
    return validated
