# Canonical Gemini Text Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `google/gemini-3.7-flash` the canonical cloud text-generation model in code defaults, forward-looking deployment configuration, and Railway production.

**Architecture:** Preserve the existing single routing boundary in `ai-service/app/ollama_client.py`: every cloud text task resolves through `settings.ai_cloud_fallback_model`, while vision, embeddings, and local Ollama remain independent. Remove the conflicting production alias after setting the canonical Railway variable, then verify the resulting deployment and a real OpenRouter request.

**Tech Stack:** Python 3, Pydantic Settings, unittest, FastAPI, OpenRouter-compatible API, Railway CLI.

## Global Constraints

- The canonical cloud text model is exactly `google/gemini-3.7-flash`.
- `AI_CLOUD_FALLBACK_MODEL` is authoritative; `OPENROUTER_TEXT_MODEL` remains code-compatible only when the canonical variable is absent.
- Do not change Ollama, vision, or embedding model configuration.
- Do not rewrite historical audit reports; update only source defaults and forward-looking deployment guidance.
- Do not report deployment success before Railway reaches terminal `SUCCESS`.

---

### Task 1: Lock the canonical model default with a failing test

**Files:**
- Modify: `ai-service/tests/test_config.py`
- Modify: `ai-service/app/config.py`

**Interfaces:**
- Consumes: Pydantic `Settings` and the existing `AliasChoices("AI_CLOUD_FALLBACK_MODEL", "OPENROUTER_TEXT_MODEL")` contract.
- Produces: `Settings.ai_cloud_fallback_model == "google/gemini-3.7-flash"` when neither alias is supplied.

- [ ] **Step 1: Write the failing default-model test**

Add `patch` to the imports and add this test to `SettingsTests`:

```python
from unittest.mock import patch

def test_cloud_text_model_defaults_to_gemini_3_7_flash(self) -> None:
    with patch.dict(os.environ, {"AI_RUNTIME_MODE": "test"}, clear=True):
        settings = Settings(_env_file=None)

    self.assertEqual(
        settings.ai_cloud_fallback_model,
        "google/gemini-3.7-flash",
    )
```

- [ ] **Step 2: Run the test and verify RED**

Run from `ai-service/`:

```bash
.venv/bin/python -m unittest tests.test_config.SettingsTests.test_cloud_text_model_defaults_to_gemini_3_7_flash -v
```

Expected: `FAIL`, showing actual `gpt-4o-mini` instead of `google/gemini-3.7-flash`.

- [ ] **Step 3: Change the minimal production default**

Change the field default in `ai-service/app/config.py`:

```python
ai_cloud_fallback_model: str = Field(
    default="google/gemini-3.7-flash",
    validation_alias=AliasChoices("AI_CLOUD_FALLBACK_MODEL", "OPENROUTER_TEXT_MODEL"),
)
```

- [ ] **Step 4: Run the test and verify GREEN**

```bash
.venv/bin/python -m unittest tests.test_config.SettingsTests.test_cloud_text_model_defaults_to_gemini_3_7_flash -v
```

Expected: one test passes.

- [ ] **Step 5: Run the complete configuration test module**

```bash
.venv/bin/python -m unittest tests.test_config -v
```

Expected: all configuration tests pass.

- [ ] **Step 6: Commit the tested default**

```bash
git add ai-service/app/config.py ai-service/tests/test_config.py
git commit -m "fix(ai): pin Gemini 3.7 Flash text default"
```

---

### Task 2: Verify task routing and align forward-looking configuration

**Files:**
- Create: `ai-service/tests/test_ollama_client_model_routing.py`
- Modify: `ai-service/.env.example`
- Modify: `docs/deployment/AZURE_CONTAINER_APPS_DEPLOYMENT.md`
- Modify: `docs/master-manual/06-fastapi-ai-service-and-vector-engine.md`

**Interfaces:**
- Consumes: `ollama_client.TASK_PROFILES`, `get_task_model_name`, `get_vision_model_name`, and `get_embedding_model_name`.
- Produces: regression coverage proving every text task resolves to the canonical cloud model without changing vision or embedding routing.

- [ ] **Step 1: Add model-routing regression coverage**

Create `ai-service/tests/test_ollama_client_model_routing.py`:

