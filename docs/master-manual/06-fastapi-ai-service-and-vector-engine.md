---
title: "Chapter 06: FastAPI AI Service and Vector Engine"
subtitle: "Nexora Master Technical & Maintenance Service Manual"
date: "2026-07-13"
subject: "Repository snapshot 3d0c93e"
---

# Chapter 06 — FastAPI AI Service and Vector Engine

> **Snapshot authority.** This chapter describes commit `3d0c93e5270d44b9912deeae0218e95c9a311dd5` on branch `developement`. Source paths named below are the authority if the implementation changes after 2026-07-13.

This chapter documents the assistive AI execution process: every FastAPI route and Pydantic contract, runtime configuration, model selection, prompts, retrieval and indexing, vector storage, background-execution limits, guardrails, error behavior, and the backend trust boundary.

## Source map

- `ai-service/app/`
- `ai-service/tests/`
- `ai-service/requirements.txt`
- `backend/src/modules/ai-mentor/`
- `backend/src/modules/rag/`
- `backend/src/modules/file-upload/`
- `backend/src/drizzle/schema/rag.schema.ts`

## AI authority boundary

```mermaid
flowchart LR
  USER[Teacher or student] --> CLIENT[Web or mobile]
  CLIENT --> API[NestJS public API and RBAC]
  API --> DB[(PostgreSQL durable intent)]
  API --> Q[(BullMQ and Redis)]
  API -->|internal secret and user headers| FASTAPI[FastAPI execution service]
  Q --> WORKER[NestJS queue worker]
  WORKER -->|internal execution| FASTAPI
  FASTAPI --> RETRIEVAL[Retrieval and indexing services]
  RETRIEVAL --> DB
  FASTAPI --> LOCAL[Ollama local runtime]
  FASTAPI --> CLOUD[Optional OpenAI-compatible cloud runtime]
  FASTAPI --> API
  API --> APPROVAL[Backend-owned approval and official mutation]
```

- FastAPI is an assistive compute and retrieval boundary, not the public auth authority and not the owner of official grades or role state.
- Durable teacher generation, extraction, content chunks, embeddings, and outputs live in PostgreSQL; BullMQ owns restart-safe orchestration and retries.
- The process also holds bounded runtime-only maps and concurrency controls. Those improve coordination within one process but are not durable job authority.
- Direct browser or mobile access is outside the supported architecture.

## Runtime configuration dictionary

> **Exhaustive inventory rule.** The 40 AI settings below were extracted from `ai-service/app/config.py` at commit `3d0c93e`. A later source change requires regenerating or manually reconciling this chapter.

