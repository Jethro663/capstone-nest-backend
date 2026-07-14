#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_DIR="$ROOT_DIR/ai-service"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON_BIN="${AI_TEST_PYTHON:-$AI_DIR/.venv/bin/python}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "AI test interpreter not found or not executable: $PYTHON_BIN" >&2
  echo "Set AI_TEST_PYTHON to a Python environment with ai-service dependencies." >&2
  exit 2
fi

echo "[1/2] AI extraction, indexing, retrieval, and degraded-mode resilience"
(
  cd "$AI_DIR"
  AI_RUNTIME_MODE=test "$PYTHON_BIN" -m unittest \
    tests.test_ai_job_runtime \
    tests.test_backend_uploads \
    tests.test_cloud_fallback \
    tests.test_embedding_provider \
    tests.test_extraction_apply \
    tests.test_extraction_job_queueing \
    tests.test_extraction_normalization \
    tests.test_extraction_pipeline \
    tests.test_indexing_pipeline \
    tests.test_ja_practice_service \
    tests.test_job_lifecycle \
    tests.test_lesson_plan_job_queueing \
    tests.test_library_indexing_pipeline \
    tests.test_quiz_apply \
    tests.test_retrieval_service \
    tests.test_student_tutor_service
)

echo "[2/2] Backend queue, boundary-auth, timeout, and compensation resilience"
(
  cd "$BACKEND_DIR"
  npm test -- --runInBand \
    src/modules/ai-mentor/ai-generation-queue.service.spec.ts \
    src/modules/ai-mentor/ai-mentor.controller.spec.ts \
    src/modules/ai-mentor/ai-proxy.service.spec.ts \
    src/modules/ai-mentor/processors/ai-generation.processor.spec.ts \
    src/modules/discussion-board/discussion-board.processor.spec.ts \
    src/modules/file-upload/internal-uploads.controller.spec.ts \
    src/modules/file-upload/library-indexing.service.spec.ts \
    src/modules/file-upload/processors/library-indexing.processor.spec.ts \
    src/modules/notifications/assessment-notification-dispatch.service.spec.ts \
    src/modules/notifications/processors/announcement-fan-out.processor.spec.ts \
    src/modules/notifications/processors/assessment-notification.processor.spec.ts \
    src/modules/performance/performance-recompute-queue.service.spec.ts \
    src/modules/performance/performance-recompute.processor.spec.ts \
    src/modules/rag/processors/rag-indexing.processor.spec.ts \
    src/modules/rag/rag-indexing.service.spec.ts
)

echo "AI/BullMQ resilience smoke passed."
