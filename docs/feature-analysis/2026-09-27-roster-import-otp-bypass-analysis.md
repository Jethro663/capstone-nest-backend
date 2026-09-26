# Roster Import OTP Bypass Isolation Analysis

Date: 2026-09-27
Repository revision inspected: `88d11288a58fee99ded44b814b70f04397daecad` (`developement`, equal to `origin/developement`)
Scope: admin bulk registration/roster-import account activation, OTP delivery, login gates, audit evidence, and the September 26 production incident.
Authorization boundary: analysis and this report only; no code, configuration, schema, account, or deployment changes were made.

## 1. Executive verdict

**Verdict: the bypass branch is implemented, deployed, and covered by focused tests, but it was not applied to the reported production import.**

- **Confirmed:** The most recent production roster commit was made by an administrator on 2026-09-26 at 04:16:15 UTC (12:16:15 PHT). Its audit record says `activationMode: email_otp`, not `admin_attested`, and it created 24 accounts.
- **Confirmed:** All 24 imported accounts were still `PENDING` when they were suspended at 04:29:18-19 UTC. They were then archived at 04:29:32-34 UTC. The observed pending state therefore matches the standard OTP path, not a failed `skipVerification=true` write.
- **Confirmed:** Production audit history contains one mode-aware roster import: `email_otp` with 24 created accounts. It contains **zero** `admin_attested` roster imports. Three older imports predate activation-mode auditing.
- **Confirmed:** When `skipVerification=true`, the current backend writes new users as `ACTIVE` and `isEmailVerified=true`, records `admin_attested`, and emits onboarding events with `requiresOTP=false`.
- **Confirmed:** The current web page sends `skipVerification: true` only after the operator enables **Skip verification** and checks the explicit acknowledgment. Focused backend tests passed 20/20; the focused frontend tests passed 8/8.
- **Unverified:** The exact client interaction that caused the administrator to commit with the option off cannot be reconstructed. The server audit proves the final request mode, but the application does not record toggle clicks, browser build/cache state, or a sanitized copy of the commit request.

The immediate root cause is therefore **request-mode mismatch**: the backend received the latest commit as standard `email_otp`. This is not evidence that the `true` branch wrote the wrong state. It is also not live proof that the `true` branch succeeds in production, because no production import has invoked it yet.

Recommendation: do not mass-reactivate or recreate the 24 accounts as an ad hoc fix. Their lifecycle continued through suspension and archival, so recovery should first confirm the intended learners and use the governed restore/re-import path. For future imports, make the server return and display the applied activation mode and resulting active/pending counts instead of letting the success message rely only on client state.

## 2. Feature anatomy

### Account-creation variants

1. **Standard OTP mode**
   - Web sends `skipVerification: false`.
   - Backend creates unmatched roster rows with `status='PENDING'` and `isEmailVerified=false`.
   - `UserCreatedEvent.requiresOTP=true`; the listener requests an email-verification OTP.
   - Login and JWT validation reject the account until it becomes both active and verified.

2. **Administrator-attested activation**
   - Web sends `skipVerification: true` after an explicit acknowledgment.
   - Backend accepts this only when the requesting user has the `admin` role.
   - New unmatched accounts are inserted as `ACTIVE` and verified.
   - The audit mode is `admin_attested`; onboarding still sends the temporary password but does not create an OTP.

3. **Existing matched accounts**
   - Preview matches any existing user by email and puts the row in `registeredRows`.
   - The commit enrolls that user but does not change the user's account status or email-verification state.
   - This is intentional and is stated in the UI: existing accounts are not reactivated by the OTP-skip option.

### Separate concepts that can be confused

- `skipVerification` controls new-account OTP and activation state.
- Admin Maintenance Access is resolved separately and can bypass section membership-window or capacity policy. It does not imply `skipVerification=true`.
- `pendingRosterIds` and `summary.pending` are legacy response names for newly created account IDs/counts even when those accounts are immediately active. These names do not determine the actual `users.account_status` value.
- The roster page's **Import History** reflects roster-resolution history, not the authoritative current account lifecycle state.

### September 26 incident timeline

| Time (UTC / PHT) | Confirmed event | Evidence/result |
|---|---|---|
| 04:16:15 / 12:16:15 | Administrator committed one roster | Audit mode `email_otp`; 24 created account IDs |
| 04:29:18-19 / 12:29:18-19 | The same 24 IDs were suspended | Each `user.suspended` audit row records `previousStatus: PENDING` |
| 04:29:32-34 / 12:29:32-34 | The same 24 IDs were archived | Each `user.archived` row records `previousStatus: SUSPENDED` |
| Afterward | Erasure batch completed | Current aggregate inspection no longer finds those IDs as live student accounts |

