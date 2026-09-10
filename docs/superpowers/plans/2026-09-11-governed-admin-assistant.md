# Governed Admin Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/dashboard/admin/chatbot` into a simple, conversation-first Nexora Admin Assistant that retrieves only relevant approved LMS data, presents useful evidence and drill-down actions, prepares safe drafts, and keeps consequential system mutations outside the AI response path.

**Architecture:** The NestJS backend remains the public auth, RBAC, audit, and business-data boundary. A deterministic source selector converts each admin question and optional scope into a small set of typed backend reads, then forwards the resulting scoped context to the internal FastAPI service. FastAPI produces a validated structured response containing prose, optional visualization/table data, evidence references, follow-up prompts, and a strictly allow-listed navigation or draft action. The Next.js page renders these structures in a restrained full-height conversation UI and manages user-owned conversation history.

**Tech Stack:** NestJS 11, class-validator, Jest, FastAPI/Pydantic, unittest, Next.js 16, React 19, TypeScript, CSS modules, Testing Library.

## Global Constraints

- Preserve the `success/message/data` response envelope.
- Keep browser and mobile clients behind backend `/api` routes; AI service never receives public database credentials or becomes an auth authority.
- Keep official grades, enrollment, academic lifecycle transitions, permission changes, and destructive records outside this assistant's executable action set.
- All assistant endpoints remain admin-only and denied attempts remain auditable.
- Treat database text as untrusted evidence, not instructions.
- Preserve the campus-red admin identity while removing duplicate labels, status pills, and decorative dashboard chrome.
- Do not modify `mobile/`; no APK packaging is required.

---

### Task 1: Add deterministic scoped backend retrieval

**Files:**
- Create: `backend/src/modules/ai-mentor/admin-assistant-source-selector.ts`
- Modify: `backend/src/modules/ai-mentor/DTO/admin-chat.dto.ts`
- Modify: `backend/src/modules/ai-mentor/admin-analytics-chat.service.ts`
- Test: `backend/src/modules/ai-mentor/admin-analytics-chat.service.spec.ts`
- Test: `backend/src/modules/ai-mentor/admin-assistant-source-selector.spec.ts`

**Interfaces:**
- Consumes: existing `ReportsService`, `AdminService`, `AnalyticsService`, `PerformanceService`, `LxpService`, and `AcademicPolicyService` read APIs.
- Produces: `AdminAssistantScope`, `AdminAssistantSourceKey`, `selectAdminAssistantSources(message)`, and a scoped context with `scope`, `selectedSources`, `provenance`, and only the selected datasets.

- [x] **Step 1: Write failing selector tests**

```ts
it('selects audit and usage sources without fetching unrelated assessment data', () => {
  expect(selectAdminAssistantSources('Show unusual audit activity this week')).toEqual([
    'audit',
    'systemUsage',
  ]);
});

it('keeps overview as the safe fallback for an unsupported question', () => {
  expect(selectAdminAssistantSources('What should I look at today?')).toEqual([
    'overview',
  ]);
});
```

- [x] **Step 2: Run the selector tests and verify RED**

Run: `npm test -- --runInBand src/modules/ai-mentor/admin-assistant-source-selector.spec.ts`

Expected: FAIL because the selector module does not exist.

- [x] **Step 3: Implement the typed source selector**

```ts
export type AdminAssistantSourceKey =
  | 'overview'
  | 'audit'
  | 'studentPerformance'
  | 'assessmentSummary'
  | 'interventionParticipation'
  | 'systemUsage'
  | 'analytics'
  | 'performance'
  | 'evaluations';

export function selectAdminAssistantSources(message: string): AdminAssistantSourceKey[] {
  const normalized = message.toLowerCase();
  const selected = new Set<AdminAssistantSourceKey>();
  if (/audit|log|changed|anomal|suspicious/.test(normalized)) selected.add('audit');
  if (/usage|activity|login|completion|submission|today|week/.test(normalized)) selected.add('systemUsage');
  if (/risk|at-risk|learner|student|grade|score/.test(normalized)) selected.add('studentPerformance');
  if (/assessment|quiz|exam|assignment|subject/.test(normalized)) selected.add('assessmentSummary');
  if (/intervention|remedial|case|checkpoint/.test(normalized)) selected.add('interventionParticipation');
  if (/evaluation|feedback|satisfaction/.test(normalized)) selected.add('evaluations');
  if (/mastery|recommendation|transition|performance/.test(normalized)) selected.add('performance');
  if (/overview|dashboard|total|count|school|system/.test(normalized)) selected.add('overview');
  return selected.size ? [...selected] : ['overview'];
}
```

