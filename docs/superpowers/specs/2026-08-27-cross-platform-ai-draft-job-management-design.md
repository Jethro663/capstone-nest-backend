# Cross-Platform AI Draft Job Management Design

## Goal

Give teachers one server-backed AI quiz-draft job history that is consistent across the web class Assignments tab and the mobile Assessments tab. Each job must show a meaningful quiz title and an accessible status indicator, and every job must be removable without deleting an approved assessment.

## Scope

This change covers quiz-generation jobs owned by the signed-in teacher.

- Web: `/dashboard/teacher/classes/[id]?view=assignments`
- Web resume target: `/dashboard/teacher/classes/[id]/ai-draft`
- Mobile: the teacher `Assessments` tab and `TeacherAiDraft` screen
- Backend: an additive teacher job-list contract plus the existing job deletion contract

Lesson-plan and intervention jobs remain outside these two assessment-focused lists. The shared status presentation must still handle every value in the existing AI generation status enum.

## Current Structure

The web class page embeds the AI Draft Jobs markup inside a large route component. Its list comes from `next-frontend/src/lib/ai-draft-job-tracker.ts`, which stores at most 20 jobs for 14 days in browser `localStorage`. The Assignments tab displays the six most recent entries and polls known active job IDs individually every 10 seconds.

The mobile AI draft screen stores only one active job ID per class in `AsyncStorage`. The teacher Assessments tab has no AI job query or panel, so a job created on web cannot currently appear there.

The backend already exposes ownership-checked status and deletion routes. Deletion is a soft cancellation: it cancels queued work when possible, marks the generation job and output as `cancelled`, and records an audit event. It does not delete the linked assessment. Quiz requests already persist the requested title in `source_filters`, and completed outputs contain the generated or teacher-edited structured-output title, so no schema migration is required.

## Approved Product Decisions

1. Mobile must show jobs created from web, so client-local storage cannot be the authoritative list.
2. Deleting an approved job must keep its linked assessment intact.
3. The delete action is available for every status.
4. Deleting `pending` or `processing` work cancels generation; deleting a terminal job removes it from the visible history.
5. The mobile Assessments tab gets one cross-class AI Draft Jobs panel above the existing Classes with assessments panel.
6. Status meaning must be conveyed by text and an icon or dot as well as color.

## Architecture

```text
ai_generation_jobs + latest ai_generation_outputs + assessments
                            |
                            v
        GET /api/ai/teacher/jobs?jobType=quiz_generation
                    /                         \
                   v                           v
      Web class Assignments              Mobile Assessments
       classId-filtered, limit 6          cross-class, limit 20
                   \                           /
                    \---- DELETE job --------/
                               |
                       status becomes cancelled
                       linked assessment remains
```

The backend becomes the list source of truth. Browser `localStorage` and mobile `AsyncStorage` remain only as compatibility aids for remembering the currently opened draft; neither controls which jobs appear in a history list.

## Backend Contract

Add an authenticated endpoint under the existing AI mentor controller:

```http
GET /api/ai/teacher/jobs?jobType=quiz_generation&classId=<optional-uuid>&limit=<1..50>
```

The endpoint returns the normal `success/message/data` envelope, with `data` as a newest-first array:

