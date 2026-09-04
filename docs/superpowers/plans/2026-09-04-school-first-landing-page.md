# School-First GABHS Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the LMS-first Nexora marketing page with an authentic, school-first Gat Andres Bonifacio High School public homepage whose gallery, DepEd direction, and school identity lead naturally into Nexora as the school’s digital campus.

**Architecture:** Keep the public `/` route as a server-owned metadata boundary, move the existing session probe and authenticated-user redirect into a focused client landing component, and isolate the interactive photo explorer in its own client component. Store school copy and gallery metadata in a typed content module so the page structure, interaction code, and official text remain independently understandable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4/global CSS, `next/image`, existing Radix Dialog wrapper, Jest, React Testing Library.

## Global Constraints

- Work in the current workspace and on the current `developement` branch; do not create a worktree.
- The public page must make Gat Andres Bonifacio High School the subject and position Nexora as a later digital-campus service.
- Preserve `/dashboard` as the portal route and preserve the existing authenticated-user redirect behavior.
- Preserve the working `/downloads/nexora-student-mobile-release.apk` download; do not modify mobile code or rebuild the APK because this change is web-only.
- Use all eight user-supplied `next-frontend/public/school/*.jpg` photographs in the explorer without renaming or modifying the original files.
- Present the user-supplied DepEd Vision, Mission, and four Core Values without paraphrasing their official content.
- Do not invent enrollment numbers, school history, event names, dates, people’s names, achievements, or admissions claims.
- Keep photo captions factual and limited to what is visibly supported by each image.
- No autoplay carousel, decorative glassmorphism, floating cards, status chips, fake product metrics, or public-facing deployment warnings.
- Gallery controls must work with buttons and keyboard focus; the enlarged view must use the repo’s accessible Radix Dialog primitive.
- Honor `prefers-reduced-motion`; routine controls may change color, border, or opacity but must not translate or float.
- Use one final scoped commit after all planned implementation and verification steps pass, then push and watch the exact commit’s CI/deployment checks.

---

## Confirmed Findings Behind the Plan

1. `next-frontend/app/page.tsx` is a 775-line client component that leads with “One LMS front door,” LMS role cards, AI drafting, workflow status, and self-referential redesign copy.
2. The rendered first viewport makes the school seal a small brand accessory while a large Nexora/SaaS composition dominates the page.
3. The current landing CSS explicitly supplies blurred orbs, grid overlays, glass panels, pills, gradient buttons, floating transforms, and shimmer animation.
4. Vision, Mission, and Core Values are absent. School contact information appears only in the footer.
5. The apparent “View the flow” affordances are not links, and the APK section exposes an internal hosted-API rollout warning to public visitors.
6. The eight supplied photographs are high-resolution, primarily 2048x1536, and collectively show campus spaces, student participation, community gatherings, recognition, and moving-up activity.
7. The strongest existing hero candidate is `791933621_2895773317474311_1497442847657673928_n.jpg`: it combines learners, recognisable red campus architecture, and an open corridor without requiring invented context.
8. The photo set does not contain a clean exterior establishing shot with the school name; the design therefore uses the strongest people-and-place photograph and does not pretend an exterior asset exists.
9. Current tests cover the removed `/demo` route and `/dashboard` entry only. They do not protect school-first hierarchy, official copy, gallery behavior, or removal of internal marketing/deployment language.

---

### Task 1: Lock School-First Behavior in Failing Tests

**Files:**
- Create: `next-frontend/app/page.landing.test.tsx`
- Delete after replacement: `next-frontend/app/page.demo-cta.test.tsx`
- Create: `next-frontend/src/components/landing/SchoolGallery.test.tsx`

**Interfaces:**
- Consumes: public `/` route and future `SchoolGallery` component.
- Produces: behavioral requirements for page hierarchy, official content, portal/download routes, and gallery selection/dialog controls.

- [ ] **Step 1: Replace the stale CTA-only page test with school-first requirements**

Use the existing `next/navigation` and auth-provider mocks, then assert:

