# Student Profile Section Redesign

## Outcome

Replace the student profile's long mixed-purpose page with a focused settings workspace on mobile and web. The final sections are `Profile`, `Requirements`, `Security`, and `Account`. Mobile shows one section at a time; web uses the same information architecture in a GitHub-style settings rail.

The reviewed interactive artifact is:

`/home/jethro/.codex/visualizations/2026/09/26/01a0de59-a8ab-7443-b8b2-5d1a97dfb57e/student-profile-redesign-showcase.html`

## Evidence

- **Confirmed:** `mobile/src/screens/ProfileScreen.tsx` currently renders identity fields, emergency contact, Save, Profile Status, academic shortcuts, Security, Sign Out, and version information in one continuous scroll.
- **Confirmed:** `next-frontend/src/components/profile/StudentProfilePage.tsx` currently has only Profile and Account tabs; Account combines Security, Profile Status, Transcript, and Assessment History.
- **Confirmed:** mobile and web already consume the shared backend profile endpoints. The redesign does not need a schema, DTO, controller, service, or response-envelope change.
- **Confirmed:** mobile routes already exist for `Transcript`, `AssessmentHistory`, and `StudentEvaluations`.
- **Confirmed:** web routes already exist at `/dashboard/student/transcript`, `/dashboard/student/assessment-history`, and `/dashboard/student/evaluations`.
- **Confirmed:** existing required profile data is date of birth, gender, student contact number, home address, guardian name, guardian relationship, and guardian contact number.
- **Inferred:** the user's “mobile exclusive section” means Requirements must be first-class and especially explicit on mobile. The same section is retained on web for contract and terminology parity.
- **Unverified:** physical-device keyboard behavior remains a release acceptance limitation until an Android device or emulator exercises the final APK.

## Decision Ledger

### Keep

- Existing profile read, update, avatar, password-change, logout, transcript, assessment-history, and evaluation behavior.
- Existing backend ownership, API envelopes, roles, permissions, validation, and save-and-lock behavior.
- Current GABHS red, white, and navy tokens, typography, form controls, borders, and app shells.
- Current mobile drawer/tab ownership and current web protected layout.
- Current help button and its route tutorial, updated to describe the new section structure.

### Change

- Render only one purpose-based section at a time.
- Replace Profile Status with Requirements.
- Give every required editable field a visible `Required` label, not a color-only dot.
- Show missing fields by name inside Requirements, with a direct `Review in Profile` action.
- Keep Save as the last action inside Profile; no Security, Account, logout, or version content appears below it.
- Move password controls to Security.
- Make Transcript, Assessment History, and Evaluations equal large Account actions with a title and descriptive sentence.
- Keep Sign Out and app version in mobile Account, after the three academic actions.

### Frozen

- No backend or database changes.
- No new academic records, calculations, permissions, or mutations.
- No changes to the destinations' own behavior.
- No new palette, gradient, decorative metrics, oversized status cards, or nested cards.
- No changes to profile completion or lock semantics.

## Information Architecture

### Profile

- Persistent student identity summary and avatar action.
- School-managed identity fields remain read-only.
- Editable student and emergency-contact fields show `Required` explicitly.
- Missing fields show inline feedback.
- Save is disabled when required information or phone validation is invalid.
- Save remains the final element in this section.

### Requirements

- Compact completion summary: complete, or exact number still missing.
- Missing fields appear first and are named individually.
- Completed fields remain visible as complete without competing with missing items.
- `Review in Profile` switches to Profile without changing data.

### Security

- Existing password-change component and validation remain unchanged.
- Password success and failure feedback remains owned by the existing component.

### Account

- Transcript: “View official grades and academic records by school year.”
- Assessment History: “Review submissions, scores, feedback, and attempt details.”
- Evaluations: “Complete teacher and school evaluations assigned to you.”
- Mobile retains Sign Out and app version below these actions.

## Navigation Contract

| Source | Destination | Operation | Back behavior |
|---|---|---|---|
| Profile section switcher | Profile / Requirements / Security / Account | Local section state | Hardware/browser Back behavior remains owned by the current route shell. |
| Mobile Account | `Transcript` | Existing stack navigation | Returns to Profile/Account through the existing root stack history. |
| Mobile Account | `AssessmentHistory` | Existing stack navigation | Returns to Profile/Account through the existing root stack history. |
| Mobile Account | `StudentEvaluations` | Existing tab navigation | Returns according to the existing student tab history. |
| Web Account | `/dashboard/student/transcript` | Existing App Router push | Browser Back returns to the profile route. |
| Web Account | `/dashboard/student/assessment-history` | Existing App Router push | Browser Back returns to the profile route. |
| Web Account | `/dashboard/student/evaluations` | Existing App Router push | Browser Back returns to the profile route. |

## Responsive Behavior

- Mobile uses a horizontally scrollable section switcher with 44px minimum targets and a visible Requirements count.
- Section labels must fit at 320-430px without overlap; scrolling is allowed if text scaling makes the row wider.
- Web uses a two-column settings layout: narrow section rail and one content panel.
- At narrow web widths, the rail becomes a horizontal section row above the content.
- Long descriptions wrap; no fixed-height action row may clip copy.

## State Matrix

| State | Required behavior |
|---|---|
| Loading | Existing loading treatment remains visible until the profile request settles. |
| Missing fields | Requirements count and named list are visible; Profile labels and missing feedback remain explicit. |
| Complete | Requirements shows completion; Save is available unless the profile is locked. |
| Locked | Editable fields and Save remain disabled; Requirements remains readable. |
| Invalid phone | Inline validation and Save blocking remain unchanged. |
| Save pending | Save shows pending copy and cannot be submitted twice. |
| Profile load error | Existing error feedback remains available without hiding navigation permanently. |
| Offline | No new client-side draft or offline mutation is introduced. Existing request errors remain truthful. |
| Password error | Existing Security component owns field and submission feedback. |

## Verification

- Mobile render tests prove section isolation, visible Required text, Requirements navigation, all three Account destinations, Save payload, and error behavior.
- Web component tests prove four tabs, section isolation, named requirements, required indicators, all three route pushes, existing save/lock behavior, and updated help copy.
- Mobile typecheck and focused Jest tests pass.
- Web focused Jest, lint, typecheck, student palette audit, and production build pass.
- Browser review checks desktop and narrow responsive layouts.
- Because mobile source changes, the existing Android release tooling must prepare, build, verify, embed, checksum, and validate the final APK before shipping.

## Self-Review

- No placeholders or unresolved product choices remain.
- The section names match the reviewed artifact and user request.
- Every visible Account action maps to an existing route.
- The redesign stays client-side and does not contradict backend authority.
- The only remaining evidence limitation is physical-device acceptance, which cannot be inferred from source, tests, or archive validation.