```python
import unittest
from unittest.mock import patch

from app import ollama_client


class OllamaClientModelRoutingTests(unittest.TestCase):
    def test_all_text_tasks_use_canonical_cloud_model(self) -> None:
        text_tasks = [
            task
            for task, profile in ollama_client.TASK_PROFILES.items()
            if profile["model_kind"] == "text"
        ]

        with (
            patch.object(ollama_client.settings, "ai_runtime_mode", "cloud"),
            patch.object(ollama_client.settings, "ai_cloud_fallback_enabled", True),
            patch.object(ollama_client.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_model",
                "google/gemini-3.7-flash",
            ),
        ):
            resolved = {
                task: ollama_client.get_task_model_name(task)
                for task in text_tasks
            }

        self.assertEqual(text_tasks, [
            "chat",
            "grading",
            "classification",
            "quiz_generation",
            "intervention",
            "text_extraction",
            "lesson_enrichment",
        ])
        self.assertEqual(
            resolved,
            {task: "google/gemini-3.7-flash" for task in text_tasks},
        )

    def test_vision_and_embedding_models_remain_independent(self) -> None:
        with (
            patch.object(ollama_client.settings, "ai_runtime_mode", "cloud"),
            patch.object(ollama_client.settings, "ai_cloud_fallback_enabled", True),
            patch.object(ollama_client.settings, "ai_cloud_fallback_api_key", "test-key"),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_model",
                "google/gemini-3.7-flash",
            ),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_vision_model",
                "google/gemma-4-26b-a4b-it",
            ),
            patch.object(
                ollama_client.settings,
                "ai_cloud_fallback_embedding_model",
                "google/gemini-embedding-2-preview",
            ),
        ):
            self.assertEqual(
                ollama_client.get_task_model_name("vision_extraction"),
                "google/gemma-4-26b-a4b-it",
            )
            self.assertEqual(
                ollama_client.get_embedding_model_name(),
                "google/gemini-embedding-2-preview",
            )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the routing test**

```bash
.venv/bin/python -m unittest tests.test_ollama_client_model_routing -v
```

Expected: two tests pass.

- [ ] **Step 3: Pin the forward-looking deployment values**

Set these exact values in the owning files:

```text
ai-service/.env.example:
AI_CLOUD_FALLBACK_MODEL=google/gemini-3.7-flash

docs/deployment/AZURE_CONTAINER_APPS_DEPLOYMENT.md:
AI_CLOUD_FALLBACK_MODEL=google/gemini-3.7-flash

docs/master-manual/06-fastapi-ai-service-and-vector-engine.md:
Field(default='google/gemini-3.7-flash', validation_alias=AliasChoices('AI_CLOUD_FALLBACK_MODEL', 'OPENROUTER_TEXT_MODEL'))
Optional cloud runtime fallback model defaults to google/gemini-3.7-flash.
```

- [ ] **Step 4: Verify forward-looking configuration consistency**

```bash
rg -n "AI_CLOUD_FALLBACK_MODEL|ai_cloud_fallback_model|cloud runtime fallback model" \
  ai-service/app/config.py \
  ai-service/.env.example \
  docs/deployment/AZURE_CONTAINER_APPS_DEPLOYMENT.md \
  docs/master-manual/06-fastapi-ai-service-and-vector-engine.md
```

Expected: every model-valued result uses `google/gemini-3.7-flash`; no result uses `gpt-4o-mini` or `openrouter/auto`.

- [ ] **Step 5: Run targeted AI tests**

```bash
.venv/bin/python -m unittest \
  tests.test_config \
  tests.test_ollama_client_model_routing \
  tests.test_cloud_fallback -v
```

Expected: all targeted tests pass.

- [ ] **Step 6: Commit routing coverage and configuration alignment**

```bash
git add \
  ai-service/tests/test_ollama_client_model_routing.py \
  ai-service/.env.example \
  docs/deployment/AZURE_CONTAINER_APPS_DEPLOYMENT.md \
  docs/master-manual/06-fastapi-ai-service-and-vector-engine.md
git commit -m "docs(ai): align Gemini text deployment defaults"
```

---

### Task 3: Roll out the canonical model to Railway production

**Files:**
- No repository files.

**Interfaces:**
- Consumes: Railway project `00b7dfa6-d938-4029-8119-0194a04b5795`, production environment `21d66a59-ca91-46a4-b99b-1b436cc328d0`, service `0273d0f2-a724-4dee-86fa-9aca54fd5393`.
- Produces: one canonical production variable and a successful deployment using Gemini 3.7 Flash for cloud text requests.

- [ ] **Step 1: Re-read the production model variables**

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway variable list \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  --json | node -e 'let s=""; process.stdin.on("data", d => s += d).on("end", () => { const v=JSON.parse(s); console.log(JSON.stringify({AI_CLOUD_FALLBACK_MODEL:v.AI_CLOUD_FALLBACK_MODEL, OPENROUTER_TEXT_MODEL:v.OPENROUTER_TEXT_MODEL ?? null}, null, 2)); });'
```