| Setting | Type | Default and environment alias |
| --- | --- | --- |
| database_url | str | 'postgresql+asyncpg://postgres:CHANGE_ME_DB_PASSWORD@localhost:5432/capstone' |
| ollama_base_url | str | 'http://localhost:11434' |
| ollama_text_model | str | Field(default='qwen2.5:3b', validation_alias=AliasChoices('OLLAMA_TEXT_MODEL', 'OLLAMA_MODEL')) |
| ollama_vision_model | str | Field(default='gemma3:4b', validation_alias='OLLAMA_VISION_MODEL') |
| ollama_embed_model | str | 'nomic-embed-text' |
| embedding_dimensions | int | 768 |
| ollama_timeout_chat_s | int | Field(default=60, validation_alias=AliasChoices('OLLAMA_TIMEOUT_CHAT_S', 'OLLAMA_TIMEOUT')) |
| ollama_timeout_extraction_s | int | Field(default=240, validation_alias=AliasChoices('OLLAMA_TIMEOUT_EXTRACTION_S', 'OLLAMA_TIMEOUT')) |
| ollama_timeout_quiz_generation_s | int | Field(default=150, validation_alias=AliasChoices('OLLAMA_TIMEOUT_QUIZ_GENERATION_S', 'OLLAMA_TIMEOUT_QUIZ_S', 'OLLAMA_TIMEOUT')) |
| ollama_keep_alive | str | '15m' |
| upload_dir | str | '../backend/uploads' |
| backend_internal_url | str | '' |
| backend_upload_fetch_timeout_s | int | 60 |
| max_raw_text | int | 50000 |
| db_pool_size | int | Field(default=10, validation_alias='DB_POOL_SIZE') |
| db_max_overflow | int | Field(default=15, validation_alias='DB_MAX_OVERFLOW') |
| db_pool_timeout_s | int | Field(default=30, validation_alias='DB_POOL_TIMEOUT_S') |
| db_pool_recycle_s | int | Field(default=1800, validation_alias='DB_POOL_RECYCLE_S') |
| db_pool_pre_ping | bool | Field(default=True, validation_alias='DB_POOL_PRE_PING') |
| log_level | str | 'INFO' |
| ai_tutor_max_inflight | int | Field(default=8, validation_alias='AI_TUTOR_MAX_INFLIGHT') |
| ai_tutor_reject_status | int | Field(default=429, validation_alias='AI_TUTOR_REJECT_STATUS') |
| ai_tutor_retry_after_s | int | Field(default=5, validation_alias='AI_TUTOR_RETRY_AFTER_S') |
| ai_teacher_bg_max_concurrency | int | Field(default=2, validation_alias='AI_TEACHER_BG_MAX_CONCURRENCY') |
| ai_extraction_bg_max_concurrency | int | Field(default=1, validation_alias='AI_EXTRACTION_BG_MAX_CONCURRENCY') |
| ai_service_shared_secret | str | '' |
| ai_degraded_allowed | bool | False |
| retrieval_min_final_score | float | Field(default=2.2, validation_alias='RETRIEVAL_MIN_FINAL_SCORE') |
| retrieval_min_semantic_score | float | Field(default=0.2, validation_alias='RETRIEVAL_MIN_SEMANTIC_SCORE') |
| retrieval_min_distinct_sources | int | Field(default=1, validation_alias='RETRIEVAL_MIN_DISTINCT_SOURCES') |
| ai_cloud_fallback_enabled | bool | Field(default=False, validation_alias='AI_CLOUD_FALLBACK_ENABLED') |
| ai_runtime_mode | str | Field(default='auto', validation_alias=AliasChoices('AI_RUNTIME_MODE', 'ai_runtime_mode')) |
| ai_cloud_fallback_provider | str | Field(default='openai', validation_alias='AI_CLOUD_FALLBACK_PROVIDER') |
| ai_cloud_fallback_model | str | Field(default='gpt-4o-mini', validation_alias=AliasChoices('AI_CLOUD_FALLBACK_MODEL', 'OPENROUTER_TEXT_MODEL')) |
| ai_cloud_fallback_vision_model | str | Field(default='', validation_alias='OPENROUTER_VISION_MODEL') |
| ai_cloud_fallback_embedding_model | str | Field(default='google/gemini-embedding-2-preview', validation_alias='OPENROUTER_EMBEDDING_MODEL') |
| ai_cloud_fallback_api_key | str | Field(default='', validation_alias=AliasChoices('AI_CLOUD_FALLBACK_API_KEY', 'OPENROUTER_API_KEY')) |
| ai_cloud_fallback_base_url | str | Field(default='https://api.openai.com/v1', validation_alias=AliasChoices('AI_CLOUD_FALLBACK_BASE_URL', 'OPENROUTER_BASE_URL')) |
| ai_cloud_fallback_referer | str | Field(default='', validation_alias='OPENROUTER_HTTP_REFERER') |
| ai_cloud_fallback_title | str | Field(default='', validation_alias='OPENROUTER_X_TITLE') |

## Runtime and model selection

| Task profile | Default local model or provider | Timeout or limit | Fallback behavior |
| --- | --- | --- | --- |
| General chat and grounded tutor text | qwen2.5:3b through Ollama | 60-second chat timeout; tutor maximum eight in-flight requests | Cloud fallback is disabled by default and requires explicit compatible-runtime configuration. |
| Vision input | gemma3:4b through Ollama | Uses the chat execution boundary | Attachment validation and media preprocessing occur before model invocation. |
| Embeddings | nomic-embed-text through Ollama | Exactly 768 dimensions | Configured cloud embedding model is google/gemini-embedding-2-preview when cloud embedding is deliberately enabled. |
| Module extraction | Configured local text or vision runtime | 240-second extraction timeout; extraction background concurrency one | Rule-based and structured repair paths supplement model extraction. |
| Quiz generation | Configured local text runtime | 150-second quiz-generation timeout | Schema validation and repair prompts run before accepting the draft. |
| Teacher generation | Configured local text runtime | Teacher background concurrency two | Optional cloud runtime fallback model defaults to gpt-4o-mini. |

- Runtime mode defaults to auto. The adapter chooses the configured local or OpenAI-compatible provider according to settings and task support.
- Cloud fallback must be explicitly enabled. A configured API key alone must not silently broaden data egress.
- Keep embedding model, dimensions, and stored embedding_model identity aligned during any provider migration.

## Complete FastAPI route catalog

> **Exhaustive inventory rule.** The 60 FastAPI routes below were extracted from `ai-service/app/**/*.py` at commit `3d0c93e`. A later source change requires regenerating or manually reconciling this chapter.

At this snapshot, 13 routes explicitly depend on require_internal_service and 43 depend on forwarded current-user context. Operational routes without an auth dependency still require network-level exposure controls.

### Route source: ai-service/app/main.py

