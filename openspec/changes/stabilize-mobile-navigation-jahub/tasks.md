## 1. Specification and characterization

- [x] 1.1 Record the approved navigation and JAHUB behavior in proposal, design, and delta specifications
- [x] 1.2 Clarify the active mobile parity specification so Announcements requires truthful reachability rather than a permanent tab
- [x] 1.3 Add failing role-specific bottom-bar characterization tests
- [x] 1.4 Add failing pure JAHUB model tests for resume, New Chat, lesson choice, and stale context

## 2. Stable role navigation

- [x] 2.1 Require an explicit role in BottomTabBar and render the five approved destinations for each role
- [x] 2.2 Limit the elevated focal treatment to student JA and harden slot, label, safe-area, press, and accessibility behavior
- [x] 2.3 Remove teacher and administrator Announcements tabs while retaining Teacher More and adding AdminAnnouncements stack reachability from Admin Home
- [x] 2.4 Run focused navigation tests and mobile typecheck, then commit the navigation slice independently

## 3. JAHUB conversation components

- [x] 3.1 Implement the pure chat model for approved prompts, entry transitions, latest-thread selection, and smart lesson selection
- [x] 3.2 Implement the preset-only JaChatWorkspace with one message FlatList and anchored prompt launcher
- [x] 3.3 Implement native menu, prompt, lesson, and lazy activity-history sheets with Android Back dismissal
- [x] 3.4 Add component tests for sheets, prompt submission, busy state, empty/stale states, blocked replies, citations, and errors

## 4. JAHUB screen integration

- [x] 4.1 Render Ask directly outside ScreenScroll while preserving current Replay and Learner's Path layouts and calls
- [x] 4.2 Integrate latest-thread resume, New Chat suppression, smart context selection, context-change confirmation, refresh, and unchanged prompt payloads
- [x] 4.3 Update JaScreen integration tests for class changes, secondary panels, stale context, and preset-only behavior
- [x] 4.4 Run focused JAHUB tests and typecheck, then commit the JAHUB slice independently

## 5. Regression and device gates

- [x] 5.1 Run the complete mobile Jest suite, typecheck, and git diff check with no new touched-file warnings
- [x] 5.2 Run an Expo production export with the hosted API and an Android native debug build under JDK 17
- [ ] 5.3 Verify student, teacher, and administrator routes plus JAHUB zero/one/multiple lesson states at 320, 360, and 412 pixel Android widths when a usable emulator is available
  - Device-complete: student, teacher, and administrator route sets; both gesture and three-button navigation; 320, 360, and 412 dp widths; resumed JAHUB Ask; sheets; Activity History; Replay; and Learner's Path.
  - Fixture-blocked: the hosted seed did not expose zero- and multiple-visible-lesson JAHUB entry states for device execution; those states remain covered by model, component, and JaScreen integration tests.
