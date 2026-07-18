---
name: route-tutorial-helper
description: Add or improve a top-right question-mark tutorial helper for a mentioned Nexora LMS page or route. Use when the user names a route/page and wants a dynamic helper button, instruction manual modal, tutorial infographic, annotated screenshots, example images/components, onboarding guide, or old-teacher-friendly page walkthrough for a frontend feature.
---

# Route Tutorial Helper

Create route-specific tutorial helpers that explain how to use a page through a `?` button, a paged modal, annotated system-style screenshots, and plain teacher-facing instructions.

## Workflow

1. Route through the repo kernel first.
   Emit `ROUTER_TRACE` and include `next-frontend` plus `testing`. Add other slices only if the target route crosses backend/mobile/AI contracts.

2. Locate the exact route.
   Use Serena first for App Router ownership and symbol/reference discovery. Use `rg`/`rg --files` only to fill filename or non-code gaps such as route tests and route-specific CSS in `next-frontend/app/globals.css` or nearby modules. Do not drift to a similar page.

3. Inspect before editing.
   Read the page header/action area, any existing dialog/sheet components, existing tests, and visual classes. Prefer local patterns already used by the route.

4. Design the guide.
   Build 3-5 pages unless the feature is very small. Each page needs:
   - a plain title
   - a short teacher-facing explanation
   - 3-5 styled instruction items with action labels, guidance text, and optional cautions
   - an annotated visual that points to real controls on the page

5. Add the helper trigger.
   Place a `CircleHelp` icon button in the page's top-right action area. Use an accessible label such as `Module help`. Reset the guide to page 1 when opened.

6. Implement the modal.
   Use the repo's existing dialog components. Include page count, page dots/buttons, `Previous page`, `Next page`, and `Close guide`. Render instructions as guided rows or timeline steps, not plain paragraph text. Keep fake controls in visuals as `span`/`div`, not real `button`, so tab order stays clean.

7. Build annotated visuals.
   Prefer HTML/CSS "system screenshot" components that mirror the actual page UI. Use actual image files only when the user provides them or explicitly requests captured screenshots. Labels must point at real controls and use teacher-readable words.

8. Preserve behavior.
   Do not remove existing actions, filters, tabs, table columns, dialogs, or route parameters. The helper is additive unless the user asks for redesign.

9. Test and verify.
   Add or update focused route tests to open the helper, move forward/back, assert key page text/labels, and close the guide. Run targeted Jest, ESLint, and `git diff --check`. Use browser/Playwright visual checks when layout risk is high or the user provides screenshots.

## Copy Rules

- Write for a non-technical teacher.
- Prefer direct verbs: choose, read, click, review, assign, close.
- Explain consequences before risky actions such as replacing paths, resolving cases, deleting items, or resetting progress.
- Keep each step short enough to scan inside the modal.
- Do not render the instruction body as a generic `<ol><li>...</li></ol>` unless the page already has a strong styled list system. Each step should look like an instruction card/row with a number, action label, and supporting text.
- Use labels that tell the teacher what to do now, such as `Choose`, `Check`, `Open`, `Review`, `Assign`, or `Stop`.

## Instruction Styling Rules

- Give the instruction column a strong visual hierarchy: kicker, page title, one-sentence purpose, then guided step rows.
- Each step row must include a visible step number or marker, a short action label, and a sentence that explains what happens.
- Add an optional caution/help note for risky actions. Style caution notes differently from normal steps.
- Use compact rows, timeline rails, or split label/body layouts so the teacher feels guided through a process.
- Keep typography readable: larger action labels, muted explanatory text, and enough spacing between steps.
- Do not rely on bold text inside plain paragraphs as the only styling.
- Make the final reminder look like a pinned rule or safety note, not another paragraph.

## Visual Rules

- Keep internal LMS helpers calm and utilitarian.
- Use the route's existing palette and spacing. In this repo, preserve the campus-red teacher dashboard style.
- Give mini screenshots stable dimensions, grid tracks, and readable labels so text cannot collapse into one line.
- Use callout pins sparingly. Each page should point to the most important 1-2 controls.
- Avoid decorative cards, fake metrics unrelated to the page, glassy effects, or marketing copy.

## Reference

Read `references/nexora-next-pattern.md` when implementing in `capstone-nest-react-lms` for the concrete React/CSS/test pattern.