- [x] **Step 4: Write failing backend service tests for scoped retrieval**

```ts
it('fetches only audit and usage data for an audit activity question', async () => {
  await service.chat(ADMIN_USER, {
    message: 'Show unusual audit activity this week',
    scope: { timeRange: 'last_7_days' },
  });

  expect(mockAdminService.getAuditLogs).toHaveBeenCalled();
  expect(mockReportsService.getSystemUsage).toHaveBeenCalled();
  expect(mockReportsService.getAssessmentSummary).not.toHaveBeenCalled();
  expect(mockProxy.forward).toHaveBeenCalledWith(
    'POST',
    '/admin/chat',
    ADMIN_USER,
    expect.objectContaining({
      context: expect.objectContaining({
        selectedSources: ['audit', 'systemUsage'],
      }),
    }),
  );
});
```

- [x] **Step 5: Run the service test and verify RED**

Run: `npm test -- --runInBand src/modules/ai-mentor/admin-analytics-chat.service.spec.ts`

Expected: FAIL because the service still fetches every source and the DTO has no scope.

- [x] **Step 6: Add validated scope fields and conditional readers**

Add `AdminAssistantScopeDto` with `timeRange` (`current_period`, `last_7_days`, `last_30_days`, `all_available`) plus optional UUID `classId`, `sectionId`, `studentId`, and `teacherId`. Convert the time range into server-side `dateFrom`/`dateTo`; never trust client-provided dates. Build `ReportQuery` from validated IDs and the current academic policy period. Each selected reader must return its data and one provenance entry:

```ts
type AdminAssistantProvenance = {
  source: string;
  label: string;
  href: string;
  fetchedAt: string;
  filters: Record<string, unknown>;
  recordCount: number;
  total: number | null;
  truncated: boolean;
};
```

Use a limit of 25 for row-bearing reports, expose `total`, and mark `truncated` when total exceeds returned rows. Always include current school year and period in `scope`; fetch no unselected dataset.

- [x] **Step 7: Run selector and service tests and verify GREEN**

Run: `npm test -- --runInBand src/modules/ai-mentor/admin-assistant-source-selector.spec.ts src/modules/ai-mentor/admin-analytics-chat.service.spec.ts`

Expected: PASS with conditional reads, server-derived scope, and provenance assertions.

### Task 2: Return validated evidence, tables, follow-ups, and safe actions

**Files:**
- Modify: `ai-service/app/main.py`
- Modify: `ai-service/app/schemas.py`
- Test: `ai-service/tests/test_admin_analytics_chat.py`
- Modify: `backend/src/modules/ai-mentor/DTO/admin-chat.dto.ts`
- Modify: `next-frontend/src/types/admin-chatbot.ts`
- Modify: `next-frontend/src/services/admin-chatbot-service.ts`
- Test: `next-frontend/src/services/admin-chatbot-service.test.ts`

**Interfaces:**
- Consumes: the scoped context and provenance contract from Task 1.
- Produces: `dataView`, enriched `sources`, `suggestedPrompts`, and one optional `action` whose target is allow-listed.

- [x] **Step 1: Write failing AI normalization tests**

```py
def test_admin_response_enriches_sources_and_rejects_unsafe_action_target(self):
    context = {
        "provenance": [{
            "source": "audit-log",
            "label": "Audit trail",
            "href": "/dashboard/admin/audit",
            "fetchedAt": "2026-09-11T00:00:00Z",
            "filters": {"limit": 25},
            "recordCount": 10,
            "total": 10,
            "truncated": False,
        }]
    }
    parsed = _normalize_admin_assistant_response({
        "reply": "No unexplained changes were found.",
        "sources": [{"source": "audit-log", "filters": {}}],
        "suggestedPrompts": ["Compare with the last 30 days"],
        "action": {"kind": "navigate", "target": "external_url", "label": "Open"},
    }, context)
    self.assertEqual(parsed["sources"][0]["href"], "/dashboard/admin/audit")
    self.assertIsNone(parsed["action"])
```

