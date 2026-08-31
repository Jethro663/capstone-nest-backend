# Assessment authoring verification

Recorded September 1, 2026 (Asia/Manila). Implementation is in the existing working tree on `developement`, based on `028f9dd3d28a83efd330294e32fb540f87dcdcbb`. Pre-existing authentication and roster edits remain present. No commit, push, deployment, production repair, or release APK replacement was performed.

## Automated results

| Surface | Command (from that surface directory) | Result |
| --- | --- | --- |
| Backend | `npm test -- --runInBand` | 112 suites, 1,248 tests passed |
| Backend | `npm run build` (repeated) | Passed; entrypoint and clean-source checks passed |
| Backend | `npm run lint` | Passed configured threshold; 0 errors, 2,287 warnings remain |
| Migration | `npm run check:migrations` | 17 linear migrations verified |
| PostgreSQL 18 | `node run-migrations.js`, explicit disposable database URL | All 17 migrations applied to a fresh database; repeat run applied none |
| PostgreSQL integration | `ACADEMIC_LARGE_FIXTURE=1 ACADEMIC_TEST_DATABASE_URL=<disposable-url> npm run test:academic -- --testRegex='(academic-lifecycle\|assessment-editor).integration-spec.ts$'` | 2 suites, 53 tests passed; no skips |
| Web | `npm test -- --runInBand` | 155 suites, 655 tests passed |
| Web | `npx tsc --noEmit`, `npm run lint`, `npm run build` | All passed; standalone typecheck was run explicitly |
| Mobile | `npm run typecheck`, `npm test` | Types passed; 43 suites, 234 tests passed |
| AI | `.venv/bin/python scripts/run_tests.py` | 181 tests passed |
| Rich text | `npm run build:rich-text` | Bundled locally; no remote editor dependency |
| Android | `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api NODE_ENV=production JAVA_HOME=<local-jdk17> ./android/gradlew -p android assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon` | Passed; latest build timing and hash are recorded in the artifact manifest |
| Working tree | `git diff --check` | Passed |

The final web run passed without changing timeouts. An earlier run, concurrent with the native build/emulator, timed out in three unrelated UI suites; those suites also passed independently afterward. A new mobile test initially had an optional-property type error; it was corrected before the final typecheck and 234-test run. An invocation using Jest's unsupported `--run` option was corrected to `--runInBand`; that invocation ran no tests.

Mobile has no repository lint script. AI tests are the repository unittest runner, not a live model-provider evaluation. Native build deprecation warnings and existing backend lint warnings remain; passing these gates does not mean warning-free.

## Evidence covered by the tests

- Atomic save: incomplete drafts, exact mutation replay, concurrent saves, stale revisions after legacy mutations, and rollback when metadata, question, or option writes fail. Failed transactions do not produce indexing effects.
- Preservation: all six question types; stable question/option IDs and legacy ordering; rich text, images and positioning; unchanged metadata; file-upload settings, attachments and rubric data. Full unchanged question payloads remain editable after attempts without rewriting protected questions.
- Publication: incomplete publication rolls back; published content must explicitly move to draft before accepting incomplete edits. Academic guards remain backend-owned.
- AI: Quiz, Exam and Assignment apply concurrently to one assessment; teacher configuration wins over model output; legacy jobs require review; settings edits retain generated questions; academic changes between preview and apply are rejected. Retry handler tests retain all settings groups, sources, teacher instructions and requested question type/count for all three assessment types.
- Extraction: missing context, stale academic versions and locked workbooks are rejected before assessment writes. Valid canonical settings reach the assessment insert; existing lesson application tests still pass.
- Client handlers: web and native save/generate/settings controls submit the expected payloads. Lost-response retry reuses the original mutation. Recovery retains conflicts, scopes copies by account, and prompts before restoring an older revision. Preview does not create an attempt or show answer keys. Fill-in-the-blank answer entry remains plain text for the existing grader.
- Academic lifecycle: explicit destination-period mapping is required for rollover; annual/source evidence checks pass. The large fixture covers 1,200 students, 240 classes, 720 class records, 28,800 period grades and 9,600 annual grades.

These are automated service/database/handler checks. They do not substitute for the authenticated cross-platform and physical interaction checks below.

## Artifact and local runtime

