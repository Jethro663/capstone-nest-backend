## Approved design

Implement the user-approved Mobile Assessment Editor and AI Draft Settings plan. Backend owns atomic writes, revisions, request receipts, academic validation and AI quiz application. Save accepts unfinished content; publication requires valid content and active editable academic state. Existing mutation routes remain compatible and advance revisions.

AI assessmentSettings includes title, description, question-based assessment type, period, category, placement, due date, closing policy, attempts, overall/per-question timers, randomization, strict mode, passing score and feedback policy/delay. Teachers can edit these without regenerating questions. Older jobs require settings review. Applying is idempotent and never publishes.

Mobile uses native Questions / Settings / Preview, one expanded question, persistent explicit save/release actions, account-scoped device recovery, compact locally bundled rich text, and preserves all web-authored fields. Supported question types are the backend's existing six. File upload remains manual. Invalid historical periods require existing audited administrator repair; no automatic historical remapping.

## Verification

Test transaction rollback, replay/conflict protection, unchanged protected questions, rich-text and settings round trips, AI lifecycle persistence, policy changes, historical restrictions, real button payloads and device recovery. Use disposable local services for all writes. The requested repair report may inspect an existing local database in an explicit read-only transaction; do not migrate or repair that database. Preserve unrelated workspace edits.

Mobile rich text is bundled locally using Tiptap inside the Expo-compatible WebView, following [Expo WebView documentation](https://docs.expo.dev/versions/latest/sdk/webview/) and [Tiptap standalone installation](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript). Pin dependencies to the repository's Expo SDK and editor version. Do not load a remote editor page or put authentication tokens in its document.
