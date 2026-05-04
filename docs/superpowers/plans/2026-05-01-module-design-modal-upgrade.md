# Module Design Modal Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the teacher module design modal with 8 subject stock SVGs, deterministic gradient/image mode behavior, local crop-preview before save, and hardened image upload validation.

**Architecture:** Keep the modal state local until save. Stock SVG and gradient selections persist through the existing module update path, while custom images are validated, cropped client-side, then uploaded as processed blobs only during save. Backend upload hardening moves validation ahead of persistence and derives the stored extension from verified image content rather than trusting the original filename.

**Tech Stack:** Next.js App Router, React 19, Jest, NestJS 11, Multer, file-signature validation, canvas-based image processing, local SVG assets.

---

### Task 1: Frontend modal state and regression coverage

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/workspace.css`
- Test: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.test.tsx` or nearest route-local teacher test file

- [ ] Write failing tests for gradient/image conditional rendering and save-time-only upload.
- [ ] Run focused Jest to confirm the current modal behavior fails those assertions.
- [ ] Refactor modal state so theme mode switches deterministically and custom uploads remain local drafts until save.
- [ ] Run focused Jest again until the new behavior passes.

### Task 2: Subject stock SVG library and custom crop preview

**Files:**
- Create: `next-frontend/public/images/modules/module-stock-math.svg`
- Create: `next-frontend/public/images/modules/module-stock-science.svg`
- Create: `next-frontend/public/images/modules/module-stock-english.svg`
- Create: `next-frontend/public/images/modules/module-stock-filipino.svg`
- Create: `next-frontend/public/images/modules/module-stock-ap.svg`
- Create: `next-frontend/public/images/modules/module-stock-tle.svg`
- Create: `next-frontend/public/images/modules/module-stock-mapeh.svg`
- Create: `next-frontend/public/images/modules/module-stock-esp.svg`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/workspace.css`

- [ ] Add the 8 SVG stock assets in the existing module illustration style.
- [ ] Wire the modal stock grid to those subject-specific assets.
- [ ] Add custom image preview, drag-to-move crop area, zoom control, and reset behavior.
- [ ] Verify the preview uses the same cover aspect ratio as module cards.

### Task 3: Frontend file validation and processed upload

**Files:**
- Modify: `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- Test: route-local teacher module modal tests

- [ ] Add local validation for extension, MIME, zero-byte files, oversize files, and invalid dimensions before preview.
- [ ] Convert the cropped preview into a processed image blob during save.
- [ ] Upload only on save through `moduleService.uploadCover`.
- [ ] Keep the modal open with preserved draft state when upload fails.

### Task 4: Backend upload hardening and verification

**Files:**
- Modify: `backend/src/modules/content-modules/content-modules.controller.ts`
- Modify: `backend/src/modules/content-modules/content-modules.controller.spec.ts`
- Modify: `backend/package.json`

- [ ] Add failing backend tests for spoofed MIME, disallowed extension, oversize input, and accepted PNG/JPEG/WebP uploads.
- [ ] Replace MIME-only acceptance with verified-image validation before persistence.
- [ ] Store uploaded covers using a server-chosen filename and verified extension.
- [ ] Run focused backend Jest until the upload validation cases pass.

### Task 5: Final verification

**Files:**
- Verify touched frontend/backend files only

- [ ] Run `npx eslint "app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx"` in `next-frontend`.
- [ ] Run focused frontend Jest for the teacher route modal tests.
- [ ] Run focused backend Jest for the controller upload tests.
- [ ] If runtime is available, manually verify `/dashboard/teacher/classes/[id]` for mode switching, stock selection, preview cropping, and save behavior.
