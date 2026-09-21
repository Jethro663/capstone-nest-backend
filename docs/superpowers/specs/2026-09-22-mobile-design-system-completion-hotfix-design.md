# Mobile Design-System Completion Hotfix

## Status and accepted direction

The user has already selected the design direction: complete the existing **navy frame, red intent** system from the approved mobile HTML preview and apply it to every active mobile presentation owner. This hotfix does not reopen the visual direction; it closes migration gaps and the screenshot-reported student rendering defect.

## Decision ledger

### Keep

- Navy `#0C1D3A` as the structural frame.
- Red `#DC2626` as primary intent and urgency.
- White/neutral reading surfaces and semantic success/warning/danger states.
- Existing student, teacher, and admin routes, drawer destinations, Back behavior, and role resolution.
- Shared compact bottom-sheet filters for record subsets.
- Segmented controls only for persistent modes such as Current/Completed or Overview/Submissions/Analytics.
- Existing backend authority, API calls, React Query behavior, permissions, grading, academic lifecycle, update policy, and signer migration.

### Change

- Make the menu/back/app-bar action treatment visibly inverse on navy instead of white-on-white.
- Give the drawer a navy identity header and shared token-only presentation.
- Replace the screenshot-broken Student Home next-move tile with a stable rendered row component.
- Replace direct UI color literals with semantic tokens across active mobile UI source.
- Converge remaining primary/secondary/tertiary/icon actions on `MobileAction` while preserving interactive rows/cards as rows/cards.
- Align login, dialogs, notifications, AI/status presentation, class presets, rich-text WebView CSS, splash, launcher background, status bar, and navigation bar.
- Add an automated source audit so raw palette or legacy action drift fails verification.

### Frozen

- No backend, schema, DTO, route, RBAC, audit, notification-delivery, assessment, or academic-policy change.
- No full dark mode and no navy reading canvas.
- No deletion of role routes or drawer destinations.
- No replacement of every `Pressable`; rows, cards, radio choices, and list navigation retain their appropriate interaction semantics.
- No change to the forced-update threshold or legacy signer-migration behavior except normal version/build registration for the new APK.

### Unknown and evidence boundary

- The supplied screenshots do not reveal installed build, font scale, or display scale.
- Physical-device traversal and OEM system-bar rendering remain separate acceptance evidence.
- The hotfix must therefore be robust to narrow widths and supported font scaling, and must clearly expose the new build identity for follow-up acceptance.

## Chosen architecture

Complete the current layered system instead of replacing it:

```text
mobileBrand semantic roles
  ├─ role compatibility themes
  ├─ MobileAppBar / MobileAction / filters / tabs / score state
  ├─ RoleNavigationDrawer and role screen wrappers
  ├─ screen-local records, states, and content
  └─ Android/native/generated presentation contracts
```

Only token/theme files, Android resource authorities, and generated-style build inputs may define color literals. Active components and screens consume semantic roles. A source audit enforces that boundary.

## Design-system contract

### Color roles

| Role | Value | Use |
|---|---|---|
| Structural navy | `#0C1D3A` | app bar, drawer header, status bar, highest-emphasis context |
| Raised navy | `#14294B` | pressed/inset navy surface, secondary structure |
| Primary red | `#DC2626` | primary action, selected accent, urgency |
| Pressed red | `#B91C1C` | pressed/destructive intent |
| Canvas | `#F6F7F9` | page and native navigation background |
| Surface | `#FFFFFF` | rows, cards, dialogs, form surfaces |
| Text | `#101828` | primary body and headings |
| Muted | `#667085` | secondary copy |
| Success/warning/danger/info | semantic token families | state communication only |
| Inverse action | tokenized translucent white + white foreground | controls placed on navy |
| Scrim | tokenized navy alpha | modal/drawer overlays |

No screen invents a new purple, blue, rose, gray, or gradient family. Existing data/status meaning maps to the nearest semantic state role.

### Action hierarchy

1. **Primary:** filled red; one dominant action per region.
2. **Secondary:** pale navy or white/navy outline.
3. **Tertiary:** transparent text/icon treatment.
4. **Icon:** 44 px minimum; explicit accessibility label.
5. **Inverse header action:** translucent white surface on navy, white foreground, 44 px minimum.

`Pressable` remains valid for rows, cards, radio choices, and list destinations. Named local button abstractions and legacy `TouchableOpacity`/generic `Button` controls are migrated to the shared hierarchy.

### Drawer and app bar

- The app bar remains navy and owns the page title.
- Menu, Back, refresh, notification, history, and header overflow actions use the inverse action treatment.
- Drawer header uses navy, white school identity, and a visible inverse close control.
- Drawer body remains white/neutral for readability.
- Active destination uses a light navy selection surface with red intent marker/icon; inactive destinations use navy text/muted icon.
- Profile and logout remain at the bottom; logout stays explicit and destructive.