```tsx
expect(screen.getByRole('heading', {
  level: 1,
  name: /gat andres bonifacio high school/i,
})).toBeInTheDocument();
expect(screen.queryByText(/one lms front door/i)).not.toBeInTheDocument();
expect(screen.getByRole('link', { name: /explore school life/i })).toHaveAttribute(
  'href',
  '#school-life',
);
expect(screen.getAllByRole('link', { name: /open nexora/i })[0]).toHaveAttribute(
  'href',
  '/dashboard',
);
expect(screen.getByRole('heading', { name: /our direction/i })).toBeInTheDocument();
expect(screen.getByText(/we dream of filipinos who passionately love their country/i)).toBeInTheDocument();
expect(screen.getByText(/to protect and promote the right of every filipino/i)).toBeInTheDocument();
for (const value of ['Maka-Diyos', 'Maka-tao', 'Makakalikasan', 'Makabansa']) {
  expect(screen.getByText(value)).toBeInTheDocument();
}
expect(screen.getByRole('heading', { name: /our school, connected online/i })).toBeInTheDocument();
expect(screen.getByRole('link', { name: /download student app/i })).toHaveAttribute(
  'href',
  '/downloads/nexora-student-mobile-release.apk',
);
expect(screen.queryByText(/hosted mobile api url/i)).not.toBeInTheDocument();
expect(screen.queryByRole('link', { name: /demo/i })).not.toBeInTheDocument();
```

Also import `metadata` from `./page` and assert the page-specific title starts with `Gat Andres Bonifacio High School` and the icon is `/taguigpic.png`.

- [ ] **Step 2: Write gallery interaction tests against the wished-for component API**

The test imports `SchoolGallery` and `schoolPhotos`, renders the component, selects the second thumbnail by accessible name, advances once, and opens/closes the enlarged view:

```tsx
render(<SchoolGallery photos={schoolPhotos} />);

expect(screen.getByRole('img', { name: schoolPhotos[0].alt })).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', {
  name: `View photograph 2: ${schoolPhotos[1].alt}`,
}));
expect(screen.getByRole('img', { name: schoolPhotos[1].alt })).toBeInTheDocument();

fireEvent.click(screen.getByRole('button', { name: /next photograph/i }));
expect(screen.getByRole('img', { name: schoolPhotos[2].alt })).toBeInTheDocument();

fireEvent.click(screen.getByRole('button', { name: /enlarge selected photograph/i }));
expect(screen.getByRole('dialog', { name: /school photograph/i })).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /close/i }));
expect(screen.queryByRole('dialog', { name: /school photograph/i })).not.toBeInTheDocument();
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
npm test -- --runInBand app/page.landing.test.tsx src/components/landing/SchoolGallery.test.tsx
```

Expected: FAIL because `SchoolGallery`, school-first headings, official copy, page metadata, and gallery controls do not exist yet, while the old LMS-first hero still exists.

---

### Task 2: Create the Typed School Content Source

**Files:**
- Create: `next-frontend/src/components/landing/school-content.ts`

**Interfaces:**
- Produces: `SchoolPhoto`, `schoolPhotos`, `depedVision`, `depedMissionIntro`, `depedMissionCommitments`, `coreValues`, and `nexoraFeatures`.
- Consumed by: `SchoolGallery.tsx`, `SchoolLandingPage.tsx`, and their tests.

- [ ] **Step 1: Define the typed photo and text contracts**

```ts
export type SchoolPhoto = {
  src: string;
  alt: string;
  caption: string;
};

export type MissionCommitment = {
  audience: string;
  statement: string;
};
```

- [ ] **Step 2: Add all eight photographs in stable display order**

Start with `791933621_2895773317474311_1497442847657673928_n.jpg` for the people-and-campus hero context. Include each remaining source exactly once and use descriptive, non-identifying alt text. Captions must stay within visible evidence, such as “Student volunteers support a campus registration activity” or “The school community gathers for a moving-up ceremony.”

- [ ] **Step 3: Add the exact official direction content**

Store the complete supplied Vision as two paragraphs, the Mission introduction verbatim, the four Mission audience statements verbatim, and exactly these values:

