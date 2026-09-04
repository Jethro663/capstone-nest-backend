# Landing Gallery Hotfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lower Nexora image with a code-native GABHS-to-Nexora bridge and add a smooth, reduced-motion-safe crossfade whenever the gallery selection changes.

**Architecture:** Keep the existing landing composition and content contracts. Change only the Nexora section’s left visual, wrap the active gallery image in a keyed Framer Motion layer, and style both through the existing landing CSS namespace.

**Tech Stack:** Next.js 16, React 19, TypeScript, Framer Motion, `next/image`, Jest, React Testing Library, global CSS.

## Global Constraints

- Work on the existing `developement` branch in the current workspace.
- Do not add or replace image assets.
- Preserve Nexora portal and APK links, authenticated-user redirect behavior, gallery controls, dialog behavior, captions, and all eight school photographs.
- Use a 360-millisecond opacity-led crossfade with a subtle scale settle.
- Disable the timed transition and scale change when reduced motion is preferred.
- Keep the change inside the landing page, its tests, and landing CSS.

---

### Task 1: Lock the Hotfix Requirements in Tests

**Files:**
- Modify: `next-frontend/app/page.landing.test.tsx`
- Modify: `next-frontend/src/components/landing/SchoolGallery.test.tsx`

**Interfaces:**
- Consumes: the public landing composition and `SchoolGallery({ photos })`.
- Produces: regression coverage for the image-free Nexora panel and keyed gallery transition layer.

- [ ] **Step 1: Add the failing Nexora replacement assertion**

Assert that no image source contains `/NexoraHome.png` and that an element labelled `GABHS to Nexora digital campus connection` is present.

```tsx
expect(document.querySelector('img[src*="NexoraHome.png"]')).not.toBeInTheDocument();
expect(
  screen.getByLabelText(/gabhs to nexora digital campus connection/i),
).toBeInTheDocument();
```

- [ ] **Step 2: Add the failing gallery transition-state assertion**

Assert that the active stage exposes its selected source through `data-gallery-photo`, then choose photograph two and assert the active transition layer changes.

```tsx
expect(container.querySelector(`[data-gallery-photo="${schoolPhotos[0].src}"]`)).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', {
  name: `View photograph 2: ${schoolPhotos[1].alt}`,
}));
expect(container.querySelector(`[data-gallery-photo="${schoolPhotos[1].src}"]`)).toBeInTheDocument();
```

- [ ] **Step 3: Run the focused suites and verify RED**

Run:

```bash
cd next-frontend
npm test -- --runInBand app/page.landing.test.tsx src/components/landing/SchoolGallery.test.tsx
```

Expected: FAIL because the old Nexora image remains and the gallery has no keyed transition frame.

---

### Task 2: Implement the Replacement Panel and Crossfade

**Files:**
- Modify: `next-frontend/src/components/landing/SchoolLandingPage.tsx`
- Modify: `next-frontend/src/components/landing/SchoolGallery.tsx`
- Modify: `next-frontend/app/globals.css`
- Test: `next-frontend/app/page.landing.test.tsx`
- Test: `next-frontend/src/components/landing/SchoolGallery.test.tsx`

**Interfaces:**
- Consumes: `selectedPhoto`, existing school/Nexora content, and Framer Motion’s `AnimatePresence`, `motion`, and `useReducedMotion`.
- Produces: `.landing-nexora__bridge` and `.landing-gallery__stage-frame` without changing public component props.

- [ ] **Step 1: Replace the Nexora image markup**

Render a labelled `.landing-nexora__bridge` containing the eyebrow `One school community`, a decorative GABHS-to-Nexora route, the heading `Learning continues beyond the classroom.`, supporting copy, and `On campus` / `Online` endpoints. Remove the `/NexoraHome.png` `Image` entirely.

- [ ] **Step 2: Add the keyed crossfade layer**

Import `AnimatePresence`, `motion`, and `useReducedMotion`. Wrap the active stage image in a keyed absolute `motion.span`:

```tsx
<AnimatePresence initial={false}>
  <motion.span
    key={selectedPhoto.src}
    className="landing-gallery__stage-frame"
    data-gallery-photo={selectedPhoto.src}
    initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.012 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.996 }}
    transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
  >
    <Image ... />
  </motion.span>
</AnimatePresence>
```

- [ ] **Step 3: Style the new panel and animation layer**

Make `.landing-gallery__stage-frame` an absolute inset layer. Replace `.landing-nexora__art` styles and responsive selectors with bridge typography, a restrained route line, and two border-separated endpoints. Preserve the current Nexora section breakpoints.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm test -- --runInBand app/page.landing.test.tsx src/components/landing/SchoolGallery.test.tsx
```

Expected: both suites pass.

- [ ] **Step 5: Run frontend verification**

Run:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
```

Expected: no type errors, lint exits within the configured warning ceiling, all Jest suites pass, and the production build completes.

- [ ] **Step 6: Review and release**

Inspect desktop and 390px mobile layouts, confirm the gallery transition and image-free panel, run `git diff --check`, create a scoped hotfix commit, push `developement`, and watch the exact commit’s CI and Railway deployment workflows to terminal success.

## Plan Self-Review

- **Spec coverage:** The plan covers image removal, replacement content, gallery crossfade, reduced motion, tests, responsive inspection, and release verification.
- **Placeholder scan:** No TBD, TODO, deferred implementation, or undefined interface remains.
- **Type consistency:** The existing `SchoolGalleryProps` contract stays unchanged; all new class and data-attribute names match between tests, components, and CSS.