Expected before mutation: `AI_CLOUD_FALLBACK_MODEL` is `google/gemini-2.5-pro` and `OPENROUTER_TEXT_MODEL` is `google/gemini-3.7-flash`. The filter prevents API keys and unrelated secrets from being printed.

- [ ] **Step 2: Stage the canonical value without triggering an intermediate deploy**

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway variable set AI_CLOUD_FALLBACK_MODEL=google/gemini-3.7-flash \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  --skip-deploys --json
```

- [ ] **Step 3: Read back the canonical value, then remove the conflicting alias**

Read back the canonical value without printing unrelated variables:

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway variable list \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  --json | node -e 'let s=""; process.stdin.on("data", d => s += d).on("end", () => { const v=JSON.parse(s); console.log(JSON.stringify({AI_CLOUD_FALLBACK_MODEL:v.AI_CLOUD_FALLBACK_MODEL}, null, 2)); });'
```

Expected: `AI_CLOUD_FALLBACK_MODEL` is `google/gemini-3.7-flash`. Then run:

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway variable delete OPENROUTER_TEXT_MODEL \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  --json
```

Expected: deletion succeeds and triggers one deployment containing both changes.

- [ ] **Step 4: Wait for terminal deployment success**

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway deployment list \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  --limit 1 --json
```

Repeat with bounded waits until the newest deployment is `SUCCESS`, or stop and investigate if it is `FAILED` or `CRASHED`.

- [ ] **Step 5: Verify production variables and runtime-reported model**

Verify the final variable state without printing unrelated variables:

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway variable list \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  --json | node -e 'let s=""; process.stdin.on("data", d => s += d).on("end", () => { const v=JSON.parse(s); console.log(JSON.stringify({AI_CLOUD_FALLBACK_MODEL:v.AI_CLOUD_FALLBACK_MODEL, OPENROUTER_TEXT_MODEL:v.OPENROUTER_TEXT_MODEL ?? null}, null, 2)); });'
```

Expected: `AI_CLOUD_FALLBACK_MODEL` is `google/gemini-3.7-flash` and `OPENROUTER_TEXT_MODEL` is `null`. Then run:

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway ssh \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  python -c "import json, urllib.request; body=json.load(urllib.request.urlopen('http://127.0.0.1:8000/health')); print(json.dumps({'configuredTextModel': body['data']['configuredTextModel'], 'configuredVisionModel': body['data']['configuredVisionModel'], 'configuredEmbeddingModel': body['data']['configuredEmbeddingModel']}))"
```

Expected: text is `google/gemini-3.7-flash`; vision and embedding retain their prior values.

- [ ] **Step 6: Execute one live text-generation smoke request**

```bash
RAILWAY_CALLER=skill:use-railway@1.3.7 \
RAILWAY_AGENT_SESSION=railway-skill-20260828-gemini-rollout \
railway ssh \
  --project 00b7dfa6-d938-4029-8119-0194a04b5795 \
  --environment 21d66a59-ca91-46a4-b99b-1b436cc328d0 \
  --service 0273d0f2-a724-4dee-86fa-9aca54fd5393 \
  python -c "import asyncio; from app import cloud_fallback; print(asyncio.run(cloud_fallback.generate_text(prompt='Reply with exactly OK.', temperature=0)))"
```

Expected: a non-empty response from the canonical cloud model without a provider or model-not-found error.

---

### Task 4: Final verification and evidence review

**Files:**
- Verify only.

**Interfaces:**
- Consumes: all repository changes and Railway runtime evidence.
- Produces: completion evidence tied to the approved design acceptance criteria.

- [ ] **Step 1: Run the AI-service test entrypoint**

```bash
python scripts/run_tests.py
```

Run from `ai-service/`. Expected: the suite exits zero with no failures.

- [ ] **Step 2: Check repository consistency and diff quality**

```bash
git diff --check
git status --short
git log -4 --oneline
```

Expected: no whitespace errors; only intentional commits and no uncommitted implementation files.

- [ ] **Step 3: Re-read the approved design acceptance criteria**

Confirm each criterion in `docs/superpowers/specs/2026-08-28-canonical-gemini-text-model-design.md` against fresh test, Railway deployment, variable, health, and smoke evidence before reporting completion.
