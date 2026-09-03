## Context

The shared mobile bottom bar currently infers role behavior from available route names. Teacher and administrator navigators each expose six permanent tabs, while the teacher Classes destination still receives a focal treatment designed for the third slot of a five-item bar. On narrow devices this both displaces the focal item and gives long labels too little space. JAHUB Ask currently renders a fixed-height nested scroller inside the 1,400-line `JaScreen`, although its API already supports arbitrary thread retrieval and approved prompt submission.

The change must preserve the existing backend contract, `JaRouteParams`, student theme, Replay and Learner's Path panels, guardrails, rich content, citations, and global student tabs. It must not introduce a keyboard, free text, streaming, new libraries, or persistence changes.

## Goals / Non-Goals

**Goals:**

- Make every role's five permanent destinations stable at narrow Android widths.
- Keep Announcements truthfully reachable without using scarce permanent-tab space.
- Let JAHUB Ask own the available screen as one conversation surface with preset-only prompts.
- Make thread resume, New Chat, lesson grounding, stale context, and sheet behavior deterministic and testable.
- Limit the refactor to the Ask experience so structured Replay and Learner's Path behavior remains intact.

**Non-Goals:**

- Changing public backend APIs, DTOs, storage, or AI guardrails.
- Adding free-text input, streaming responses, optimistic retries, or a new navigation/sheet/chat dependency.
- Rewriting Replay or Learner's Path into the message feed.
- Redesigning non-JAHUB student screens.

## Decisions

### Role-explicit bottom navigation

`BottomTabBar` receives a required `student | teacher | admin` discriminator from each tab navigator. Each role maps to exactly five visible routes, and only student JA receives the elevated center treatment. Explicit ownership is preferred over route-presence inference because route manifests may retain hidden/deep-link routes without changing the permanent bar.

Teacher Announcements remains in the root stack and Teacher More. Administrator Announcements moves from the tab navigator to a new root-stack destination launched from Admin Home. This keeps both domains reachable while avoiding six compressed permanent items.

### Safe-area-owned bar surface

The colored bar container includes the bottom safe-area padding. Each tab owns an equal flexible slot with at least a 48-pixel target, a single-line label, bounded font scaling, and a full accessibility label. The focal JA orb is a visual treatment inside the middle slot rather than an offset that changes slot geometry.

### Screen-owned Ask workspace

`JaScreen` remains the API and controller boundary. For `panel === "ask"`, it renders a focused `JaChatWorkspace` directly instead of placing Ask inside `ScreenScroll`. Replay and Learner's Path continue through the current scroll layout. Pure decisions move to `ja-chat-model.ts`, while native modal sheets are grouped in `JaHubSheets.tsx`; no navigation or data transport is duplicated.

### Deterministic conversation state

Ask uses `resume-pending`, `resume-loading`, `new`, and `active` entry states. Initial class resolution may resume only the most recently updated active thread. Selecting New Chat enters `new` and suppresses the automatic resume effect until the class changes or a preset creates a new thread. A server thread is still created only by the first prompt submission.

Lesson choice is explicit: one visible lesson is selected automatically, multiple lessons require the context sheet, and zero lessons disables prompts with an honest eligibility message. A resumed thread with an invisible lesson remains readable but cannot accept prompts. Changing lesson on an active thread requires confirmation and starts a new conversation.

### Preset-only prompt transport

The existing approved labels remain the complete prompt set. There is no `TextInput`. Selecting a preset sends the current `{ message, quickAction, lessonId }` request with `message` and `quickAction` equal to the approved label. Failures remain visible and are never automatically resubmitted because the backend contract does not provide message idempotency.

### Native, lazy sheets

Header tools, recent conversations, lesson context, approved prompts, and activity history use React Native `Modal` and list primitives. Android Back dismisses the active modal before navigation. Activity history is mounted and fetched only after its sheet opens; existing complete pagination and filters remain unchanged.

## Risks / Trade-offs

- [Risk] Removing Announcements tabs could make the feature harder to discover. → Mitigation: use labeled, role-owned entries in Teacher More and Admin Home, plus reachability tests.
- [Risk] Splitting Ask out of a large screen could accidentally duplicate API state. → Mitigation: keep all requests and selected class/thread ownership in `JaScreen`; child components receive state and callbacks.
- [Risk] Automatic thread resume can fight an intentional New Chat action. → Mitigation: model resume suppression as an explicit pure state transition and cover it before integration.
- [Risk] Nested modal state can behave poorly with Android Back. → Mitigation: allow one active sheet at a time and test `onRequestClose` for each sheet.
- [Risk] Narrow labels can still clip under accessibility scaling. → Mitigation: cap label scaling, keep full accessibility labels, and include 320-pixel device verification.

## Migration Plan

1. Land the OpenSpec artifacts and characterization tests.
2. Land navigation changes as one independently revertible commit.
3. Land the JAHUB model/components and screen integration as a second independently revertible commit.
4. Run focused tests after each stage and the full mobile gates before release packaging.
5. Roll back either functional commit independently if device verification finds a regression; no data migration is required.

## Open Questions

None. Product decisions for five tabs, header tools, preset-only prompts, latest-thread resume, and smart lesson selection are locked by the approved plan.