```ts
interface TeacherAiJobSummary {
  jobId: string;
  jobType: string;
  classId: string | null;
  title: string;
  status:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'approved'
    | 'cancelled'
    | 'rejected'
    | 'failed';
  progressPercent: number;
  statusMessage: string | null;
  errorMessage: string | null;
  outputId: string | null;
  assessmentId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Contract rules:

- Always filter by `teacherId = currentUser.id`; no caller-supplied teacher ID is accepted.
- Validate `classId`, `jobType`, and `limit` through a query DTO.
- Default `jobType` to `quiz_generation` for this teacher assessment surface.
- Exclude `cancelled` jobs so a successfully deleted row does not reappear.
- Order by job `updatedAt` descending, then `createdAt` descending for deterministic ties.
- Resolve the latest output for every bounded job set, then resolve any linked assessment by `aiGenerationOutputId`. Use bounded batched queries rather than one query per job.
- Resolve `title` in this order: latest output `structuredOutput.title`, request `sourceFilters.title`, then `AI Draft Quiz`.
- Resolve progress from persisted runtime metadata using the existing status fallback rules; terminal statuses report 100 percent.
- Keep the current `DELETE /api/ai/teacher/jobs/:jobId` contract. Do not call the assessment deletion service from the new list components.

No Drizzle schema or migration changes are required.

## Status Presentation

Every client defines an exhaustive mapping for the backend enum:

| Status | Label | Color meaning | List behavior |
| --- | --- | --- | --- |
| `pending` | Queued | Amber | Poll |
| `processing` | Processing | Blue | Poll |
| `completed` | Ready for review | Violet | Show Resume |
| `approved` | Approved | Green | Show Open Assessment when linked |
| `failed` | Failed | Red | Show Resume or retry workflow |
| `rejected` | Rejected | Rose | Show Resume |
| `cancelled` | Cancelled | Gray | Supported by presentation code but excluded from normal lists |

Each badge includes visible label text and a status icon or dot. Unknown runtime values are normalized to a safe active/processing presentation rather than receiving an unstyled badge.

## Web Design

Extract the embedded job list into a focused teacher assessment component. The class page remains responsible for the class ID and refresh lifecycle, while the component owns job rows, accessible badges, actions, empty state, and deletion confirmation.

Web behavior:

- Request the six most recently updated quiz jobs for the current class.
- Poll the list every 10 seconds only while a row is `pending` or `processing` and the Assignments tab is active.
- Display the resolved quiz `title` as the row heading; never display the UUID as the primary label.
- Include status, progress, and relative update time beneath the title.
- Resume links include the selected `jobId` so the AI draft page opens the intended server-backed job, including jobs created on mobile.
- Open Assessment remains available only when `assessmentId` exists.
- Delete opens a confirmation dialog. Active-job copy says generation will be cancelled. Approved-job copy explicitly says the assessment will remain.
- Disable only the row being deleted, await the server response, then refresh the list. On failure, preserve the row and show an error toast.
- The existing local tracker may continue recording a currently opened job for backward compatibility, but the Assignments list no longer reads it as its history source.

The AI draft route accepts an optional `jobId` query parameter. When present, it validates the job through the existing status call, makes it current, and records it in the compatibility tracker. When absent, its existing current-job fallback remains.

## Mobile Design

Add a cross-class AI Draft Jobs panel above Classes with assessments in `TeacherAssessmentsScreen`.

Mobile behavior:

- Fetch the 20 most recently updated quiz jobs owned by the teacher.
- Map `classId` to the already-loaded teacher class list for a subject and section label; use `Class unavailable` if the class is no longer active.
- Show title, class label, accessible status badge, progress, and relative update time.
- Poll every 10 seconds while any visible job is `pending` or `processing`.
- Resume navigates to `TeacherAiDraft` with both `classId` and `jobId`. The AI draft screen prioritizes the route `jobId`, loads its status/result, and then records it as the active compatibility ID.
- Open Assessment navigates to the existing teacher assessment editor when `assessmentId` exists.
- Delete uses the existing confirmation modal and deletion API. Confirmation copy follows the same active versus approved distinction as web.
- After deletion, invalidate/refetch the teacher AI job query. Clear the class-scoped compatibility ID only when it matches the deleted job.
- A job-list loading or network error must not block the existing assessment list. The panel shows an inline retry state while the remainder of the screen stays usable.
- Pull-to-refresh refreshes classes, assessments, and AI jobs together.

## Deletion and Data Safety

Deletion is deliberately non-cascading at the assessment boundary.

- Never call `assessmentService.delete` or `assessmentsApi.delete` from an AI job-list delete action.
- A linked assessment and its questions, attempts, responses, and grades remain unchanged.
- The job transitions to `cancelled`; the default list excludes it after the server confirms success.
- The backend keeps its existing ownership check, queue cancellation, downstream status update, and audit event.
- Duplicate delete submissions are prevented by per-job pending state.
- A failed delete leaves the row visible and actionable.

## Error and Empty States

- Empty: show `No AI draft jobs yet` with the existing Start AI Draft action on web; mobile keeps its normal assessment creation controls.
- List request failure: show an inline retry control without replacing the assessments UI.
- Individual stale or inaccessible job: the server list omits jobs the teacher does not own; clients do not fan out status requests to stale local IDs.
- Missing output title: use the persisted requested title, then `AI Draft Quiz`.
- Missing class: retain the job and use the fallback class label on mobile.
- Missing linked assessment: omit Open Assessment while keeping Resume and Delete.

## Testing Strategy

Backend tests must cover:

- query DTO validation and limit bounds;
- current-teacher ownership filtering;
- optional class filtering and newest-first ordering;
- cancelled-job exclusion;
- generated-title, requested-title, and fallback-title precedence;
- latest-output and linked-assessment mapping without per-row queries;
- status/progress mapping;
- list controller envelope and delegation;
- existing deletion ownership, queue cancellation, response, and audit behavior remaining intact.

Web tests must cover:

- list-service query serialization and response typing;
- title shown instead of UUID;
- every status label and presentation token;
- active-only polling decision;
- selected-job Resume URL;
- conditional Open Assessment action;
- delete confirmation copy for active and approved jobs;
- successful deletion refresh and failed deletion row retention;
- AI draft route hydration from a `jobId` query parameter.

Mobile tests must cover:

- list API query and response normalization;
- query key and active-only polling behavior;
- cross-class title/class/status rendering;
- Resume navigation with `classId` and `jobId`;
- conditional Open Assessment navigation;
- deletion confirmation, query invalidation, error retention, and matching-ID storage cleanup;
- pull-to-refresh including AI jobs;
- the existing assessment list remaining usable during AI-list error states.

Final verification must include targeted backend, web, and mobile tests followed by backend build, web lint/build, and mobile typecheck/test. A browser check of the named web route and a mobile Expo check of the teacher Assessments tab provide the final interaction evidence.

## Out of Scope

- Hard-deleting AI job or output database rows
- Deleting an approved assessment from the AI job list
- Database schema or enum changes
- Pagination or infinite scrolling beyond the bounded recent list
- Admin-wide job browsing
- Lesson-plan or intervention job history in the assessment surfaces
- Changes to AI generation prompts or model behavior

## Success Criteria

- A quiz job created on web appears in the mobile teacher Assessments tab after refresh or polling.
- A quiz job created on mobile appears in the matching web class Assignments tab.
- Every job row uses a meaningful title and an accessible, semantically colored status.
- Delete is available for every status, cancels active work, removes the row after success, and never deletes a linked assessment.
- Resume opens the selected job on both clients.
- Existing assessment creation, editing, publication, attempts, responses, and grades are unaffected.
- Targeted and cross-surface verification commands pass without relying on changes to unrelated dirty worktree files.