`artifact-manifest.json` records source fingerprints (including preserved pre-existing changes), backend entrypoint hash, APK hash, ZIP integrity and ABI. APK package is `com.nexora.lms.mobile`, version `0.1.9` / code `10`; ABI is x86_64 only. The installed APK was pulled back and matched the build byte-for-byte. APK v2 signature verification passed with the existing **Android Debug** certificate. This is an emulator test artifact, not a production distribution build.

The embedded URL is `http://10.0.2.2:3000/api`. The final backend build was restarted against the separate disposable UI database; `/api/health/live` returned healthy and an unauthenticated request to `/api/assessments/editor` returned 401. Authenticated browser and Android workflows now run against that disposable backend. The final artifact pair is fingerprinted in the manifest; see the runtime matrix below.

Disposable PostgreSQL and Redis containers are `nexora-assessment-plan-pg` (55439) and `nexora-assessment-plan-redis` (56379). Integration tests use `nexora_academic_test_editor`; the UI fixture uses a separate `nexora_academic_test_authoring_ui`; fresh migration verification uses `nexora_academic_test_editor_fresh_plan`. Do not run destructive integration tests against the UI fixture or school database.

## Read-only academic repair report

The full report with record identifiers remains in the original local checkout as `local-period-repair-review.json`; only an identifier-free summary is included in the release.

`local-period-repair-review.summary.json` records all five assessments found in the existing local Compose snapshot. Each has a missing grading period and zero attempts. That snapshot predates the lifecycle schema, so the full current audit cannot run there without a migration. The report used stable-column queries inside an explicit read-only transaction and rolled back. The original container was returned to its stopped state.

The report is **not a production audit** and does not establish the current production record count. Period choices derived from documented fallback policy need school confirmation where no stored policy exists. No period, Q4 historical result, placement, student evidence or schema was rewritten. Administrators must use the existing audited recovery endpoints only after reviewing authoritative school records.

## Authenticated runtime evidence

The user approved use of the disposable teacher account. Browser and Android sign-in succeeded. All records below belong to the synthetic MATH-QA class with no enrolled students; no school records were changed.

| Workflow | Observed result |
| --- | --- |
| Web manual draft | Created and saved an unfinished assessment using real editor buttons; publication was blocked until required content/category were supplied. Explicit publish and move-to-draft succeeded. |
| Six question types, web → Android → web | Created multiple choice, multiple select, true/false, short answer, fill in the blank and dropdown on web. Android reopened all six, edited a rich-text description with Bold and saved. Database comparison found identical question/option rows, IDs, formatting, image positioning and every untouched setting. Web reopened the saved description. |
| Option image | Uploaded the repository's public logo through the web file chooser, selected expanded size and 110% zoom. Android rendered it and preserved its metadata through saving. |
| Offline recovery and Back | Back warned before leaving unsaved work. With emulator airplane mode enabled, Save showed Network Error and retained a retryable request. The copy survived force-stop/relaunch and re-authentication; Recover + Retry save saved it once. All six question/option rows remained identical and the total stayed 6. Airplane mode was restored to disabled. |
| Session restoration | A subsequent online restart after APK replacement restored the teacher session. A restart during the deliberate backend restart required signing in again; recovery survived. Fully offline authentication/bootstrap is not claimed. The final native Log out action returned to sign-in; the recovery-clearing helper is covered by automated tests and its explicit-logout wiring was checked in source. |
| Stale revision | A mobile edit based on an older web revision returned a conflict, retained recovery and offered review of the server version. Reloading did not silently apply the old copy. The final APK displayed “Server version loaded · recovery copy kept” and the newer web title. A handler regression also covers this behavior. |
| Manual file upload | Created on web with rich-text instructions, document-only extensions, 12 MB limit, a 100-point rubric and uploaded reference attachment. Edited description on Android and reopened on web. All fields except the intentional description, revision and update timestamp were identical, including rubric review metadata. |
| AI Exam review on web | Resumed an explicitly seeded completed job, edited title/attempts/feedback delay, saved settings, reviewed the complete apply summary and applied. Created an unpublished Exam with the selected values. Returning to the job reopened the same assessment. |
| AI Quiz review on Android | Resumed an explicitly seeded completed job, changed title and attempts to 5, saved settings without changing questions, and reviewed all settings before applying. Created an unpublished Quiz in the normal editor. Timers 47 minutes/75 seconds, passing 83%, detailed feedback/7 hours, due date and other selected values persisted. |
| AI Assignment on final Android build | Saved the fixture settings, applied to an unpublished Assignment, returned to the aggregate list with Approved shown without manual refresh, and reopened the same assessment. Question summaries rendered without HTML tags. |
| Native publication and preview | Read-only student preview displayed content without answer keys and created no attempt. Explicit publish succeeded for active Term 1, followed by explicit move to draft. Database attempt count remained zero. |
| Future term | Saving the quiz for Term 2 succeeded; guidance explained preparation versus release and Ready to give was disabled. |
| Missing period | A deliberately malformed disposable fixture appeared under Needs attention. Review opened an unassigned-period explanation with administrator guidance; Add question, Save and Ready to give were disabled. Copy diagnostic details succeeded. Web opened the same record as view-only with matching administrator guidance. |
| Touch targets | Class-card Edit/Delete now measure 44 dp; AI-job actions and question-type controls were enlarged to at least 44 dp. |

