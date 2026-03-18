from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any


class ImageAttachment(BaseModel):
    file_path: str | None = Field(default=None, alias="filePath")
    base64_data: str | None = Field(default=None, alias="base64Data")
    mime_type: str | None = Field(default=None, alias="mimeType")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
    session_id: str | None = Field(None, alias="sessionId")
    attachments: list[ImageAttachment] | None = None

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
# Grounded mentor + AI workflows
# ---------------------------------------------------------------------------


class MentorExplainRequest(BaseModel):
    attempt_id: str = Field(..., alias="attemptId")
    question_id: str = Field(..., alias="questionId")
    message: str | None = None
    attachments: list[ImageAttachment] | None = None

    model_config = {"populate_by_name": True}


class InterventionRecommendationRequest(BaseModel):
    note: str | None = None


class GenerateQuizDraftRequest(BaseModel):
    class_id: str = Field(..., alias="classId")
    lesson_ids: list[str] | None = Field(default=None, alias="lessonIds")
    extraction_ids: list[str] | None = Field(default=None, alias="extractionIds")
    title: str | None = None
    question_count: int = Field(default=5, alias="questionCount")
    question_type: str = Field(default="multiple_choice", alias="questionType")
    assessment_type: str = Field(default="quiz", alias="assessmentType")
    passing_score: int = Field(default=60, alias="passingScore")
    teacher_note: str | None = Field(default=None, alias="teacherNote")
    feedback_level: str = Field(default="standard", alias="feedbackLevel")
    class_record_category: str | None = Field(default=None, alias="classRecordCategory")
    quarter: str | None = None

    model_config = {"populate_by_name": True}


class StudentTutorBootstrapRequest(BaseModel):
    class_id: str | None = Field(default=None, alias="classId")

    model_config = {"populate_by_name": True}


class TutorRecommendationDto(BaseModel):
    id: str
    title: str
    reason: str
    focus_text: str = Field(alias="focusText")
    lesson_id: str | None = Field(default=None, alias="lessonId")
    assessment_id: str | None = Field(default=None, alias="assessmentId")
    question_id: str | None = Field(default=None, alias="questionId")
    source_chunk_id: str | None = Field(default=None, alias="sourceChunkId")

    model_config = {"populate_by_name": True}


class StudentTutorStartRequest(BaseModel):
    class_id: str = Field(..., alias="classId")
    recommendation: TutorRecommendationDto

    model_config = {"populate_by_name": True}


class StudentTutorMessageRequest(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    message: str = Field(..., max_length=2000)
    attachments: list[ImageAttachment] | None = None

    model_config = {"populate_by_name": True}


class StudentTutorAnswerRequest(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    answers: list[str] = Field(..., min_length=1, max_length=3)
    attachments: list[ImageAttachment] | None = None

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Auth context (passed from NestJS proxy via headers)
# ---------------------------------------------------------------------------


class RequestUser(BaseModel):
    id: str
    email: str
    roles: list[str]
