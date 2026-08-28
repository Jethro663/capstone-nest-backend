# Canonical Gemini Text Model Design

## Goal

Make `google/gemini-3.7-flash` the single effective cloud text-generation model for Nexora in production and in every forward-looking repository default or deployment guide, eliminating the current Railway conflict that causes `google/gemini-2.5-pro` to win.

## Scope

This change covers cloud-backed text generation performed by `ai-service`, including chat, grading, classification, quiz generation, intervention generation, text extraction, and lesson enrichment. The backend, web, and mobile clients continue to reach AI through the existing backend-to-`ai-service` contract and do not select models themselves.

The change does not alter:

- `OLLAMA_TEXT_MODEL`, because local Compose uses an Ollama-native model and cannot pull an OpenRouter model identifier.
- `OPENROUTER_VISION_MODEL`, because image and vision tasks have a separate task profile.
- `OPENROUTER_EMBEDDING_MODEL` or `OLLAMA_EMBED_MODEL`, because embeddings are not text generation and must preserve their dimensional contract.
- Historical audit reports that record past deployment state. Forward-looking examples and deployment instructions will be updated.

## Current Problem

Railway production defines both model aliases with different values:

- `AI_CLOUD_FALLBACK_MODEL=google/gemini-2.5-pro`
- `OPENROUTER_TEXT_MODEL=google/gemini-3.7-flash`

`ai-service/app/config.py` declares `AI_CLOUD_FALLBACK_MODEL` before `OPENROUTER_TEXT_MODEL` in `AliasChoices`, so the first value wins. Production therefore reports and uses Gemini 2.5 Pro even though the legacy OpenRouter alias already names Gemini 3.7 Flash.

## Architecture

`AI_CLOUD_FALLBACK_MODEL` remains the canonical cloud text-model variable. `OPENROUTER_TEXT_MODEL` remains accepted only as a backward-compatible alias when the canonical variable is absent.

All text task profiles continue through `ai-service/app/ollama_client.py`:

1. The task profile identifies a request as text or vision.
2. Cloud runtime text tasks call `cloud_fallback.get_text_model()`.
3. `get_text_model()` returns `settings.ai_cloud_fallback_model`.
4. The canonical setting resolves to `google/gemini-3.7-flash`.

No model identifier will be duplicated in individual tutor, mentor, extraction, remedial, or quiz handlers.

## Repository Configuration

The `Settings.ai_cloud_fallback_model` default will change from `gpt-4o-mini` to `google/gemini-3.7-flash`. The cloud deployment example in `ai-service/.env.example` and all forward-looking deployment documentation that currently recommends `openrouter/auto` will use the same pinned model identifier.

Backward compatibility remains intact: deployments that only define `OPENROUTER_TEXT_MODEL` will still work. A configuration test will lock in both the new default and the precedence rule so conflicting aliases cannot silently regress.

## Railway Production Change

For project `precious-nourishment`, environment `production`, service `ai-service`:

1. Set `AI_CLOUD_FALLBACK_MODEL=google/gemini-3.7-flash`.
2. Remove the redundant `OPENROUTER_TEXT_MODEL` variable after the canonical value is present.
3. Allow Railway to redeploy the service.
4. Wait for the resulting deployment to reach terminal `SUCCESS` before reporting completion.

The OpenRouter base URL, API key, runtime mode, provider detection, vision model, and embedding model remain unchanged.

## Failure Handling and Rollback

Repository changes must pass targeted configuration and routing tests before production mutation. After the Railway variable update, a failed or crashed deployment will be investigated from its build/runtime logs. If Gemini 3.7 Flash cannot serve the existing request shape, the canonical variable will be restored to its previous value to recover production while preserving the repository evidence needed for follow-up.

Removing the legacy alias happens only after the canonical value is confirmed in Railway configuration. This ordering prevents an interval with no configured cloud text model.

## Verification

Verification will establish all of the following:

- Settings default to `google/gemini-3.7-flash` when neither alias is supplied.
- `AI_CLOUD_FALLBACK_MODEL` remains authoritative when both aliases are supplied.
- Every text task profile resolves to the canonical cloud model in cloud runtime.
- Vision and embedding task resolution remains unchanged.
- Forward-looking environment examples and deployment guides no longer recommend a different cloud text model.
- Railway production contains the canonical variable and no conflicting legacy text-model alias.
- The new Railway deployment reaches `SUCCESS`.
- The deployed health/status surface reports `configuredTextModel` as `google/gemini-3.7-flash`.
- Representative text-generation smoke requests complete without falling back to Gemini 2.5 Pro.

## Acceptance Criteria

The change is complete only when repository tests pass, forward-looking configuration references agree, Railway production has one canonical cloud text-model variable, the deployment is successful, and runtime evidence reports `google/gemini-3.7-flash` for text generation.
