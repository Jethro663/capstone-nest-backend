# Discussion Attachment Image Delivery — Isolation Analysis

Date: 2026-09-27
Scope: protected discussion-board thread and comment attachments rendered in the web teacher and student class workspaces
Requested failing route: `/dashboard/teacher/classes/[id]?view=discussion`

## 1. Executive verdict

**Confirmed:** the reported failure is in the browser transport seam. The API returns protected `inlineUrl` and `downloadUrl` paths, while the teacher and student renderers pass those paths directly to Next `<Image>` and `<a>`. A browser image request or direct navigation cannot attach Nexora's in-memory access token, so the globally protected endpoint returns `401 Invalid or expired token` before its class/thread/file access logic runs.

**Confirmed:** the feature is moderately coupled across one backend producer, two protected file route variants, one frontend service, and six visible web consumers: thread cards, selected thread details, and comment attachments in both teacher and student workspaces. The upload paths, role guards, class-membership checks, audit logging, local upload previews, and response DTO shape do not require changes for this transport fix.

**Unverified:** the stored bytes and their authorized MIME response could not be inspected without a valid teacher session because authentication rejects the request before file lookup. The hotfix therefore does not claim to repair or alter stored attachment data.

**Recommendation:** keep the backend routes protected. Add one authenticated blob loader to `discussionBoardService`, normalize backend-produced `/api/...` URLs to the Axios client's `/api` base, create/revoke browser object URLs in one shared hook, and make both teacher and student image cards use the authenticated object URL for display and click-through. Cover thread and comment images through the shared components and preserve link attachments unchanged.

## 2. Feature anatomy

### Confirmed flow

1. The backend maps thread and comment file records to `DiscussionAttachmentResource` objects in `DiscussionBoardService.toThreadAttachmentResource` and `toCommentAttachmentResource`.
2. Those resources contain protected `/api/classes/:classId/discussion-threads/.../attachments/:attachmentId/inline` and `/download` URLs.
3. `DiscussionBoardController` protects all discussion routes with `JwtAuthGuard` and `RolesGuard`; inline routes still call `getThreadAttachmentFile` or `getCommentAttachmentFile` to enforce class/thread visibility and record access audit evidence.
4. `JwtStrategy` extracts the access JWT only from the `Authorization: Bearer` header. The refresh token cookie is deliberately not an access credential.
5. `next-frontend/src/lib/api-client.ts#createApiClient` owns access-token bootstrap, bearer injection, one refresh/retry, and the `/api` proxy base.
6. `TeacherDiscussionAttachmentGallery` and `DiscussionAttachmentList` currently render backend URLs directly. The teacher component is reused for thread summaries, selected-thread attachments, and comment attachments. The student component has the same three consumers.

### Variants

- Thread attachments may be images, ordinary files, or external links.
- Comment uploads are image-only at the controller boundary and use a separate nested inline route.
- Local pre-submit previews use `URL.createObjectURL(file)` and already revoke their URLs. They do not call the backend and are not part of the 401.
- Admin class detail consumes discussion data for moderation but does not currently render attachment images.

### Runtime evidence

`curl` against the reported production inline URL returned HTTP 401 on 2026-09-27. This matches the user's browser result and the bearer-only JWT extractor. An unauthenticated probe cannot prove the stored file bytes, but the failure occurs at authentication before file lookup.

## 3. Cascade map