```ts
export const coreValues = [
  'Maka-Diyos',
  'Maka-tao',
  'Makakalikasan',
  'Makabansa',
] as const;
```

- [ ] **Step 4: Add a concise Nexora feature list without marketing claims**

Use exactly four visitor-facing capabilities: lessons and learning materials, assessments and progress, announcements and communication, and teacher-guided learning support. Do not add statistics, readiness labels, or guarantees.

---

### Task 3: Implement the Accessible Photo Explorer

**Files:**
- Create: `next-frontend/src/components/landing/SchoolGallery.tsx`
- Test: `next-frontend/src/components/landing/SchoolGallery.test.tsx`

**Interfaces:**
- Consumes: `photos: readonly SchoolPhoto[]`.
- Produces: a controlled selected-image stage, previous/next controls, numbered thumbnail filmstrip, caption/counter, and Radix Dialog enlarged view.

- [ ] **Step 1: Implement selection with wraparound navigation**

```ts
const [selectedIndex, setSelectedIndex] = useState(0);
const selectedPhoto = photos[selectedIndex];
const showPrevious = () => setSelectedIndex((index) => (
  index === 0 ? photos.length - 1 : index - 1
));
const showNext = () => setSelectedIndex((index) => (
  index === photos.length - 1 ? 0 : index + 1
));
```

Render the selected image with `next/image`, an explicit responsive `sizes` value, its factual caption, and a zero-padded counter.

- [ ] **Step 2: Implement visible controls and thumbnails**

Use real `<button type="button">` controls with `aria-label="Previous photograph"`, `aria-label="Next photograph"`, and thumbnail labels in the exact format used by the test. Mark the selected thumbnail with `aria-pressed="true"` and a visible focus ring.

- [ ] **Step 3: Implement the enlarged view using the existing Dialog wrapper**

Use `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, and `DialogDescription` from `@/components/ui/dialog`. The trigger label is `Enlarge selected photograph`; the title contains `School photograph`; the description contains the selected caption. Let Radix provide Escape handling and focus return.

- [ ] **Step 4: Run the gallery test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/components/landing/SchoolGallery.test.tsx
```

Expected: PASS with thumbnail selection, wrap-capable next navigation, and accessible dialog open/close behavior.

---

### Task 4: Build the School-First Page Composition

**Files:**
- Create: `next-frontend/src/components/landing/SchoolLandingPage.tsx`
- Modify: `next-frontend/app/page.tsx`
- Test: `next-frontend/app/page.landing.test.tsx`

**Interfaces:**
- Consumes: school content constants, `SchoolGallery`, `useAuth`, `usePublicSessionProbe`, and `getDefaultDashboardRouteForRole`.
- Produces: public school header, hero, welcome, school-life gallery, DepEd direction, Core Values, Nexora digital-campus chapter, and contact footer.

- [ ] **Step 1: Move client-only session behavior into `SchoolLandingPage`**

Preserve the existing logic exactly:

```ts
usePublicSessionProbe();

useEffect(() => {
  if (loading || !isAuthenticated) return;
  router.replace(getDefaultDashboardRouteForRole(role));
}, [isAuthenticated, loading, role, router]);
```

- [ ] **Step 2: Replace the current page route with a metadata boundary**

`app/page.tsx` must no longer be a client component. It exports page-specific metadata and renders the client composition:

```tsx
export const metadata: Metadata = {
  title: 'Gat Andres Bonifacio High School | Nexora Digital Campus',
  description: 'Discover Gat Andres Bonifacio High School, its learning community, DepEd direction, and Nexora digital campus.',
  icons: {
    icon: '/taguigpic.png',
    shortcut: '/taguigpic.png',
    apple: '/taguigpic.png',
  },
};

export default function LandingPage() {
  return <SchoolLandingPage />;
}
```

- [ ] **Step 3: Build the school-first header and hero**

Header identity is `Gat Andres Bonifacio High School`, with navigation to `#about`, `#school-life`, `#direction`, `#nexora`, and `#contact`. Keep a prominent `Open Nexora` link to `/dashboard`. Use a native `<details>` menu on small screens instead of hiding all school navigation.