| Method | Path | Access | Handler | Inputs and dependencies | Return annotation | Status | Line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POST | /chat | Forwarded authenticated user; secret enforced when configured | chat | body: ChatRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 1901 |
| POST | /admin/chat | Forwarded authenticated user; secret enforced when configured | admin_chat | body: AdminChatRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2025 |
| POST | /mentor/explain | Forwarded authenticated user; secret enforced when configured | mentor_explain | body: MentorExplainRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2141 |
| GET | /student/ja/practice/bootstrap | Forwarded authenticated user; secret enforced when configured | ja_practice_bootstrap | class_id: str \| None = Query(None, alias='classId'); user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2167 |
| POST | /student/ja/practice/sessions/generate | Forwarded authenticated user; secret enforced when configured | ja_practice_generate | body: JaPracticeGenerateRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2181 |
| GET | /student/ja/ask/bootstrap | Forwarded authenticated user; secret enforced when configured | ja_ask_bootstrap | class_id: str \| None = Query(None, alias='classId'); user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2203 |
| POST | /student/ja/ask/respond | Forwarded authenticated user; secret enforced when configured | ja_ask_respond | body: JaAskResponseRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2217 |
| GET | /student/ja/review/bootstrap | Forwarded authenticated user; secret enforced when configured | ja_review_bootstrap | class_id: str \| None = Query(None, alias='classId'); user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2246 |
| POST | /student/ja/review/sessions/generate | Forwarded authenticated user; secret enforced when configured | ja_review_generate | body: JaReviewGenerateRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2260 |
| GET | /student/tutor/bootstrap | Forwarded authenticated user; secret enforced when configured | student_tutor_bootstrap | class_id: str \| None = Query(None, alias='classId'); user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2287 |
| POST | /student/tutor/session | Forwarded authenticated user; secret enforced when configured | student_tutor_start | body: StudentTutorStartRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2301 |
| GET | /student/tutor/session/{session_id} | Forwarded authenticated user; secret enforced when configured | student_tutor_get_session | session_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2321 |
| POST | /student/tutor/session/{session_id}/message | Forwarded authenticated user; secret enforced when configured | student_tutor_message | session_id: str; body: StudentTutorMessageRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2335 |
| POST | /student/tutor/session/{session_id}/answers | Forwarded authenticated user; secret enforced when configured | student_tutor_answers | session_id: str; body: StudentTutorAnswerRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2359 |
| GET | /health | Operational endpoint; network exposure must be controlled | health | No handler arguments | inferred | Framework default | 2388 |
| GET | /metrics | Operational endpoint; network exposure must be controlled | metrics | No handler arguments | inferred | Framework default | 2422 |
| GET | /live | No authentication dependency extracted; deploy only behind the intended private boundary | live | No handler arguments | inferred | Framework default | 2427 |
| GET | /ready | Operational endpoint; network exposure must be controlled | ready | db: AsyncSession = Depends(get_db) | inferred | Framework default | 2441 |
| POST | /demo/intervention-plan | Internal service secret required | generate_demo_intervention_plan | body: DemoInterventionPlanRequest; _auth: None = Depends(require_internal_service) | inferred | Framework default | 2458 |
| GET | /internal/retrieval/preview | Internal service secret required | internal_retrieval_preview | class_id: str = Query([required], alias='classId'); query_text: str = Query([required], alias='query'); policy: str = Query('general'); top_k: int = Query(8, alias='topK'); subject_key: str \| None = Query(None, alias='subjectKey'); grade_level: str \| None = Query(None, alias='gradeLevel'); include_library: bool = Query(True, alias='includeLibrary'); db: AsyncSession = Depends(get_db); _auth: None = Depends(require_internal_service) | inferred | Framework default | 2608 |
| GET | /internal/extractions/{extraction_id}/audit | Internal service secret required | internal_extraction_audit | extraction_id: str; db: AsyncSession = Depends(get_db); _auth: None = Depends(require_internal_service) | inferred | Framework default | 2644 |
| GET | /index/classes/{class_id}/status | Forwarded authenticated user; secret enforced when configured | get_index_class_status | class_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2689 |
| POST | /index/classes/{class_id} | Forwarded authenticated user; secret enforced when configured | index_class | class_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2720 |
| POST | /internal/index/classes/{class_id} | Internal service secret required | internal_index_class | class_id: str; payload: dict[str, Any] \| None = Body(default=None); _authorized: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2746 |
| POST | /internal/index/library-files/{file_id} | Internal service secret required | internal_index_library_file | file_id: str; payload: dict[str, Any] \| None = Body(default=None); _authorized: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2764 |
| DELETE | /internal/index/library-files/{file_id}/chunks | Internal service secret required | internal_delete_library_file_chunks | file_id: str; _authorized: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2782 |
| POST | /internal/index/library/backfill | Internal service secret required | internal_backfill_library_index | payload: dict[str, Any] \| None = Body(default=None); _authorized: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2796 |
| POST | /internal/index/backfill | Internal service secret required | internal_backfill_index | payload: dict[str, Any] \| None = Body(default=None); _authorized: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 2813 |
| GET | /extractions/{extraction_id}/status | Forwarded authenticated user; secret enforced when configured | get_extraction_status | extraction_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 3409 |
| GET | /extractions | Forwarded authenticated user; secret enforced when configured | list_extractions | class_id: str = Query([required], alias='classId'); user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 3462 |
| GET | /extractions/{extraction_id} | Forwarded authenticated user; secret enforced when configured | get_extraction | extraction_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 3523 |
| PATCH | /extractions/{extraction_id} | Forwarded authenticated user; secret enforced when configured | update_extraction | extraction_id: str; body: UpdateExtractionRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 3568 |
| POST | /extractions/{extraction_id}/apply/preview | Forwarded authenticated user; secret enforced when configured | preview_apply_extraction | extraction_id: str; body: ApplyExtractionRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 3773 |
| POST | /extractions/{extraction_id}/apply | Forwarded authenticated user; secret enforced when configured | apply_extraction | extraction_id: str; body: ApplyExtractionRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | 201 | 3813 |
| POST | /extractions/{extraction_id}/cancel | Forwarded authenticated user; secret enforced when configured | cancel_extraction | extraction_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4266 |
| POST | /extractions/{extraction_id}/retry | Forwarded authenticated user; secret enforced when configured | retry_extraction | extraction_id: str; body: RetryExtractionRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | 202 | 4297 |
| DELETE | /extractions/{extraction_id} | Forwarded authenticated user; secret enforced when configured | delete_extraction | extraction_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4348 |
| GET | /history | Forwarded authenticated user; secret enforced when configured | interaction_history | user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4389 |
| GET | /admin/history | Forwarded authenticated user; secret enforced when configured | admin_chat_history | user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4410 |
| GET | /admin/sessions/{session_id} | Forwarded authenticated user; secret enforced when configured | admin_chat_session | session_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4438 |
| POST | /teacher/interventions/{case_id}/jobs | Forwarded authenticated user; secret enforced when configured | queue_intervention_recommendation_job | case_id: str; body: InterventionRecommendationRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | 202 | 4476 |
| POST | /teacher/quizzes/jobs | Forwarded authenticated user; secret enforced when configured | queue_teacher_quiz_draft_job | body: GenerateQuizDraftRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | 202 | 4534 |
| POST | /teacher/lesson-plans/jobs | Forwarded authenticated user; secret enforced when configured | queue_teacher_lesson_plan_job | body: GenerateLessonPlanRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | 202 | 4604 |
| POST | /internal/teacher/lesson-plans/jobs/{job_id}/run | Internal service secret required | run_teacher_lesson_plan_job | job_id: str; meta: dict[str, Any] \| None = Body(None); _auth: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4664 |
| POST | /internal/teacher/quizzes/jobs/{job_id}/run | Internal service secret required | run_teacher_quiz_job | job_id: str; meta: dict[str, Any] \| None = Body(None); _auth: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4761 |
| POST | /internal/teacher/interventions/jobs/{job_id}/run | Internal service secret required | run_teacher_intervention_job | job_id: str; meta: dict[str, Any] \| None = Body(None); _auth: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4850 |
| PATCH | /teacher/lesson-plans/jobs/{job_id}/draft | Forwarded authenticated user; secret enforced when configured | update_teacher_lesson_plan_draft | job_id: str; body: UpdateLessonPlanDraftRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4924 |
| PATCH | /teacher/quizzes/jobs/{job_id}/draft | Forwarded authenticated user; secret enforced when configured | update_teacher_quiz_draft | job_id: str; body: UpdateQuizDraftRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 4966 |
| POST | /teacher/quizzes/jobs/{job_id}/apply/preview | Forwarded authenticated user; secret enforced when configured | preview_teacher_quiz_draft_apply | job_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5008 |
| POST | /teacher/quizzes/jobs/{job_id}/apply | Forwarded authenticated user; secret enforced when configured | apply_teacher_quiz_draft | job_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5027 |
| POST | /teacher/quizzes/jobs/{job_id}/retry | Forwarded authenticated user; secret enforced when configured | retry_teacher_quiz_draft_job | job_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | 202 | 5057 |
| POST | /teacher/quizzes/jobs/{job_id}/cancel | Forwarded authenticated user; secret enforced when configured | cancel_teacher_quiz_draft_job | job_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5092 |
| GET | /teacher/jobs/{job_id} | Forwarded authenticated user; secret enforced when configured | get_teacher_ai_job_status | job_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5106 |
| GET | /teacher/jobs/{job_id}/result | Forwarded authenticated user; secret enforced when configured | get_teacher_ai_job_result | job_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5136 |
| DELETE | /teacher/jobs/{job_id} | Forwarded authenticated user; secret enforced when configured | delete_teacher_ai_job | job_id: str; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5185 |
| POST | /teacher/interventions/{case_id}/recommend | Forwarded authenticated user; secret enforced when configured | recommend_intervention | case_id: str; body: InterventionRecommendationRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5245 |
| POST | /teacher/quizzes/generate-draft | Forwarded authenticated user; secret enforced when configured | teacher_generate_quiz_draft | body: GenerateQuizDraftRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | Framework default | 5270 |

