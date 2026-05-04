# Module Design Modal Upgrade

## Scope

Upgrade the teacher module design modal on `/dashboard/teacher/classes/[id]` so it:

1. Provides subject-specific stock SVG designs for the default image mode.
2. Treats `Gradient` and `Image` as mutually exclusive visual modes with clear conditional UI.
3. Replaces the current immediate-upload plus `X/Y/Zoom` sliders flow with a local preview-and-crop workflow before save.
4. Hardens custom-image validation on both frontend and backend.

Out of scope:

- Core-template module design enablement. Core modules remain excluded from the design modal because the normal module update path is intentionally blocked for core template assets.
- Student route changes.
- General module-content editing behavior outside the modal.

## Current State

The current teacher modal has three functional gaps:

1. `Image` mode is gated by an existing `coverImageUrl`, so switching modes is not deterministic.
2. Custom-image upload happens immediately through `POST /modules/:moduleId/cover`, which prevents a true preview/crop/adjust workflow before save.
3. Backend validation for module-cover upload is weak. It accepts any file whose reported MIME starts with `image/`, which is not sufficient for renamed or spoofed files.

## Approved Approach

Implement a local draft editing workflow:

- The modal keeps all edits local in component state until `Save Design`.
- `Gradient` mode renders only gradient controls and live preview.
- `Image` mode renders stock subject SVG choices, custom upload, crop preview, and zoom/position editing.
- If the user selected a custom file, `Save Design` first uploads the processed image, then persists the final module design fields.
- Stock SVG selection continues to save as a static public image path without upload.

## UX Design

### 1. Mode Switch

Behavior:

- `Gradient`
  - Shows gradient chips only.
  - Hides stock image grid.
  - Hides custom upload controls.
  - Hides cropper and image-adjustment controls.
- `Image`
  - Shows stock subject SVG grid.
  - Shows custom upload action.
  - If a custom file is selected, shows crop preview and direct manipulation controls.

The current logic that refuses to switch to `Image` without an existing image URL will be removed.

### 2. Stock SVG Library

Add eight stock SVGs under `next-frontend/public/images/modules/`:

- `module-stock-math.svg`
- `module-stock-science.svg`
- `module-stock-english.svg`
- `module-stock-filipino.svg`
- `module-stock-ap.svg`
- `module-stock-tle.svg`
- `module-stock-mapeh.svg`
- `module-stock-esp.svg`

These should feel consistent with the current module-card illustration style and remain lightweight, flat, and LMS-appropriate.

The modal stock grid should:

- Present all eight subjects.
- Use accessible labels based on subject name.
- Persist the chosen SVG path into `coverImageUrl`.
- Keep `themeKind: 'image'`.

### 3. Custom Upload Preview and Editing

Replace the raw `X Position`, `Y Position`, and `Zoom` sliders with a direct-edit preview:

- A preview frame with the exact aspect ratio used by module cards.
- Drag-to-move interaction inside the frame.
- Zoom slider.
- Crop area constrained to the module-card cover ratio.
- Reset action for the custom image draft.

Recommended implementation:

- Use a small client dependency such as `react-easy-crop`.
- Keep local crop state in the modal:
  - source object URL
  - crop x/y
  - zoom
  - cropped area pixels
  - selected file metadata
- On save, render the cropped image to a canvas and upload the processed blob rather than the raw original file.

This keeps what the user sees in the modal aligned with what gets stored.

## Data Flow

### Gradient Save

1. User chooses `Gradient`.
2. User picks a gradient swatch.
3. Save calls `moduleService.update(moduleId, { themeKind: 'gradient', gradientId, coverImageUrl, imagePositionX, imagePositionY, imageScale })`.

Recommended normalization on save:

- Preserve existing `coverImageUrl` for future reuse, but the preview/render path should rely on `themeKind === 'gradient'`.
- Reset preview-only crop draft state after save or close.

### Stock SVG Save

1. User chooses `Image`.
2. User picks one stock SVG.
3. Save calls `moduleService.update(moduleId, { themeKind: 'image', coverImageUrl: stockSvgPath, imagePositionX: 50, imagePositionY: 50, imageScale: 120 })`.

### Custom Image Save

1. User chooses `Image`.
2. User picks a local file.
3. Frontend validates file before preview.
4. User crops/zooms/repositions locally.
5. On save:
   - canvas renders processed image
   - processed blob is uploaded via `moduleService.uploadCover`
   - returned `coverImageUrl` is applied through the module response
   - modal closes after final success

The upload should no longer happen during file selection.

## Frontend Changes

### Teacher Page

File:

- `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`

Changes:

