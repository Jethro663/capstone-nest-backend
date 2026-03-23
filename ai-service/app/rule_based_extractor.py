"""
Rule-Based Module Extractor – Fallback when Ollama is offline.
"""

from __future__ import annotations

import re
from typing import Any

HEADING_RE = re.compile(
    r"^(?:"
    r"(?:lesson|chapter|module|unit|topic|part)\s*\d*\s*[:\-\u2013\u2014.]\s*(.+)"
    r"|([IVXLCDM]+\.\s+.+)"
    r"|([A-Z]\.\s+.+)"
    r")",
    re.I | re.M,
)

QUESTION_LINE_RE = re.compile(r"^\s*\d+[.)]\s+.+\??\s*$")
OPTION_RE = re.compile(r"^\s*[\(\[]?[a-dA-D][.):\]]\s*.+")


def extract_with_rules(
    raw_text: str,
    *,
    source_method: str = "rule_based",
    chunk_index: int | None = None,
    page_start: int | None = None,
    page_end: int | None = None,
    confidence: float = 0.45,
) -> dict[str, Any]:
    cleaned = raw_text.replace("\r\n", "\n").replace("\f", "\n\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    lines = cleaned.split("\n")

    sections: list[dict[str, Any]] = []
    current: dict[str, Any] = {"heading": "Untitled Section", "body_lines": []}

    for line in lines:
        match = HEADING_RE.match(line.strip())
        if match:
            if current["body_lines"]:
                sections.append(current)
            current = {
                "heading": (match.group(1) or match.group(2) or match.group(3) or line).strip(),
                "body_lines": [],
            }
        else:
            current["body_lines"].append(line)

    if current["body_lines"]:
        sections.append(current)

    if not sections:
        sections.append({"heading": "Extracted Content", "body_lines": lines})

    lessons = []
    for section in sections:
        blocks = build_blocks_from_text(
            "\n".join(section["body_lines"]),
            source_method=source_method,
            chunk_index=chunk_index,
            page_start=page_start,
            page_end=page_end,
            confidence=confidence,
        )
        lessons.append({"title": section["heading"], "description": "", "blocks": blocks})

    first_non_empty = next((l.strip() for l in lines if l.strip()), "Extracted Module")

    return {
        "title": first_non_empty[:200],
        "description": f"Auto-extracted (rule-based) from PDF — {len(sections)} section(s) detected.",
        "lessons": lessons,
    }


def build_blocks_from_text(
    body_text: str,
    *,
    source_method: str = "rule-based",
    chunk_index: int | None = None,
    page_start: int | None = None,
    page_end: int | None = None,
    confidence: float = 0.6,
) -> list[dict[str, Any]]:
    return _build_blocks(
        body_text.split("\n"),
        source_method=source_method,
        chunk_index=chunk_index,
        page_start=page_start,
        page_end=page_end,
        confidence=confidence,
    )


def _build_blocks(
    body_lines: list[str],
    *,
    source_method: str = "rule-based",
    chunk_index: int | None = None,
    page_start: int | None = None,
    page_end: int | None = None,
    confidence: float = 0.6,
) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    order = 0
    text_buffer: list[str] = []
    question_buffer: list[str] = []
    in_question = False

    provenance = {
        "source": source_method,
        "chunkIndex": chunk_index,
        "pageStart": page_start,
        "pageEnd": page_end,
        "confidence": round(confidence, 4),
    }

    def flush_text():
        nonlocal order
        joined = "\n".join(text_buffer).strip()
        if joined:
            blocks.append({
                "type": "text",
                "order": order,
                "content": {"text": joined},
                "metadata": dict(provenance),
            })
            order += 1
        text_buffer.clear()

    def flush_question():
        nonlocal order, in_question
        joined = "\n".join(question_buffer).strip()
        if joined:
            blocks.append({
                "type": "question",
                "order": order,
                "content": {"text": joined},
                "metadata": {**provenance, "detectedAs": "question-pattern"},
            })
            order += 1
        question_buffer.clear()
        in_question = False

    for line in body_lines:
        trimmed = line.strip()

        if not trimmed:
            if in_question:
                flush_question()
            continue

        if QUESTION_LINE_RE.match(trimmed):
            if not in_question:
                flush_text()
            in_question = True
            question_buffer.append(trimmed)
            continue

        if in_question and OPTION_RE.match(trimmed):
            question_buffer.append(trimmed)
            continue

        if in_question:
            flush_question()

        text_buffer.append(trimmed)

    if in_question:
        flush_question()
    flush_text()

    return blocks
