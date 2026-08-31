## 1. Contracts and saving
- [x] 1.1 Add publication regressions and atomic editor DTO/service/routes with revision and mutation receipts.
- [x] 1.2 Add compatible migration, preserve question/option data, and verify rollback/replay/conflict behavior.
- [x] 1.3 Wire web and mobile atomic save with useful validation and explicit publication.

## 2. AI drafts
- [x] 2.1 Persist complete assessment settings through backend/Python job creation, retrieval, update, retry and preview.
- [x] 2.2 Implement backend-owned idempotent quiz apply and validated extraction period context.
- [x] 2.3 Add grouped web/mobile AI settings and pre-apply review.

## 3. Mobile and academic recovery
- [x] 3.1 Implement Questions / Settings / Preview editor with rich text, recovery and supported controls.
- [x] 3.2 Unify create routes and improve list/detail actions and restriction guidance.
- [x] 3.3 Require valid rollover period mapping and produce a read-only repair report.

## 4. Verification
- [x] 4.1 Verify backend, web, mobile and AI behavior, types, lint and builds.
- [ ] 4.2 Exercise disposable-service integration and available authenticated/device workflows; record environment limits.

Task 4.2: disposable PostgreSQL integration (53 tests), authenticated web/mobile round trips, Android recovery/publication and fixture-based AI review/apply are recorded in `evidence/verification.md`. Live AI provider/worker generation and extraction remain unverified because no local model/provider is configured. Do not archive or declare the full release gate complete.