### Route source: ai-service/app/routers/extractions.py

| Method | Path | Access | Handler | Inputs and dependencies | Return annotation | Status | Line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POST | /extract | Forwarded authenticated user; secret enforced when configured | extract_module | body: ExtractRequest; user: RequestUser = Depends(get_current_user); db: AsyncSession = Depends(get_db) | inferred | 202 | 50 |
| POST | /internal/extractions/{extraction_id}/run | Internal service secret required | run_internal_extraction | extraction_id: str; meta: dict[str, Any] \| None = Body(None); _auth: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 83 |
| POST | /internal/extractions/{extraction_id}/fail | Internal service secret required | fail_pending_internal_extraction | extraction_id: str; payload: dict[str, Any] \| None = Body(None); _auth: None = Depends(require_internal_service); db: AsyncSession = Depends(get_db) | inferred | Framework default | 160 |

## Complete Pydantic contract dictionary

> **Exhaustive inventory rule.** The 37 Pydantic model classes below were extracted from `ai-service/app/**/*.py` at commit `3d0c93e`. A later source change requires regenerating or manually reconciling this chapter.

### ImageAttachment

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| file_path | str \| None | Field(default=None, alias='filePath') |
| base64_data | str \| None | Field(default=None, alias='base64Data') |
| mime_type | str \| None | Field(default=None, alias='mimeType') |

### ChatRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| message | str | Field([required], max_length=2000) |
| session_id | str \| None | Field(None, alias='sessionId') |
| attachments | list[ImageAttachment] \| None | None |

### ChatData

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| reply | str | Required |
| session_id | str | Field(alias='sessionId') |
| model_used | str | Field(alias='modelUsed') |

### AdminAnalyticsSource

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| source | str | Required |
| filters | dict[str, Any] | Field(default_factory=dict) |
| window | str \| None | None |

### AdminAnalyticsChartSeries

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| name | str | Required |
| data | list[float \| int] | Required |

### AdminAnalyticsChart

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| type | str | Required |
| title | str | Required |
| labels | list[str] | Required |
| series | list[AdminAnalyticsChartSeries] | Required |
| y_axis_label | str \| None | Field(default=None, alias='yAxisLabel') |
| x_axis_label | str \| None | Field(default=None, alias='xAxisLabel') |

### AdminChatRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| message | str | Field([required], max_length=2000) |
| session_id | str \| None | Field(None, alias='sessionId') |
| context | dict[str, Any] | Required |

### ExtractRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| file_id | str | Field([required], alias='fileId') |
| target_section_count | Literal[3, 4, 5] | Field([required], alias='targetSectionCount') |
| extraction_style | Literal['faithful', 'clean', 'student_friendly'] | Field(default='clean', alias='extractionStyle') |

### RetryExtractionRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| target_section_count | Literal[3, 4, 5] \| None | Field(default=None, alias='targetSectionCount') |
| extraction_style | Literal['faithful', 'clean', 'student_friendly'] \| None | Field(default=None, alias='extractionStyle') |

### ApplyExtractionRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| section_indices | list[int] \| None | Field(None, alias='sectionIndices') |
| lesson_indices | list[int] \| None | Field(None, alias='lessonIndices') |

### ExtractionBlockDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| type | str | Required |
| order | int | Required |
| content | dict[str, Any] \| str | Required |
| metadata | dict[str, Any] \| None | None |

### ExtractionLessonDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| title | str | Required |
| description | str \| None | None |
| blocks | list[ExtractionBlockDto] | Required |

### ExtractionAssessmentOptionDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| text | str | Required |
| is_correct | bool | Field(default=False, alias='isCorrect') |
| order | int \| None | None |

### ExtractionAssessmentQuestionDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| content | str | Required |
| type | str | 'multiple_choice' |
| points | int | 1 |
| order | int \| None | None |
| explanation | str \| None | None |
| image_url | str \| None | Field(default=None, alias='imageUrl') |
| concept_tags | list[str] \| None | Field(default=None, alias='conceptTags') |
| options | list[ExtractionAssessmentOptionDto] \| None | None |

### ExtractionAssessmentDraftDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| title | str | Required |
| description | str \| None | None |
| type | str | 'quiz' |
| passing_score | int | Field(default=60, alias='passingScore') |
| feedback_level | str | Field(default='standard', alias='feedbackLevel') |
| question_type | str | Field(default='multiple_choice', alias='questionType') |
| questions | list[ExtractionAssessmentQuestionDto] | Field(default_factory=list) |

### ExtractionMediaCandidateDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| section_index | int | Field(alias='sectionIndex') |
| score | float | Required |
| explicit_match | bool \| None | Field(default=None, alias='explicitMatch') |
| score_breakdown | dict[str, float] \| None | Field(default=None, alias='scoreBreakdown') |

### ExtractionMediaAssetDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| id | str | Required |
| url | str | Required |
| page_number | int \| None | Field(default=None, alias='pageNumber') |
| caption | str \| None | None |
| anchor_text | str \| None | Field(default=None, alias='anchorText') |
| keywords | list[str] | Field(default_factory=list) |
| figure_references | list[str] | Field(default_factory=list, alias='figureReferences') |
| selected_section_index | int \| None | Field(default=None, alias='selectedSectionIndex') |
| assignment_confidence | float \| None | Field(default=None, alias='assignmentConfidence') |
| assignment_breakdown | dict[str, float] \| None | Field(default=None, alias='assignmentBreakdown') |
| candidate_sections | list[ExtractionMediaCandidateDto] | Field(default_factory=list, alias='candidateSections') |
| teacher_reviewed | bool | Field(default=False, alias='teacherReviewed') |
| review_state | str \| None | Field(default=None, alias='reviewState') |

### ExtractionSectionDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| title | str | Required |
| description | str \| None | None |
| order | int \| None | None |
| lesson_blocks | list[ExtractionBlockDto] | Field(default_factory=list, alias='lessonBlocks') |
| assessment_draft | ExtractionAssessmentDraftDto \| None | Field(default=None, alias='assessmentDraft') |
| confidence | float \| None | None |
| graph_keywords | list[str] | Field(default_factory=list, alias='graphKeywords') |
| figure_references | list[str] | Field(default_factory=list, alias='figureReferences') |

### UpdateExtractionRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| title | str \| None | None |
| description | str \| None | None |
| sections | list[ExtractionSectionDto] \| None | None |
| lessons | list[ExtractionLessonDto] \| None | None |
| review_issues | list[dict[str, Any]] \| None | Field(default=None, alias='reviewIssues') |
| review_state | str \| None | Field(default=None, alias='reviewState') |
| media_assets | list[ExtractionMediaAssetDto] \| None | Field(default=None, alias='mediaAssets') |

### MentorExplainRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| attempt_id | str | Field([required], alias='attemptId') |
| question_id | str | Field([required], alias='questionId') |
| message | str \| None | None |
| attachments | list[ImageAttachment] \| None | None |

### InterventionRecommendationRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| note | str \| None | None |

### DemoInterventionPlanRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| subject_id | str | Field([required], alias='subjectId') |
| quarter_exam_score | int | Field([required], alias='quarterExamScore') |
| weak_concepts | list[str] | Field(default_factory=list, alias='weakConcepts') |
| module_scores | list[int] \| None | Field(default=None, alias='moduleScores') |

### GenerateQuizDraftRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| class_id | str | Field([required], alias='classId') |
| lesson_ids | list[str] \| None | Field(default=None, alias='lessonIds') |
| extraction_ids | list[str] \| None | Field(default=None, alias='extractionIds') |
| title | str \| None | None |
| question_count | int | Field(default=5, alias='questionCount') |
| question_type | str | Field(default='multiple_choice', alias='questionType') |
| assessment_type | str | Field(default='quiz', alias='assessmentType') |
| passing_score | int | Field(default=60, alias='passingScore') |
| teacher_note | str \| None | Field(default=None, alias='teacherNote') |
| feedback_level | str | Field(default='standard', alias='feedbackLevel') |
| class_record_category | str \| None | Field(default=None, alias='classRecordCategory') |
| quarter | str \| None | None |
| source_policy | str | Field(default='published_default', alias='sourcePolicy') |
| allow_draft_sources | bool | Field(default=False, alias='allowDraftSources') |
| retry_of_job_id | str \| None | Field(default=None, alias='retryOfJobId') |

### LessonPlanHeaderRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| instructional_format | str \| None | Field(default=None, alias='instructionalFormat') |
| school_name | str \| None | Field(default=None, alias='schoolName') |
| quarter | str \| None | None |
| date | str \| None | None |
| start_time | str \| None | Field(default=None, alias='startTime') |
| end_time | str \| None | Field(default=None, alias='endTime') |

### GenerateLessonPlanRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| class_id | str | Field([required], alias='classId') |
| anchor_type | str | Field([required], alias='anchorType') |
| anchor_id | str | Field([required], alias='anchorId') |
| teacher_note | str \| None | Field(default=None, alias='teacherNote') |
| header | LessonPlanHeaderRequest \| None | None |

### UpdateLessonPlanDraftRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| structured_output | dict[str, Any] | Field([required], alias='structuredOutput') |

### UpdateQuizDraftRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| structured_output | dict[str, Any] | Field([required], alias='structuredOutput') |

### StudentTutorBootstrapRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| class_id | str \| None | Field(default=None, alias='classId') |

### TutorRecommendationDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| id | str | Required |
| title | str | Required |
| reason | str | Required |
| focus_text | str | Field(alias='focusText') |
| lesson_id | str \| None | Field(default=None, alias='lessonId') |
| assessment_id | str \| None | Field(default=None, alias='assessmentId') |
| question_id | str \| None | Field(default=None, alias='questionId') |
| source_chunk_id | str \| None | Field(default=None, alias='sourceChunkId') |

### StudentTutorStartRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| class_id | str | Field([required], alias='classId') |
| recommendation | TutorRecommendationDto | Required |

### StudentTutorMessageRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| session_id | str | Field([required], alias='sessionId') |
| message | str | Field([required], max_length=2000) |
| attachments | list[ImageAttachment] \| None | None |

### StudentTutorAnswerRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| session_id | str | Field([required], alias='sessionId') |
| answers | list[str] | Field([required], min_length=1, max_length=3) |
| attachments | list[ImageAttachment] \| None | None |

### JaPracticeGenerateRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| class_id | str | Field([required], alias='classId') |
| question_count | int | Field(default=10, alias='questionCount') |
| recommendation | TutorRecommendationDto \| None | None |
| allowed_lesson_ids | list[str] \| None | Field(default=None, alias='allowedLessonIds') |
| allowed_assessment_ids | list[str] \| None | Field(default=None, alias='allowedAssessmentIds') |

### JaAskHistoryMessageDto

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| role | str | Required |
| content | str | Required |

### JaAskResponseRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| class_id | str | Field([required], alias='classId') |
| thread_id | str | Field([required], alias='threadId') |
| message | str | Field([required], min_length=1, max_length=2000) |
| quick_action | str \| None | Field(default=None, alias='quickAction') |
| lesson_id | str \| None | Field(default=None, alias='lessonId') |
| lesson_title | str \| None | Field(default=None, alias='lessonTitle') |
| history | list[JaAskHistoryMessageDto] \| None | None |
| allowed_lesson_ids | list[str] \| None | Field(default=None, alias='allowedLessonIds') |
| allowed_assessment_ids | list[str] \| None | Field(default=None, alias='allowedAssessmentIds') |

### JaReviewGenerateRequest

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| class_id | str | Field([required], alias='classId') |
| attempt_id | str | Field([required], alias='attemptId') |
| question_count | int | Field(default=10, alias='questionCount') |
| allowed_lesson_ids | list[str] \| None | Field(default=None, alias='allowedLessonIds') |
| allowed_assessment_ids | list[str] \| None | Field(default=None, alias='allowedAssessmentIds') |

### RequestUser

Base classes: `BaseModel`. Source: `ai-service/app/schemas.py`.

| Field | Type | Default, alias, or constraint |
| --- | --- | --- |
| id | str | Required |
| email | str | Required |
| roles | list[str] | Required |

## Prompt ownership register

| Prompt or builder | Owner | Purpose and guardrail |
| --- | --- | --- |
| JAKIPIR_SYSTEM_PROMPT | ai-service/app/main.py | General Ja assistant identity, school context, grounding, and safe-answer behavior. |
| ADMIN_ANALYTICS_SYSTEM_PROMPT | ai-service/app/main.py | Administrative analytics explanation grounded in backend-provided aggregates. |
| DEMO_INTERVENTION_PLAN_SYSTEM_PROMPT | ai-service/app/main.py | Concise practical intervention-plan output for the explicit demonstration workflow. |
| MENTOR_SYSTEM_PROMPT | ai-service/app/mentor_service.py | Grounded AI mentor behavior and source discipline. |
| TUTOR_SYSTEM_PROMPT | ai-service/app/student_tutor_service.py | Student-facing instructional guidance with class and source boundaries. |
| LESSON_PLAN_SYSTEM_PROMPT | ai-service/app/lesson_plan_service.py | Teacher-facing daily lesson-plan draft generation from retrieved evidence. |
| QUIZ_GENERATION_SYSTEM_PROMPT | ai-service/app/quiz_generation_service.py | Structured high-school assessment drafts with validity and grounding rules. |
| INTERVENTION_RECOMMENDATION_SYSTEM_PROMPT | ai-service/app/remedial_service.py | Teacher-facing intervention recommendations based on provided performance evidence. |
| EXTRACTION_SYSTEM_PROMPT | ai-service/app/extraction_pipeline.py | Source extraction into controlled content structures. |
| STRUCTURE_SYSTEM_PROMPT | ai-service/app/extraction_pipeline.py | Repairs or derives valid module structure from extraction evidence. |
| Ja practice builder | ai-service/app/ja_practice_service.py | Constructs practice guidance from current session, questions, and learner evidence. |
| Content sanitizer prompt | ai-service/app/content_sanitizer.py | Repairs unsafe or malformed generated content after deterministic sanitization checks. |

- Prompt text is source code and must be reviewed, tested, versioned, and treated as behavior.
- Never interpolate a raw retrieved document into a privileged instruction channel. Source material is untrusted context.
- Structured outputs must pass schema and domain validation; a syntactically valid model response is not automatically a publishable academic artifact.