The hero uses the first `schoolPhotos` image, the full school name as the only `h1`, a concise public-school introduction, `Explore School Life` linking to `#school-life`, and a secondary `Open Nexora` action. Do not overlay text across learners’ faces.

- [ ] **Step 4: Build the school story and gallery sections**

Add an `#about` section that describes GABHS as a learner-centered public school community in Taguig City without dates, statistics, or unverified claims. Add `#school-life` with the title `Life at GABHS`, plain-language gallery instructions, and `<SchoolGallery photos={schoolPhotos} />`.

- [ ] **Step 5: Build the official Direction and Core Values sections**

Add `#direction` with heading `Our Direction` and a clear `Department of Education Vision and Mission` label. Render Vision as readable paragraphs. Render Mission as its introduction followed by a semantic list of the four stakeholder commitments. Render the four Core Values as one restrained band, not four decorative cards.

- [ ] **Step 6: Build the later Nexora chapter**

Add `#nexora` with heading `Our School, Connected Online`, identify Nexora as the GABHS digital campus, render the four factual feature items, show existing `/NexoraHome.png` as supporting brand artwork, and provide `Open Nexora` plus `Download Student App` actions. Do not include the hosted-API warning.

- [ ] **Step 7: Preserve direct school contact information**

Keep the current address, phone, email, office hours, map target, and 2026 copyright in `#contact`. Use `Gat Andres Bonifacio High School` as the footer identity and describe Nexora as its digital campus rather than the institution itself.

- [ ] **Step 8: Run the page test and verify GREEN**

Run:

```bash
npm test -- --runInBand app/page.landing.test.tsx
```

Expected: PASS for school-first hierarchy, exact official content, portal/download routes, page metadata, and removal of old/internal copy.

---

### Task 5: Replace the Vibe-Coded Landing Visual System

**Files:**
- Modify: `next-frontend/app/globals.css`

**Interfaces:**
- Consumes: class names from `SchoolLandingPage.tsx` and `SchoolGallery.tsx`.
- Produces: campus-red editorial styling, responsive layout, gallery treatment, visible focus states, and reduced-motion behavior.

- [ ] **Step 1: Remove unused effect-heavy landing rules**

Remove the old landing grid, orbs, glass panels, chips, mesh, shimmer/progress, hover transforms, and their reduced-motion selectors. Keep the shared `landing-drift` keyframes only because the separate auth shell still references them.

- [ ] **Step 2: Define a restrained school palette and typography**

Use local landing tokens centered on deep maroon, campus red, warm off-white, charcoal, muted slate, and quiet borders. Use a system serif stack for large institutional headings and the existing system sans stack for body/navigation text. Do not add a dependency or a second application-wide theme.

- [ ] **Step 3: Style the hero and sections from information hierarchy**

Desktop hero is a balanced text/photo split with the photograph as the larger visual field. Mobile places the photograph above or below readable text without text-on-face overlays. Sections use borders, whitespace, and typographic contrast instead of repeated cards.

- [ ] **Step 4: Style the gallery for real exploration**

Give the selected photograph a stable aspect ratio, use `object-fit: cover`, create a horizontally scrollable thumbnail strip on small screens, and use a clear selected border. Ensure next/previous controls remain reachable and visible over light and dark image areas.

- [ ] **Step 5: Style Direction, Values, and Nexora as distinct chapters**

Direction uses an editorial two-column layout on wide screens and one column on mobile. Core Values use one deep-maroon band with four typographic columns. Nexora uses a calm contrasting section and a single artwork panel rather than a fake dashboard.

- [ ] **Step 6: Add focus and reduced-motion safeguards**

All links, summary controls, gallery buttons, and dialog actions receive a visible `:focus-visible` outline. Transitions are limited to color, border, and opacity and are disabled under `prefers-reduced-motion: reduce`.

---

### Task 6: Full Verification, Visual Review, and Delivery

