## 1. Specification and design baseline

- [x] 1.1 Record the approved HTML hierarchy, evidence, contract boundaries, and legacy signer root cause in the canonical analysis and design artifacts.
- [x] 1.2 Reconcile the active lesson Compare and module Manage presentation requirements and validate both OpenSpec changes strictly.
- [x] 1.3 Create the decision-ready feature impact plan and executable test-driven implementation plan with exact owners and verification gates.

## 2. Shared mobile interface system

- [ ] 2.1 Add failing tests for semantic navy/red tokens, shared app-bar behavior, four action variants, the filter bottom sheet, segmented tabs, overflow actions, and score states.
- [ ] 2.2 Implement the role-neutral mobile brand tokens and shared presentation primitives until the focused tests pass.
- [ ] 2.3 Adapt teacher, student, and admin presentation wrappers to the shared system without changing their domain-facing behavior.
- [ ] 2.4 Replace remaining record-filter button rows with the shared filter selector while retaining chips only for selection, tagging, and non-filter toggles.

## 3. Teacher home and notification workspaces

- [ ] 3.1 Add failing layout/interaction tests for the approved Teacher Home and Notification Center hierarchy.
- [ ] 3.2 Redesign Teacher Home around Next Up, compact attention, and today's agenda without duplicate page identity.
- [ ] 3.3 Redesign Notification Center with a single navy app bar, compact count summary, search, and the shared filter selector.

## 4. Module and lesson workspaces

- [ ] 4.1 Add failing contract tests for labeled 44 px module overflow actions and a two-mode scrollable lesson preview.
- [ ] 4.2 Replace visible Manage text with accessible overflow action sheets while preserving Settings, Add content, Arrange, and existing mutations.
- [ ] 4.3 Remove Compare mode and make the secure Web preview a dedicated scroll owner while preserving the native Mobile renderer.

## 5. Assessment list and detail workspaces

- [ ] 5.1 Add failing tests for assessment search, shared filters, visible display pagination, and removal of the redundant context strip.
- [ ] 5.2 Implement complete-result search/filtering and bounded visible pagination without changing the backend paging contract.
- [ ] 5.3 Add failing tests for the scannable assessment overview, submission selector, semantic scores, and interactive analytics question details.
- [ ] 5.4 Implement the assessment detail hierarchy and analytics drill-down using only existing server evidence.

## 6. Submission review workspace

- [ ] 6.1 Add failing tests for the compact sticky score/control region, question navigator, and prominent learner/correct-answer hierarchy.
- [ ] 6.2 Redesign submission review without summary-stat cards while preserving grading, rubric, attachment, and return behavior.

## 7. Android signer migration

- [ ] 7.1 Add failing updater tests proving legacy builds open the immutable APK externally and never use app-private download/install flow.
- [ ] 7.2 Implement explicit external-download/uninstall/reinstall guidance for version codes 46 and earlier while preserving build 47+ updates.

## 8. Verification and release

- [ ] 8.1 Run focused suites after each slice, then mobile typecheck and the complete mobile Jest suite.
- [ ] 8.2 Run Expo production export and the repository release test/prepare/verify workflow with the next version metadata.
- [ ] 8.3 Verify package name, artifact SHA-256, and production signing certificate continuity; keep physical-device evidence separate.
- [ ] 8.4 Commit and push the verified exact SHA, observe CI/deployment and public artifact evidence, and record any remaining physical-device acceptance gate.