- Expand stock-image catalog from 3 to 8 subject SVGs.
- Refactor module design draft state so custom upload is local until save.
- Add explicit local image-draft state separate from persisted module fields.
- Change theme toggle behavior to unconditional mode switching.
- Hide/show UI blocks based on `themeKind`.
- Add cropper preview workflow.
- Generate a processed upload blob on save.
- Revoke object URLs on modal close or draft replacement.

### Modal Styling

File:

- `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/workspace.css`

Changes:

- Rework the upload section into:
  - stock-image grid
  - custom upload action area
  - preview/crop frame
  - zoom/reset controls
- Remove the always-visible raw `X/Y` slider presentation from the modal surface.
- Keep the visual language inside the current teacher workspace style.

### Frontend Validation

Reject before preview when any of these fail:

- Extension not in allowlist: `.png`, `.jpg`, `.jpeg`, `.webp`
- MIME not in allowlist: `image/png`, `image/jpeg`, `image/webp`
- File too large
- File size is zero
- Browser cannot decode image dimensions
- Image dimensions below minimum safe threshold
- Image dimensions above maximum safe threshold

Recommended thresholds:

- Max upload size: 5 MB
- Min dimensions: 320x180
- Max dimensions: 6000x6000

Frontend should present specific error messages rather than a generic upload failure toast.

## Backend Changes

### Upload Endpoint Hardening

Files:

- `backend/src/modules/content-modules/content-modules.controller.ts`
- `backend/src/modules/content-modules/content-modules.service.ts`

Changes:

- Replace the current permissive MIME-only gate with a stricter image validation path.
- Enforce:
  - explicit MIME allowlist
  - explicit extension allowlist
  - size limit
  - real file signature verification where practical
- Sanitize filename handling as today, but do not trust the original extension or MIME alone.

Recommended backend processing:

- Validate uploaded buffer as a decodable image.
- Re-encode to a safe canonical format before storing, preferably PNG or WebP.
- Emit the stored file with a server-controlled filename and extension.

This reduces the risk of disguised non-image uploads and normalizes output.

### Save Contract

Keep the existing save surface stable for the frontend:

- `moduleService.update` remains the design persistence path for gradients and stock image URLs.
- `moduleService.uploadCover` remains the upload path, but it should accept only verified image data.

No DTO shape changes are required if the processed file upload remains multipart and the final persisted module fields stay the same.

## Error Handling

Frontend:

- Show inline validation errors for rejected files.
- Keep the previous saved design intact if a new custom file fails validation.
- If upload fails during save, keep the modal open and preserve the local crop state.

Backend:

- Return clear `400` or `415` responses for invalid file type/structure.
- Return `413` or equivalent size errors when limits are exceeded.

## Testing

### Frontend

Add focused tests for:

- Theme toggle hides upload/crop controls in gradient mode.
- Theme toggle shows stock/upload controls in image mode.
- Description/state does not break when switching between stock image and custom image.
- Invalid file types are rejected before upload.
- Save with custom crop uploads only during save, not on file select.

Primary targets:

- `next-frontend/app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx`
- add or extend route-local Jest coverage for the modal behavior

### Backend

Add focused tests for:

- Reject non-image file with spoofed MIME.
- Reject disallowed extension.
- Reject oversize file.
- Accept allowed PNG/JPEG/WebP image.

Primary targets:

- `backend/src/modules/content-modules/content-modules.controller.spec.ts`
- related upload-validation tests if extracted into a helper or pipe

## Verification

Minimum verification after implementation:

1. `npx eslint "app/(dashboard)/dashboard/teacher/classes/[id]/page.tsx"`
2. Focused Jest for the touched teacher route/modal test file.
3. Focused backend Jest for upload validation.
4. Live manual check on `/dashboard/teacher/classes/[id]`:
   - gradient mode hides image controls
   - image mode shows stock/upload controls
   - custom file preview appears
   - crop/zoom changes are reflected
   - save persists final appearance

## Risks

- Client-side cropper integration can leak object URLs or stale state if cleanup is missed.
- Canvas processing can produce large blobs if output settings are not bounded.
- Immediate-upload removal changes modal save semantics, so partial assumptions in existing code must be checked carefully.
- Backend file hardening may require extracting reusable upload validation logic if the controller becomes too large.

## Recommended Sequence

1. Add design spec-approved subject SVG assets.
2. Refactor modal state and mode-switch UI.
3. Add local preview/crop workflow.
4. Change save flow to upload processed blob only on save.
5. Harden backend cover upload validation.
6. Add focused frontend/backend tests.
7. Run targeted verification plus live route check.