**Files:**
- Verify all files changed by Tasks 1–5 and the eight school photographs.

**Interfaces:**
- Produces: automated-test evidence, build evidence, responsive browser evidence, final commit, pushed SHA, and terminal CI/deployment status.

- [ ] **Step 1: Run focused tests**

```bash
cd next-frontend
npm test -- --runInBand app/page.landing.test.tsx src/components/landing/SchoolGallery.test.tsx
```

Expected: both suites PASS.

- [ ] **Step 2: Run the frontend regression gates**

```bash
npm run typecheck
npm run lint
npm run test -- --runInBand
npm run build
```

Expected: zero type errors, lint within the repo’s configured warning ceiling, all Jest tests pass, and the production build succeeds.

- [ ] **Step 3: Render and inspect desktop and mobile widths**

Start `npm run dev`, open `/` at desktop and mobile viewports, and verify:

- GABHS and a real school photograph dominate the first viewport.
- No horizontal overflow occurs.
- Desktop and native mobile navigation expose all school sections.
- Every gallery thumbnail selects the correct photograph.
- Previous/next wrap correctly.
- Dialog opens, closes, and returns focus.
- Vision, Mission, and all four values are readable without clipping.
- Nexora appears after the school sections, while `Open Nexora` remains easy to find.
- Contact links and APK download URL are correct.

- [ ] **Step 4: Inspect the final diff and release scope**

```bash
git status --short --untracked-files=all
git diff --check
git diff --stat
git diff -- next-frontend/app/page.tsx next-frontend/app/globals.css next-frontend/src/components/landing next-frontend/app/page.landing.test.tsx docs/superpowers/plans/2026-09-04-school-first-landing-page.md
git rev-list --left-right --count origin/developement...HEAD
```

Expected: only the school landing implementation, tests, plan, and eight supplied photos are in scope; no whitespace errors; divergence is `0 0` before the final commit.

- [ ] **Step 5: Create one final scoped commit and push**

```bash
git add docs/superpowers/plans/2026-09-04-school-first-landing-page.md \
  next-frontend/app/page.tsx \
  next-frontend/app/page.landing.test.tsx \
  next-frontend/app/page.demo-cta.test.tsx \
  next-frontend/app/globals.css \
  next-frontend/src/components/landing \
  next-frontend/public/school
git commit -m "feat(frontend): make the landing page school-first"
git push origin developement
```

- [ ] **Step 6: Prove delivery and watch exact checks**

```bash
git rev-parse HEAD
git rev-parse origin/developement
git rev-list --left-right --count origin/developement...HEAD
git log -5 --oneline --decorate
```

Expected: local and remote SHA match and divergence is `0 0`. Use GitHub CLI to locate runs whose `headSha` equals the pushed SHA, then watch every required CI/deployment run to a terminal conclusion. Do not claim completion while a matching run is queued, in progress, missing, cancelled, or failed.

---

## Plan Self-Review Record

- **Spec coverage:** The plan covers school-first hierarchy, authentic photographs, an explorer for all eight images, exact supplied Vision/Mission/Core Values, a later Nexora chapter, preserved portal/app access, responsive accessibility, tests, final commit, push, and exact-SHA monitoring.
- **Scope discipline:** The plan is frontend-only. It does not change backend contracts, auth behavior, mobile source, or the existing APK binary.
- **Content integrity:** It explicitly prohibits invented school facts and requires factual, non-identifying captions.
- **Interaction integrity:** The gallery has real controls, state, thumbnails, wraparound behavior, and a focus-managed dialog; no decorative false affordances remain.
- **Visual integrity:** Effect-heavy legacy landing rules are removed while the auth shell’s separate dependency on `landing-drift` is preserved.
- **Verification integrity:** Focused behavior, full tests, typecheck, lint, production build, desktop/mobile inspection, diff scope, branch divergence, push equality, and exact-SHA CI/deployment checks are all explicit.
- **Placeholder scan:** No TBD, TODO, “implement later,” or undefined interface remains.
- **Review result:** The plan is decision-complete and ready for inline execution in the current workspace.