### Student Home rendering hotfix

- The follow-up area remains a navy-topped content card.
- Each next move is a full-width row with a fixed 44 px semantic icon slot, flexible bounded copy, and optional trailing navigation affordance.
- Interactive rows use `Pressable`; informational rows use `View`, avoiding disabled-interaction presentation ambiguity.
- Titles/subtitles allow two lines, use `minWidth: 0`, and cap font scaling appropriate to a compact record row.
- The row contract is exported or rendered through a shared student primitive so Jest can mount both interactive and informational variants.
- No side-by-side two-column layout returns at narrow widths.

## Navigation and stack contract

| Surface | Entry sources | Forward exits | Back / close behavior | Retained state | Guard / fallback |
|---|---|---|---|---|---|
| Role drawer | root app-bar menu | role destinations, Profile, logout confirmation | hardware/backdrop/close closes drawer only | active route | current role destinations only |
| Student Home | student drawer Home, role root | class, lesson, assessment, calendar, notifications, Profile | root Back follows existing tab/history behavior | scroll/query cache | student role |
| Student Classes | drawer | class detail, tasks, schedule | returns to actual source | search and Current/Completed mode | student role |
| Class/lesson/assessment details | list, Home, deep source | nested detail/action routes | header/hardware Back pop actual stack; existing safe fallback remains | existing route params/query cache | current route permissions |
| Teacher/admin roots | drawer | current workspace detail routes | root/drawer behavior unchanged | current screen state | role guard |
| Modal/filter/sheet | current screen | local selection/action | Back closes overlay before route | current selection until applied | no route reset |

The hotfix changes no route names, push/pop/replace behavior, or deep-link fallback.

## State matrix

| State | Required presentation |
|---|---|
| Default | navy frame, neutral content, red primary intent |
| Loading | existing data behavior; tokenized neutral/progress treatment |
| Empty | semantic icon + concise guidance; no decorative rainbow card |
| Error | danger token family and existing retry behavior |
| Warning/offline | warning family and existing recovery behavior |
| Success/completed | success family; never use green as a competing brand |
| Disabled | shared opacity/disabled state; no hidden white-on-white control |
| Selected | red intent marker or light navy selection surface according to component semantics |
| Modal/sheet | tokenized navy scrim, white surface, safe-area padding |
| Narrow/large text | single-column records, flexible copy, bounded compact-label scaling, no clipped icon/text overlap |
| Keyboard | current avoidance and input behavior retained |

## Active-source migration boundary

The implementation covers every active file in the isolation inventory: shared navigation/UI, auth/account, notifications/providers, student, teacher, admin, class presets, rich-text generation, app config, and Android values/styles. Theme authorities may retain literal definitions; active UI consumers may not.

Generated output is rebuilt from its source script. Historical device dumps are not treated as runtime components and are excluded from the source audit with an explicit comment.

## Verification design

1. Render menu/back/header actions and assert foreground/surface contrast roles.
2. Render the drawer for all three roles and assert the same structural palette and route behavior.
3. Render Student Home follow-up rows in informational and interactive states; inspect flattened row styles and navigate the interactive row.
4. Run the design audit against active production source and Android resources.
5. Verify record-filter sources still use the shared selector and Current/Completed remains a segmented mode.
6. Run full typecheck and Jest.
7. Export the production Expo bundle and inspect it for the hotfix component/build markers.
8. Build and validate a production-signed ARM64 APK, then verify exact CI/deployment/live artifact/update policy.

## Acceptance criteria

- No white-on-white or invisible menu/back action exists in any role app bar.
- Student Home next-move rows render horizontally with copy beside the icon for interactive and informational states.
- Every active UI file in the recorded audit has zero direct color literals; exceptions are limited to named token/native-generation authorities.
- No generic `Button`, `TouchableOpacity`, or local main-action abstraction remains outside documented shared/contextual primitives.
- Android launcher background, splash, status bar, and navigation bar use navy/canvas roles.
- Every affected flow retains its route, data, mutation, permission, and failure behavior.
- Focused tests, design audit, typecheck, full mobile tests, release checks, exact-SHA CI/deployment, and live artifact verification pass.
- Physical-device proof is reported accurately rather than inferred.

## Self-review

- No placeholders or unresolved design choices remain.
- The hotfix preserves the previously approved preview rather than inventing a new direction.
- The plan distinguishes visual actions from record rows/cards and avoids a mechanical `Pressable` replacement.
- Native chrome, generated rich text, auth, overlays, and dormant palette utilities are accounted for rather than silently excluded.