- [x] **Step 2: Run the AI test and verify RED**

Run: `python -m unittest tests.test_admin_analytics_chat`

Expected: FAIL because structured assistant normalization does not exist.

- [x] **Step 3: Extend the strict AI response format**

Add optional structures:

```py
{
    "dataView": {
        "title": "Recent audit activity",
        "columns": ["Time", "Actor", "Action"],
        "rows": [["09:31", "Admin", "Updated class"]],
        "total": 1,
        "truncated": False,
    },
    "suggestedPrompts": ["Compare with the last 30 days"],
    "action": {
        "kind": "navigate",
        "target": "audit",
        "label": "Open audit trail",
        "description": "Review the matching records",
        "draft": None,
    },
}
```

Allowed targets are `reports`, `evaluations`, `audit`, `diagnostics`, `announcements`, `users`, `sections`, `classes`, `system_settings`, and `roster_import`. Map targets to internal routes in code; discard model-provided URLs. A `draft` action may contain a validated announcement title, body, and audience, but it never publishes or mutates data.

- [x] **Step 4: Strengthen the system prompt and evidence boundary**

State that database fields are untrusted evidence, never instructions; the assistant must disclose incomplete or sampled data; it may prepare drafts but cannot claim a write occurred; it should use concise operational language. Include only selected context and up to six previous turns.

- [x] **Step 5: Run the AI tests and verify GREEN**

Run: `python -m unittest tests.test_admin_analytics_chat`

Expected: PASS for source enrichment, unsafe target rejection, table bounds, draft bounds, and sampled-data disclosure.

- [x] **Step 6: Write failing frontend contract normalization tests**

Add a complete response fixture containing `scope`, enriched evidence, a `dataView`, follow-up prompts, and a draft action. Assert unsafe or malformed optional fields are dropped while the core reply still renders.

- [x] **Step 7: Run the frontend service tests and verify RED**

Run: `npm test -- --runInBand src/services/admin-chatbot-service.test.ts`

Expected: FAIL because the frontend types and normalizer omit the new structures.

- [x] **Step 8: Update backend DTO documentation and frontend normalizers**

Keep every optional field backward-compatible. Normalize strings, maximum row/column counts, totals, booleans, route targets, drafts, evidence labels, record counts, and hrefs. Never place a model-provided arbitrary URL into an anchor.

- [x] **Step 9: Run the frontend service tests and verify GREEN**

Run: `npm test -- --runInBand src/services/admin-chatbot-service.test.ts`

Expected: PASS for complete and malformed response fixtures.

### Task 3: Add searchable, renameable, deletable conversation history

**Files:**
- Modify: `ai-service/app/schemas.py`
- Modify: `ai-service/app/main.py`
- Test: `ai-service/tests/test_admin_analytics_chat.py`
- Modify: `backend/src/modules/ai-mentor/DTO/admin-chat.dto.ts`
- Modify: `backend/src/modules/ai-mentor/admin-analytics-chat.service.ts`
- Modify: `backend/src/modules/ai-mentor/ai-mentor.controller.ts`
- Test: `backend/src/modules/ai-mentor/ai-mentor.controller.spec.ts`
- Test: `backend/src/modules/ai-mentor/admin-analytics-chat.service.spec.ts`
- Modify: `next-frontend/src/services/admin-chatbot-service.ts`
- Test: `next-frontend/src/services/admin-chatbot-service.test.ts`

**Interfaces:**
- Produces: `PATCH /api/ai/admin/sessions/:sessionId` with `{ title }` and `DELETE /api/ai/admin/sessions/:sessionId`, both user-owned and admin-only.

- [x] **Step 1: Write failing AI session management tests**

Test that rename updates only rows matching `user_id`, `session_id`, and `admin_analytics_chat`; delete uses the same ownership boundary; missing sessions return 404; rename titles are trimmed and length-limited.

- [x] **Step 2: Run the AI test and verify RED**

Run: `python -m unittest tests.test_admin_analytics_chat`

