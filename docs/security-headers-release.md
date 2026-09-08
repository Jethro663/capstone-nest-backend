# Browser security headers release

Authorized scope: implement and release the discussed application security policy. Cloudflare remains a later infrastructure phase. No mobile inputs change, so no APK is required.

## Reviewed checklist

- [x] Centralize frontend baseline headers and production HSTS without broadening the existing backend HSTS lifetime.
- [x] Generate fresh script nonces for every HTML response and force dynamic rendering; never cache nonce-bearing HTML publicly.
- [x] Preserve route gating, same-origin API requests, YouTube frames/fullscreen, blob document previews, inline component styles, and downloads.
- [x] Support report-only CSP rehearsal before enforcing the identical policy.
- [x] Keep API Helmet ownership separate; supply an explicit API Permissions Policy.
- [x] Prove policy behavior and run frontend/backend required checks and production browser flows.
- [x] Add CI and post-deployment header regression gates.
- [ ] Commit/push the verified revision, observe CI and deployment, check live headers and external grade.

Design: use a strict nonce script policy on all HTML routes, including the homepage. This avoids shipping an inline-script exception on the scanned page. The root layout opts into dynamic rendering, trading HTML prerender caching for uniform script protection. Static resources retain their existing caching. Inline styles remain allowed because current React components rely on them; this does not permit inline scripts. Same-origin and blob frames support document previews; YouTube is the only external frame origin. Browser privileges not used by Nexora are disabled, while fullscreen remains available to same-origin and YouTube frames. API responses retain Helmet policies rather than receiving HTML CSP.

HSTS requires special care: the existing same-domain API already sends a one-year includeSubDomains policy. Adding a shorter frontend value would repeatedly overwrite that host-wide browser policy. Keep the existing value consistent, do not enable preload, and document this pre-existing commitment rather than claiming a fresh staged HSTS rollout.

Production verification exposed Next.js 16.2.10's missing nonce on boundary scripts (upstream issue 97882). A narrowly guarded build-time compatibility patch adds the existing request nonce to that renderer in both module formats. It fails closed if the dependency implementation changes and must be removed when an upstream version fixes the defect. The production HTML/browser gates exercise the patched behavior. Zod's optional JIT is disabled before client application initialization so validation does not attempt dynamic code execution under CSP.

## Verification commands and operating notes

- `npm run build` includes the guarded Next.js compatibility patch.
- `node scripts/check-security-headers.mjs` checks production HTML responses, including auth, redirects and 404s, for baseline headers, unique nonces, correctly authorized scripts and private caching.
- `node scripts/security-browser-smoke.mjs` checks public/auth hydration, controlled YouTube and blob PDF previews, and injected HTML script blocking. It does not contact a real video service for the controlled frame fixture.
- `SECURITY_CHECK_ROLES=true` additionally exercises existing localhost seed accounts through the real API for student, teacher and administrator dashboards/classes/profiles. This is intentionally prohibited on public hosts.
- `CSP_REPORT_ONLY=true` on the server enables rehearsal; set the same variable on the check scripts. Browser violation events are inspected directly; no endpoint collects sensitive URL reports.
- `SECURITY_CHECK_ORIGIN` selects the server (default localhost port 3101); `SECURITY_CHECK_API=true` additionally checks that the API still owns its Helmet policy.
- The notification connection allowlist derives from the same public socket/API origin configuration as the notification client, including its WSS equivalent.
- CI executes the built-server header/browser gate before a change can qualify for release. The deployment workflow includes the public check after deployment. GitHub executes `workflow_run` from the default branch (`master`); until the workflow update is promoted there, releases from `developement` require the explicit public post-deployment check performed for this release. No unrelated default-branch history is promoted as part of this change.
- Header checks are one security control, not a complete penetration test. Cloudflare onboarding, HSTS preload, a general vulnerability audit, and mobile packaging are outside this application-header release.

Local release evidence: backend lint (zero errors, 2298 existing warnings), 122 suites/1322 unit tests, two suites/five E2E tests and production build passed. Frontend lint, explicit typecheck, 176 suites/774 tests and production build passed. Both enforced and report-only production servers passed the HTTP and public browser checks. Enforced mode also passed real local seed sessions for all three roles. The final public deployment and external scan are tracked by the release task and associated GitHub runs.
