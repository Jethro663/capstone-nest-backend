from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    session_id: str | None = Field(None, alias="sessionId")

    model_config = {"populate_by_name": True}


class ChatData(BaseModel):
    reply: str
    session_id: str = Field(alias="sessionId")
    model_used: str = Field(alias="modelUsed")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------


class ExtractRequest(BaseModel):
    file_id: str = Field(..., alias="fileId")

    model_config = {"populate_by_name": True}


class ApplyExtractionRequest(BaseModel):
    lesson_indices: list[int] | None = Field(None, alias="lessonIndices")

    model_config = {"populate_by_name": True}


class ExtractionBlockDto(BaseModel):
    type: str
    order: int
    content: dict[str, Any]
    metadata: dict[str, Any] | None = None


class ExtractionLessonDto(BaseModel):
    title: str
    description: str | None = None
    blocks: list[ExtractionBlockDto]


class UpdateExtractionRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    lessons: list[ExtractionLessonDto]


# ---------------------------------------------------------------------------
# Auth context (passed from NestJS proxy via headers)
# ---------------------------------------------------------------------------


class RequestUser(BaseModel):
    id: str
    email: str
    roles: list[str]