No names, emails, LRNs, passwords, or other student identifiers were read into this report.

## 3. Cascade map

| Edge | Provider | Interface/state | Consumer | Effect | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| E1 | Admin roster page | `activateNewAccounts`, default `false` | Commit handler | Controls request mode | Direct, high | Confirmed | `next-frontend/.../roster-import/page.tsx:76-77,232-255` | Keep, but show server-applied result |
| E2 | Admin roster page | Explicit acknowledgment | Commit button | Prevents an unacknowledged bypass commit | Direct, security-sensitive | Confirmed | `page.tsx:234-237,491-535` | Keep |
| E3 | Web service | JSON DTO | `POST /api/roster-import/:sectionId/commit` | Preserves `skipVerification` in transport | Direct | Confirmed | `next-frontend/src/services/roster-import-service.ts:87-102`; controller `:118-129` | Keep |
| E4 | Commit DTO | Optional Boolean `skipVerification` | Validation pipe/service | Whitelists and validates the flag | Direct | Confirmed | `backend/.../dto/roster-import.dto.ts:108-121` | Keep |
| E5 | Roster service | Admin-role check | Commit orchestration | Rejects teacher OTP bypass | Direct, security-sensitive | Confirmed | `roster-import.service.ts:404-417`; test `:671-685` | Keep |
| E6 | Preview service | Email/LRN lookup | `registeredRows` vs `pendingRows` | Existing users do not enter new-account activation branch | Direct, stateful | Confirmed | `roster-import.service.ts:280-364` | Keep; make boundary more visible |
| E7 | Roster service | `accountsToCreate` | `users` table | `true` => active/verified; false => pending/unverified | Direct, authoritative | Confirmed | `roster-import.service.ts:737-760` | Logic is correct in inspected source |
| E8 | Roster service | Audit metadata | `audit_logs` | Records `admin_attested` or `email_otp` | Operational, persisted | Confirmed | `roster-import.service.ts:835-849`; production aggregate query | Use as incident source of truth |
| E9 | Roster service | `UserCreatedEvent.requiresOTP` | User event listener | Creates OTP only in standard mode; sends temporary password in both modes | Transitive, async/external email | Confirmed | `roster-import.service.ts:850-861`; `user-events.listener.ts:21-41` | Keep |
| E10 | Auth service | `status` and `isEmailVerified` | Login | Rejects pending/unverified users | Transitive, security-sensitive | Confirmed | `auth.service.ts:35-56` | Keep |
| E11 | JWT strategy | Same account gates | Protected requests | Prevents inactive/unverified session use | Transitive, security-sensitive | Confirmed | `jwt.strategy.ts:54-68` | Keep |
| E12 | Admin lifecycle | Suspend/archive actions | Imported accounts | Changed the 24 users after import | Persisted/operational | Confirmed | Production audit intersection; `users.service.ts:1369-1388` | Preserve audit; recover only through governed workflow |
| E13 | Commit response | Legacy `pendingRosterIds`/`summary.pending` | UI/other clients | Can semantically imply account state even for active creation | Compatibility risk | Confirmed | `roster-import.dto.ts:124-134`; service `:863-871` | Add clearer aliases without breaking legacy keys |
| E14 | Latest Railway release | Exact SHA `88d11288...` | Production backend/frontend | Confirms inspected logic is deployed | Operational | Confirmed | GitHub deployment run `36255071689`; Railway deployments `cedc68ba...` and `73bc4798...` were `SUCCESS` | No deployment gap found |

## 4. Isolation and safe recovery

### Root-cause isolation

- E7 rules out the hypothesis that `skipVerification=true` intentionally creates pending users.
- E1-E4 show that a true web state should reach the service unchanged.
- E8 is the decisive incident boundary: production recorded `email_otp`, proving the service evaluated the final request as false/absent.
- E12 proves the accounts were genuinely pending before later lifecycle actions; this was not merely an Import History label.
- E14 rules out an obvious stale backend deployment: the activation code was introduced before the import and remains in the exact current deployment.

The remaining causal uncertainty lies before E3: operator action, UI state, or browser/client state. The page resets activation state to false when a file is attached/replaced (`page.tsx:129-144`) and when the target section changes (`page.tsx:303-308`). Those resets are safe defaults, but the audit cannot tell whether either occurred in this incident.

### Recovery prerequisites