Runtime comparisons are recorded in `runtime-checks.json`; selected synthetic screenshots are in `screenshots/`.

### Defects found by runtime verification and corrected

- Full mobile settings include an empty rubric for question-based assessments. Legacy metadata saving incorrectly applied the upload default of 100 points. Backend saving now derives question totals from the existing questions. Three PostgreSQL regressions (Quiz/Exam/Assignment) failed before the fix and passed afterward; the real Android round trip then preserved 6 points.
- Resubmitting an unchanged file-upload rubric changed its review timestamp. An additional PostgreSQL regression reproduced this; unchanged rubric and source metadata are now preserved. The real file-upload round trip passed afterward.
- Reviewing a newer server revision left an inaccurate unsaved status. The conflict handler now identifies the loaded server version and retained recovery copy; its handler regression passed.
- Applying AI work left the aggregate job list cached as Ready for review and the mounted job editable. Apply now marks the local job approved and invalidates job/assessment queries. The real-handler regression failed before this fix and passed afterward.
- Added accessible labels for web insertion buttons, native rich-text fields and class-card actions; enlarged undersized native actions and removed raw HTML tags from AI question summaries.

## Remaining delivery gates

1. **Live AI generation and extraction:** local Ollama reports no installed models, cloud fallback is disabled and no provider credential is configured. The AI service runs, but completed-job fixtures test settings/review/apply only. They are deliberately seeded records, not model-generated content. Live source indexing, generation, worker restart/retry and extraction apply remain unverified end to end. Configure an approved local model/provider and ready synthetic sources before running that gate.
2. Tests cover legacy jobs, concurrency, invalid/closed/locked/attempted/core-template states and cross-client payloads. The runtime checks above are the actually exercised paths; do not infer an exhaustive device matrix or physical-device/iOS validation from them. Rich-text link creation and exhaustive accessibility assistive-technology checks remain manual release checks.
3. If production repair or delivery is subsequently requested, review the current production audit separately and deploy compatible backend/AI services before dependent clients. Neither is authorized by this implementation request.

Task 4.2 stays open for live provider/worker verification. Do not archive or declare the full release gate complete from successful builds alone.

## Local command logs

Detailed logs from this run are under `/tmp/nexora-*.log` and may disappear after a reboot. The result summaries and artifact manifest above are the durable evidence. Relevant logs: `nexora-backend-tests-final`, `nexora-backend-build-final`, `nexora-backend-lint-final`, `nexora-academic-integration-final`, `nexora-migrate-fresh`, `nexora-migrate-repeat`, `nexora-web-tests-final`, `nexora-web-types`, `nexora-web-lint`, `nexora-web-build`, `nexora-mobile-types`, `nexora-mobile-tests`, `nexora-ai-tests-final`, `nexora-android-build-final`, and `nexora-apk-signature`.

Follow-up logs: `nexora-total-points-red` (four reproduced failures), `nexora-total-points-green`, `nexora-ai-invalidation-red`, `nexora-runtime-backend-tests`, `nexora-runtime-backend-build`, `nexora-runtime-backend-lint`, `nexora-runtime-integration`, `nexora-runtime-web-types`, `nexora-runtime-web-lint`, `nexora-runtime-web-build`, `nexora-runtime-mobile-types`, `nexora-runtime-mobile-tests`, `nexora-runtime-android-build`.

Final totals: 2,371 passing tests (backend 1,248; PostgreSQL 53; web 655; mobile 234; AI 181). Latest web suite, backend suite, integration suite, mobile suite, web build, native build and standalone types all completed successfully. No production deployment or repair was performed.