| Edge | Provider | Interface | Consumer | Effect if unchanged | Risk | Confidence | Evidence | Disposition |
|---|---|---|---|---|---|---|---|---|
| E1 | `DiscussionBoardService` | `inlineUrl` / `downloadUrl` DTO fields | Web discussion service/types | Produces protected relative URLs | Medium | Confirmed | `backend/src/modules/discussion-board/discussion-board.service.ts#toThreadAttachmentResource`, `#toCommentAttachmentResource` | Preserve contract |
| E2 | `DiscussionBoardController` | Thread inline/download routes | Teacher, student, admin roles | Requires bearer auth and membership/readability checks | High | Confirmed | controller class guards and `openThreadAttachmentInline` / `downloadThreadAttachment` | Preserve guards |
| E3 | `DiscussionBoardController` | Comment inline/download routes | Teacher and student comment galleries | Same protected transport for comment images | High | Confirmed | `openCommentAttachmentInline` / `downloadCommentAttachment` | Preserve guards |
| E4 | `JwtStrategy` | Authorization-header extractor | Every protected file request | Direct `<img>` and navigation requests have no bearer token and fail 401 | High | Confirmed | `ExtractJwt.fromAuthHeaderAsBearerToken()` plus production HTTP 401 | Route through API client |
| E5 | `createApiClient` | Axios request/response interceptors | `discussionBoardService` | Adds bearer token and refresh/retry behavior | High | Confirmed | `next-frontend/src/lib/api-client.ts#createApiClient` | Reuse as auth seam |
| E6 | `discussionBoardService` | Current CRUD/upload methods | Teacher/student pages | Has no blob-loading method for returned attachment URLs | Medium | Confirmed | `next-frontend/src/services/discussion-board-service.ts` | Add authenticated blob loader |
| E7 | `TeacherDiscussionAttachmentGallery` | Direct `<Image src={inlineUrl}>` and anchor | Teacher thread list/detail/comments | Broken image and 401 click-through | High | Confirmed | three Serena references in teacher page; reported route | Use object URL |
| E8 | `DiscussionAttachmentList` | Direct `<Image src={inlineUrl}>` and anchor | Student thread list/detail/comments | Same latent failure on student surface | High | Confirmed | three Serena references in student page | Use object URL |
| E9 | Local preview components | `URL.createObjectURL(file)` with cleanup | Teacher thread composer and student comment composer | Works before upload and is independent of auth | Low | Confirmed | `TeacherSelectedDiscussionFilePreviews`, `LocalImagePreviewStrip` | Preserve |
| E10 | Access services | `getThreadAttachmentFile` / `getCommentAttachmentFile` | Inline and download controllers | Enforces class/thread/comment/file ownership and audit logging | High | Confirmed | backend service symbols | Preserve unchanged |

No additional dependency was found within the inspected web/backend discussion attachment scope after focused consumer searches for `inlineUrl`, `downloadUrl`, gallery/list symbols, object-URL usage, and protected route strings.

## 4. Isolation and implementation cuts

1. **Characterization seam (E4–E8):** add a service regression proving a backend `/api/.../inline` URL is requested through `api.get` with `responseType: 'blob'` and without duplicating `/api`.
2. **Lifecycle seam (E6):** add a focused hook that loads only valid protected attachment URLs, exposes loading/failure/object URL state, ignores stale resolutions, and revokes every created object URL on source change or unmount.
3. **Teacher cut (E7):** split each attachment card into a component so hooks are not called inside a map; image display and anchor both use the object URL. Retain external links and current CSS.
4. **Student cut (E8):** apply the same hook to the shared attachment item used by thread cards, selected-thread details, and comments.
5. **Security compatibility (E2–E5, E10):** do not make routes public, accept refresh cookies as access credentials, embed tokens in URLs, alter RBAC, or remove access audit events.

Validation: focused service/hook/teacher/student tests, frontend lint/typecheck/full tests/build, discussion smoke where runtime prerequisites are available, exact-SHA CI, Railway deployment, and a post-deploy HTTP/security check. Rollback is a revert of the frontend-only implementation commit; no data/schema cleanup is needed.

## 5. Improvements

Required: authenticated blob/object-URL delivery for both thread and comment images on teacher and student web surfaces.

Optional, evidence-backed follow-ups:

1. Show an explicit image-unavailable placeholder when the protected fetch fails instead of relying on broken-image browser chrome.
2. Intercept protected non-image attachment clicks and download them through the same authenticated service rather than direct navigation.
3. Add browser coverage with an authenticated fixture so a real `<img>` request regression cannot hide behind mocked URLs.

## 6. Uncertainty and coverage boundary

- The unauthenticated production probe confirms the 401 transport failure but cannot inspect the reported file bytes or MIME response after authorization.
- No live teacher credentials were supplied, so authenticated pre-fix browser reproduction remains unverified unless an existing local browser session is available.
- Native mobile discussion attachment rendering was not found in the scoped consumers and was not expanded because the request names the web route.
