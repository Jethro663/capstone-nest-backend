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
    section_indices: list[int] | None = Field(None, alias="sectionIndices")
    lesson_indices: list[int] | None = Field(None, alias="lessonIndices")

    model_config = {"populate_by_name": True}


class ExtractionBlockDto(BaseModel):
    type: str
    order: int
    content: dict[str, Any] | str
    metadata: dict[str, Any] | None = None


class ExtractionLessonDto(BaseModel):
    title: str
    description: str | None = None
    blocks: list[ExtractionBlockDto]


class ExtractionAssessmentOptionDto(BaseModel):
    text: str
    is_correct: bool = Field(default=False, alias="isCorrect")
    order: int | None = None

    model_config = {"populate_by_name": True}


class ExtractionAssessmentQuestionDto(BaseModel):
    content: str
    type: str = "multiple_choice"
    points: int = 1
    order: int | None = None
    explanation: str | None = None
    image_url: str | None = Field(default=None, alias="imageUrl")
    concept_tags: list[str] | None = Field(default=None, alias="conceptTags")
    options: list[ExtractionAssessmentOptionDto] | None = None

    model_config = {"populate_by_name": True}


class ExtractionAssessmentDraftDto(BaseModel):
    title: str
    description: str | None = None
    type: str = "quiz"
    passing_score: int = Field(default=60, alias="passingScore")
    feedback_level: str = Field(default="standard", alias="feedbackLevel")
    question_type: str = Field(default="multiple_choice", alias="questionType")
    questions: list[ExtractionAssessmentQuestionDto] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class ExtractionSectionDto(BaseModel):
    title: str
    description: str | None = None
    order: int | None = None
    lesson_blocks: list[ExtractionBlockDto] = Field(default_factory=list, alias="lessonBlocks")
    assessment_draft: ExtractionAssessmentDraftDto | None = Field(
        default=None,
        alias="assessmentDraft",
    )
    confidence: float | None = None

    model_config = {"populate_by_name": True}


class UpdateExtractionRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    sections: list[ExtractionSectionDto] | None = None
    lessons: list[ExtractionLessonDto] | None = None

    model_config = {"populate_by_name": True}


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


class DemoInterventionPlanRequest(BaseModel):
    subject_id: str = Field(..., alias="subjectId")
    quarter_exam_score: int = Field(..., alias="quarterExamScore")
    weak_concepts: list[str] = Field(default_factory=list, alias="weakConcepts")
    module_scores: list[int] | None = Field(default=None, alias="moduleScores")

    model_config = {"populate_by_name": True}


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


class JaPracticeGenerateRequest(BaseModel):
    class_id: str = Field(..., alias="classId")
    question_count: int = Field(default=10, alias="questionCount")
    recommendation: TutorRecommendationDto | None = None
    allowed_lesson_ids: list[str] | None = Field(default=None, alias="allowedLessonIds")
    allowed_assessment_ids: list[str] | None = Field(
        default=None,
        alias="allowedAssessmentIds",
    )

    model_config = {"populate_by_name": True}


class JaAskHistoryMessageDto(BaseModel):
    role: str
    content: str


class JaAskResponseRequest(BaseModel):
    class_id: str = Field(..., alias="classId")
    thread_id: str = Field(..., alias="threadId")
    message: str = Field(..., min_length=1, max_length=2000)
    quick_action: str | None = Field(default=None, alias="quickAction")
    history: list[JaAskHistoryMessageDto] | None = None
    allowed_lesson_ids: list[str] | None = Field(default=None, alias="allowedLessonIds")
    allowed_assessment_ids: list[str] | None = Field(
        default=None,
        alias="allowedAssessmentIds",
    )

    model_config = {"populate_by_name": True}


class JaReviewGenerateRequest(BaseModel):
    class_id: str = Field(..., alias="classId")
    attempt_id: str = Field(..., alias="attemptId")
    question_count: int = Field(default=10, alias="questionCount")
    allowed_lesson_ids: list[str] | None = Field(default=None, alias="allowedLessonIds")
    allowed_assessment_ids: list[str] | None = Field(
        default=None,
        alias="allowedAssessmentIds",
    )

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Auth context (passed from NestJS proxy via headers)
# ---------------------------------------------------------------------------


class RequestUser(BaseModel):
    id: str
    email: str
    roles: list[str]