## Retrieval and indexing pipeline

```mermaid
flowchart TB
  SOURCE[Lesson, file, template, or class source] --> NORMALIZE[Normalize and sanitize text]
  NORMALIZE --> CHUNK[Create deterministic content chunks and hashes]
  CHUNK --> EMBED[Generate 768-value embedding]
  CHUNK --> CHUNKS[(content_chunks)]
  EMBED --> VECTORS[(content_chunk_embeddings)]
  QUERY[Grounded user query] --> QEMBED[Generate query embedding]
  QEMBED --> CANDIDATES[Semantic and lexical candidate retrieval]
  CANDIDATES --> SCOPE[Apply class, library, policy, and ownership scope]
  SCOPE --> SCORE[Combine semantic and retrieval signals]
  SCORE --> THRESHOLD[Final score at least 2.2 and semantic score at least 0.2]
  THRESHOLD --> CONTEXT[Bounded distinct-source context]
  CONTEXT --> MODEL[Prompted model response]
  MODEL --> CITE[Grounded answer and source metadata]
```

| Storage item | Contract |
| --- | --- |
| content_chunks | Normalized text, source identity, class or library scope, checksum, ordinal, and metadata. |
| content_chunk_embeddings | One required vector(768) value per chunk, embedding model identity, and embedded timestamp. |
| Vector extension | Enabled by active migration 0003 before vector-dependent use. |
| Vector index | No HNSW or IVFFlat index is declared in the active schema or migrations. |
| Model index | A B-tree index exists for embedding_model filtering only. |
| Thresholds | Default final retrieval score 2.2, semantic score 0.2, and at least one distinct source. |

### Indexing ownership

- Class reindexing is serialized by the rag-indexing queue and the internal class-index route.
- Library-file indexing uses a separate queue with concurrency two and a file-specific internal route.
- Extraction can create structured source material, but applying an extraction remains a backend-governed lifecycle step.
- Reindex operations must be idempotent by source identity and checksum so a retry replaces or reconciles stale chunks rather than multiplying them.

## Concurrency, timeouts, and overload behavior

- Tutor requests are bounded by an in-process maximum of eight. Rejection status defaults to 429 with Retry-After of five seconds.
- Teacher background execution is bounded to two and extraction to one, matching backend queue concurrency for those workloads.
- Database pool defaults are size ten, overflow fifteen, checkout timeout thirty seconds, recycle 1,800 seconds, with pre-ping enabled.
- Model requests have task-specific timeouts. A timeout is a failure signal, not proof that a remote runtime performed no work.
- Backend queue workers must record durable attempt state and rethrow retryable failures so BullMQ can apply backoff.

## Health and readiness behavior

- Liveness proves the FastAPI process can answer. Readiness also considers required database and runtime dependencies.
- ai_degraded_allowed defaults false. A deployment must explicitly opt into degraded readiness behavior.
- Ollama availability, configured model presence, database connectivity, and cloud runtime configuration must be interpreted together with the selected runtime mode.
- Metrics are exposed through the FastAPI metrics route and scraped by Prometheus as documented in Chapter 09.

## AI safety and correctness gates

| Risk | Required gate |
| --- | --- |
| Hallucinated academic fact | Ground retrieval to allowed sources, preserve citations, and reject weak-evidence output. |
| Cross-class data leakage | Apply backend-validated user context, class ownership or enrollment, class AI policy, and retrieval scope. |
| Prompt injection in uploaded content | Treat source content as data, sanitize it, keep system instructions separate, and validate structured output. |
| Invalid structured draft | Pydantic validation, deterministic domain validation, and repair with a bounded retry. |
| Official-state mutation | Return a draft to a backend-owned approval or apply workflow; never finalize grades directly from model output. |
| Cloud data egress | Require explicit cloud enablement, approved provider configuration, and deployment-level secret control. |
| Duplicate background execution | Use durable job identity, idempotent writes, and current-state checks before applying output. |
| Oversized attachment or text | Enforce file, media, raw-text, and request-body bounds before model invocation. |

## AI feature maintenance checklist

1. Define the backend-owned public contract and authorization before adding a FastAPI route.
2. Decide whether the task is synchronous or a durable BullMQ job; long-running extraction or generation must remain restart-safe.
3. Add a typed Pydantic request and response contract with negative tests.
4. Select the task profile, timeout, concurrency budget, and local or cloud data policy explicitly.
5. Ground the prompt to allowed source scope and validate the response deterministically.
6. Persist durable intent, attempts, output, failure reason, and approval state in PostgreSQL.
7. Test runtime unavailable, database unavailable, malformed model output, weak retrieval, duplicate execution, timeout, and cancellation.
8. Update backend consumers, both clients when exposed, metrics, runbooks, and this chapter.
