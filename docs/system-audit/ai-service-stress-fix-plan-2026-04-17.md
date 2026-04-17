# AI Service Stress Test Fix Plan

## Safe Immediate Fixes

- Add route-level stress or integration tests for tutor/session, extraction status/apply, and teacher job endpoints under malformed headers and degraded dependency conditions.
- Add targeted tests for JA and remedial route families covering sparse evidence, malformed model payloads, and invalid JSON fallback behavior.
- Add focused proxy tests for missing or malformed X-User-* headers, secret mismatch, non-JSON upstream bodies, and real timeout cancellation handling.

## Conditional Local Refactors

- Move AI job runtime state off in-memory storage or harden the reconciliation path if process-restart survival becomes a product requirement.
- Make tutor/JA/remedial degraded-mode behavior more explicit when retrieval or model quality collapses, instead of silently falling back to low-confidence outputs.

## Deferred Items Requiring Human Decision

- Build a heavier mixed-flow soak harness for extraction, quiz jobs, and tutor sessions if you want evidence beyond unit and targeted integration coverage.
- Review LXP intervention create-or-assign flows for stronger idempotency or locking if concurrent performance events become common.
