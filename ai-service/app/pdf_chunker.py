"""
PDF Chunker – Splits large PDF text into manageable chunks for
LLM extraction, preserving natural document boundaries.

Priority order for splitting:
  1. Heading-based (Lesson/Chapter/Module markers)
  2. Page-based (form-feed characters)
  3. Character-based (fixed size with overlap)
"""

from __future__ import annotations

import re
from dataclasses import dataclass

DEFAULT_MAX_CHUNK_SIZE = 8000
DEFAULT_OVERLAP_SIZE = 500
DEFAULT_SINGLE_CHUNK_THRESHOLD = 10000

HEADING_PATTERNS = [
    re.compile(r"^(?:lesson|chapter|module|unit|topic|part)\s+\d+", re.I | re.M),
    re.compile(r"^(?:lesson|chapter|module|unit|topic|part)\s*[:\-\u2013\u2014.]", re.I | re.M),
    re.compile(r"^[IVXLCDM]+\.\s+\S", re.M),
    re.compile(r"^[A-Z]\.\s+[A-Z]", re.M),
]


@dataclass
class TextChunk:
    index: int
    total: int
    text: str
    context_header: str
    split_method: str  # heading | page | character | single


@dataclass
class _RawChunk:
    text: str
    heading: str | None = None


def chunk_text(
    raw_text: str,
    *,
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
    overlap_size: int = DEFAULT_OVERLAP_SIZE,
    single_chunk_threshold: int = DEFAULT_SINGLE_CHUNK_THRESHOLD,
    document_title: str = "Uploaded Module",
) -> list[TextChunk]:
    text = raw_text.replace("\r\n", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    text = text.strip()

    if len(text) <= single_chunk_threshold:
        return [
            TextChunk(
                index=1,
                total=1,
                text=text,
                context_header=f'Document: "{document_title}"',
                split_method="single",
            )
        ]

    heading_chunks = _split_by_headings(text, max_chunk_size)
    if len(heading_chunks) > 1:
        return _format_chunks(heading_chunks, document_title, "heading")

    page_chunks = _split_by_pages(text, max_chunk_size)
    if len(page_chunks) > 1:
        return _format_chunks(page_chunks, document_title, "page")

    char_chunks = _split_by_characters(text, max_chunk_size, overlap_size)
    return _format_chunks(char_chunks, document_title, "character")


# ---------------------------------------------------------------------------


def _split_by_headings(text: str, max_size: int) -> list[_RawChunk]:
    lines = text.split("\n")
    sections: list[_RawChunk] = []
    current = _RawChunk(text="")

    for line in lines:
        is_heading = any(p.search(line.strip()) for p in HEADING_PATTERNS)
        if is_heading and current.text.strip():
            sections.append(current)
            current = _RawChunk(text=line + "\n", heading=line.strip())
        else:
            current.text += line + "\n"
            if current.heading is None and is_heading:
                current.heading = line.strip()

    if current.text.strip():
        sections.append(current)

    return _merge_and_split(sections, max_size)


def _split_by_pages(text: str, max_size: int) -> list[_RawChunk]:
    pages = re.split(r"\f+", text)
    if len(pages) <= 1:
        return [_RawChunk(text=text)]

    sections = [
        _RawChunk(text=page.strip(), heading=f"Page {i + 1}")
        for i, page in enumerate(pages)
        if page.strip()
    ]
    return _merge_and_split(sections, max_size)


def _split_by_characters(text: str, max_size: int, overlap: int) -> list[_RawChunk]:
    chunks: list[_RawChunk] = []
    start = 0

    while start < len(text):
        end = min(start + max_size, len(text))

        if end < len(text):
            nearest_para = text.rfind("\n\n", start, end)
            if nearest_para > start + max_size * 0.5:
                end = nearest_para + 2
            else:
                nearest_sent = text.rfind(". ", start, end)
                if nearest_sent > start + max_size * 0.5:
                    end = nearest_sent + 2

        chunks.append(
            _RawChunk(
                text=text[start:end].strip(),
                heading=f"Section {len(chunks) + 1}",
            )
        )
        start = end - (overlap if end < len(text) else 0)

    return chunks


def _merge_and_split(sections: list[_RawChunk], max_size: int) -> list[_RawChunk]:
    MIN_SECTION_SIZE = 500
    result: list[_RawChunk] = []
    buffer = _RawChunk(text="")

    for section in sections:
        if buffer.text and len(buffer.text) + len(section.text) > max_size:
            result.append(buffer)
            buffer = _RawChunk(text="")

        if not buffer.text:
            buffer = _RawChunk(text=section.text, heading=section.heading)
        else:
            buffer.text += "\n\n" + section.text
            if buffer.heading is None:
                buffer.heading = section.heading

        if len(buffer.text) >= max_size:
            result.append(buffer)
            buffer = _RawChunk(text="")

    if buffer.text.strip():
        if len(buffer.text) < MIN_SECTION_SIZE and result:
            result[-1].text += "\n\n" + buffer.text
        else:
            result.append(buffer)

    final: list[_RawChunk] = []
    for chunk in result:
        if len(chunk.text) > max_size * 1.5:
            subs = _split_by_characters(chunk.text, max_size, 200)
            for i, sc in enumerate(subs):
                final.append(
                    _RawChunk(
                        text=sc.text,
                        heading=chunk.heading if i == 0 else f"{chunk.heading} (cont.)",
                    )
                )
        else:
            final.append(chunk)

    return final


def _format_chunks(
    raw_chunks: list[_RawChunk],
    document_title: str,
    split_method: str,
) -> list[TextChunk]:
    total = len(raw_chunks)
    return [
        TextChunk(
            index=i + 1,
            total=total,
            text=c.text,
            context_header=_build_context_header(document_title, i + 1, total, c.heading, split_method),
            split_method=split_method,
        )
        for i, c in enumerate(raw_chunks)
    ]


def _build_context_header(
    title: str,
    chunk_index: int,
    total_chunks: int,
    section_heading: str | None,
    method: str,
) -> str:
    parts = [f'Document: "{title}"', f"Chunk {chunk_index} of {total_chunks}"]
    if section_heading:
        parts.append(f'Section: "{section_heading}"')
    if chunk_index > 1:
        parts.append("Continue extracting lessons from the previous chunk context")
    if chunk_index < total_chunks:
        parts.append("More content follows in subsequent chunks")
    return " | ".join(parts)


def merge_chunk_results(results: list[dict]) -> dict:
    if not results:
        return {"title": "Empty Extraction", "description": "", "lessons": []}
    if len(results) == 1:
        return results[0]

    merged: dict = {
        "title": results[0].get("title", "Extracted Module"),
        "description": results[0].get("description", ""),
        "lessons": [],
    }
    seen_titles: set[str] = set()

    for result in results:
        for lesson in result.get("lessons", []):
            normalized = " ".join(lesson.get("title", "").lower().strip().split())
            if normalized in seen_titles:
                existing = next(
                    (
                        l
                        for l in merged["lessons"]
                        if " ".join(l["title"].lower().strip().split()) == normalized
                    ),
                    None,
                )
                if existing and lesson.get("blocks"):
                    next_order = len(existing["blocks"])
                    for block in lesson["blocks"]:
                        existing["blocks"].append(
                            {**block, "order": next_order + block.get("order", 0)}
                        )
            else:
                seen_titles.add(normalized)
                merged["lessons"].append({**lesson})

    for lesson in merged["lessons"]:
        for idx, block in enumerate(lesson.get("blocks", [])):
            block["order"] = idx

    merged["description"] = (
        f"{merged['description']} "
        f"[Merged from {len(results)} chunk(s), {len(merged['lessons'])} lesson(s) total]"
    ).strip()

    return merged