1. Identify the intended 24 learners from the existing audit/import-history evidence using an authorized administrator; do not expose their details in general logs or reports.
2. Decide whether the archived lifecycle was intentional. It occurred after import and cannot be silently overridden by the roster bypass.
3. Use a governed restore/reactivate or clean re-import workflow; do not update `users.account_status` directly.
4. Preserve the original `email_otp`, suspension, archive, and erasure audit records.

### Validation for a future fix or acceptance run

1. Use synthetic accounts in a non-production environment.
2. Commit once with the option off and assert pending/unverified plus `email_otp` and OTP creation.
3. Commit once with the option on and acknowledged; assert active/verified plus `admin_attested` and no OTP creation.
4. Verify login using the temporary password and one protected request for the active case.
5. Verify existing pending accounts remain unchanged, matching E6.

Rollback boundary: any UI/reporting enhancement should be independently reversible without changing E5-E11. If a server-acknowledged result cannot be displayed safely, fall back to a neutral “Roster committed; review applied account states” message rather than claiming activation from local state.

## 5. Improvements

### Required decoupling

Return an authoritative commit result such as `activationMode`, `createdActiveCount`, and `createdPendingCount`, and render the success state from that response. The current toast uses the local `activateNewAccounts` value, while the durable truth is decided and audited by the backend.

### Implemented remediation (2026-09-27)

- The backend commit response now returns the applied `activationMode`, `createdActiveCount`, and `createdPendingCount` while retaining the legacy response keys.
- Account state, email verification, onboarding OTP behavior, audit metadata, and the response are derived from the same applied mode.
- The admin page now labels the option as `Activate new accounts now (skip OTP)` and renders the completion message from the server response rather than the local toggle.
- Regression coverage proves that the page does not claim immediate activation when a requested bypass receives an `email_otp` result from the server.

### Optional evidence-backed enhancements

1. Add a final confirmation summary immediately beside Commit: “24 new accounts · Active immediately · No OTP,” with the mode locked for that validated preview.
2. Show the applied activation mode and resulting lifecycle counts in Import History, separate from roster-resolution status.
3. Add backward-compatible `createdAccountIds`/`createdAccountCount` response fields while retaining the legacy `pendingRosterIds`/`summary.pending` keys.
4. Add a real database transaction integration test for both modes; current service tests mock persistence correctly but do not prove a production PostgreSQL write.
5. Add sanitized operational telemetry for commit mode and resulting counts. Do not log emails, LRNs, temporary passwords, or OTPs.

## 6. Uncertainty and coverage boundary

- **Unverified:** Why the administrator believed bypass was enabled while the server received standard mode. No request-body log, client interaction trace, or browser capture exists.
- **Unverified:** The `skipVerification=true` branch has no production audit execution. Deployment and unit/UI tests are confirmed; live production behavior for a true request remains unproven.
- **Unverified:** Whether the later suspension/archive batch was intentional. Its effect and previous statuses are confirmed, but operator intent was not inspected.
- Runtime inspection was read-only and aggregate-only. It did not reproduce an import, send email, activate an account, or inspect student PII.
- Focused searches covered the admin page/service, controller/DTO, roster service and tests, account schema/lifecycle, event listener, login/JWT gates, current Git/CI/deployment provenance, and aggregate production audits. **No additional dependency was found within the inspected scope.**

## Verification evidence

- Backend: `npm test -- --runInBand src/modules/roster-import/roster-import.service.spec.ts src/modules/roster-import/roster-import.controller.spec.ts` -> 2 suites, 20 tests passed.
- Backend full unit suite: 178 suites, 1,802 tests passed; lint and production build passed.
- Frontend: `npm test -- --runInBand --runTestsByPath './app/(dashboard)/dashboard/admin/roster-import/page.test.tsx'` -> 1 suite, 9 tests passed.
- Frontend full unit suite: 200 suites, 910 tests passed; lint, administrator contract/typecheck, and production build passed.
- Local frontend dev smoke was environment-blocked because no backend was listening on `127.0.0.1:3000`; the frontend dev server itself reached ready state in 294 ms.
- Diagnostic baseline CI: run `36254823984` succeeded for exact SHA `88d11288a58fee99ded44b814b70f04397daecad`.
- Diagnostic baseline deployment: run `36255071689` checked out the same exact SHA for backend and frontend; Railway reported both deployments `SUCCESS` and running.
- Production audit: one `email_otp` import with 24 created accounts; zero `admin_attested` imports; all 24 IDs later recorded `PENDING -> SUSPENDED -> archived`.