Expected: FAIL because PATCH and DELETE handlers are absent.

- [x] **Step 3: Implement user-owned rename and delete**

Store the renamed title in each matching row's JSONB `context_metadata.title`, read it when normalizing history/session payloads, and delete only assistant-session log rows owned by the requesting admin. Commit each mutation once after a matching-row check.

- [x] **Step 4: Run AI session tests and verify GREEN**

Run: `python -m unittest tests.test_admin_analytics_chat`

Expected: PASS for rename, delete, ownership, and missing-session behavior.

- [x] **Step 5: Write failing NestJS delegation and audit tests**

Test the controller routes, admin assertion, proxy paths, and audit events `admin_ai_session_renamed` and `admin_ai_session_deleted`.

- [x] **Step 6: Run backend tests and verify RED**

Run: `npm test -- --runInBand src/modules/ai-mentor/ai-mentor.controller.spec.ts src/modules/ai-mentor/admin-analytics-chat.service.spec.ts`

Expected: FAIL because the routes and service methods are absent.

- [x] **Step 7: Add validated NestJS routes and service methods**

Use `ParseUUIDPipe`, `AdminAnalyticsSessionUpdateDto`, the existing access assertion, backend proxy forwarding, and audit logging after a successful operation. Preserve the envelope returned by AI service.

- [x] **Step 8: Run backend tests and verify GREEN**

Run: `npm test -- --runInBand src/modules/ai-mentor/ai-mentor.controller.spec.ts src/modules/ai-mentor/admin-analytics-chat.service.spec.ts`

Expected: PASS for admin-only session management and audit logging.

- [x] **Step 9: Write failing frontend service tests, implement methods, and verify GREEN**

Add `renameSession(sessionId, title)` and `deleteSession(sessionId)` using backend `/ai/admin/sessions/:sessionId`. Run the service test before implementation to observe RED, then rerun to PASS.

### Task 4: Replace the cluttered page with the conversation-first assistant

**Files:**
- Create: `next-frontend/src/components/admin/admin-assistant/AdminAssistantHistory.tsx`
- Create: `next-frontend/src/components/admin/admin-assistant/AdminAssistantResponse.tsx`
- Create: `next-frontend/src/components/admin/admin-assistant/AdminAssistantWelcome.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/chatbot/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/admin/chatbot/admin-chatbot.module.css`
- Test: `next-frontend/app/(dashboard)/dashboard/admin/chatbot/page.test.tsx`
- Create: `next-frontend/src/components/admin/admin-assistant/AdminAssistantResponse.test.tsx`

**Interfaces:**
- Consumes: Task 2 response types and Task 3 history service methods.
- Produces: one primary chat surface with a collapsible history drawer, starter tasks visible only on empty threads, compact scope control, evidence disclosure, table view, follow-ups, safe action preview, and one outage banner.

- [x] **Step 1: Write failing response renderer tests**

Test a real `AdminAssistantResponse` render containing a table, sampled warning, evidence label/freshness/count, safe internal navigation, draft content, and copy control. Assert arbitrary external hrefs are never rendered.

- [x] **Step 2: Run the response tests and verify RED**

Run: `npm test -- --runInBand src/components/admin/admin-assistant/AdminAssistantResponse.test.tsx`

Expected: FAIL because the component does not exist.

- [x] **Step 3: Implement the structured response renderer**

Use semantic headings, tables, `<details>` for evidence, normal internal links, and a restrained action preview. Assistant content remains open on the page; only the user's message uses a compact bubble. Draft actions support copy and navigation but never call mutation APIs.

- [x] **Step 4: Run response tests and verify GREEN**

Run: `npm test -- --runInBand src/components/admin/admin-assistant/AdminAssistantResponse.test.tsx`

Expected: PASS with accessible table, evidence, and action controls.

- [x] **Step 5: Write failing page behavior tests**

Test that:

- the title is `Admin Assistant`;
- four starter tasks appear only before the first prompt;
- scope is sent with messages;
- history can be opened, searched, renamed, and deleted;
- model name and duplicate trust/status pills are absent;
- offline state is represented by one alert;
- follow-up prompts send a new message;
- the narrow layout uses a drawer rather than stacking history before chat.

- [x] **Step 6: Run page tests and verify RED**

Run: `npm test -- --runInBand 'app/(dashboard)/dashboard/admin/chatbot/page.test.tsx'`

Expected: FAIL against the current analytics workspace UI.

- [x] **Step 7: Build the welcome, history, page, and responsive layout**

Welcome tasks are `Investigate a problem`, `Find records`, `Summarize school activity`, and `Prepare admin work`. Keep `New conversation` in the header. Put search/rename/delete inside the history drawer. Scope choices are current period, last 7 days, last 30 days, and all available data. Hide infrastructure details unless degraded. At widths below 1080px, the drawer overlays the chat and closes on selection or Escape.

- [x] **Step 8: Run page tests and verify GREEN**

Run: `npm test -- --runInBand 'app/(dashboard)/dashboard/admin/chatbot/page.test.tsx' src/components/admin/admin-assistant/AdminAssistantResponse.test.tsx`

Expected: PASS for the conversation flow, scope, history, evidence, actions, outage state, and responsive drawer semantics.

- [ ] **Step 9: Review the rendered route**

Run the frontend against an available backend or a deterministic mocked browser fixture. Verify desktop at 1440x900, laptop at 1024x768, and mobile at 390x844. Confirm keyboard focus, Escape behavior, drawer overlay, table overflow, one visible primary action, and no horizontal page scroll.

### Task 5: Contract, regression, release, and live verification

**Files:**
- Review: all changed files
- Update only if behavior changed: `docs/superpowers/plans/2026-09-11-governed-admin-assistant.md`

**Interfaces:**
- Consumes: Tasks 1-4 final code and tests.
- Produces: verified commit on `developement`, CI run, Railway deployment run, and public-route/live-service evidence tied to the exact SHA.

- [x] **Step 1: Run focused checks**

```bash
cd backend && npm test -- --runInBand src/modules/ai-mentor/admin-assistant-source-selector.spec.ts src/modules/ai-mentor/admin-analytics-chat.service.spec.ts src/modules/ai-mentor/ai-mentor.controller.spec.ts
cd ai-service && python -m unittest tests.test_admin_analytics_chat
cd next-frontend && npm test -- --runInBand src/services/admin-chatbot-service.test.ts 'app/(dashboard)/dashboard/admin/chatbot/page.test.tsx' src/components/admin/admin-assistant/AdminAssistantResponse.test.tsx
```

- [x] **Step 2: Run required affected-surface gates**

```bash
cd backend && npm run lint && npm run test -- --ci && npm run build
cd ai-service && python scripts/run_tests.py
cd next-frontend && npm run lint && npm run typecheck && npm run test -- --ci && npm run build && npm run dev:smoke
```

Expected: every command exits 0. Diagnose unrelated failures explicitly; never weaken a gate.

- [x] **Step 3: Audit requirements and final diff**

Confirm scoped retrieval, evidence, scope, safe action allow-list, no official-record mutation, history ownership, audit events, simplified UI, responsive drawer, loading/empty/error/offline states, and backward-compatible contracts. Run `git diff --check`, inspect `git diff --stat`, and review every changed hunk.

- [ ] **Step 4: Commit and verify publication state**

Fetch `origin`, confirm `origin/developement...HEAD` has no unexpected outgoing commit, stage only task-owned files, commit with `feat(admin): add governed admin assistant`, record full SHA, and rerun any check invalidated by hooks.

- [ ] **Step 5: Push and observe exact-SHA CI**

Push `developement`, verify the remote branch contains the recorded SHA, discover the CI run with `gh run list --commit <sha>`, and wait until every required job reaches terminal success.

- [ ] **Step 6: Observe exact-SHA Railway deployment**

Correlate the downstream `Railway Deploy (developement)` run to the CI-tested SHA. Verify backend, frontend, and AI service deployment jobs succeed and the provider reports successful deployments.

- [ ] **Step 7: Verify the live result**

Check backend liveness/readiness and the public frontend route shell/security policy. When authenticated browser credentials are available, exercise one read-only question, evidence disclosure, scope change, history reload, rename, and delete. If credentials are unavailable, report the authenticated runtime boundary rather than claiming it.
