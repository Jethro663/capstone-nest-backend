# Context Efficiency Slice

Use this reference when the task requires broad repo inspection, instruction authoring, repeated searches, or output-heavy debugging. Keep it unloaded for normal targeted implementation work.

## Goal

Minimize unnecessary prompt context while preserving correctness.
Build a small, high-signal working view before opening more files, running broader scans, or pasting large outputs.

## Default Rules

- Start with the smallest set of files, symbols, or commands that can answer the question.
- Prefer targeted discovery over whole-repo scanning.
- Avoid rereading files that were already summarized unless something changed or a deeper slice is now required.
- Do not inspect unrelated subsystems, generated outputs, archives, or vendor directories unless the task explicitly needs them.
- Keep intermediate notes and updates compact.
- When shell output is necessary and `rtk` is installed, prefer RTK-filtered command paths for supported high-volume commands.

## Inspection Workflow

1. Identify the narrowest likely owners: route, module, symbol, directory, or failing command.
2. Use compact discovery first:
   - `Serena` symbol or reference lookup for ownership and callers
   - `Grep` for precise text or pattern matches
   - `Glob` for filename discovery
   - `Read` with focused ranges instead of full-file pulls when the relevant section is known
   - `rtk`-filtered shell commands for output-heavy shell workflows that are not better served by narrower tools
3. Summarize what was learned before opening more files.
4. Broaden inspection only when the compact view leaves an unresolved question.
5. Make the smallest safe change once ownership and behavior are clear.

## Compact Working Views

Prefer derived, high-signal views over raw dumps.

Useful compact views include:

- relevant fields only from JSON or structured output
- top failing tests or top repeated errors
- deduplicated log lines or grouped error signatures
- route, import, export, model, or function inventories instead of whole-file reads
- row counts plus small samples instead of full tables
- focused diffs instead of repeating untouched file sections

When `rtk` is available, prefer it for compact shell summaries of git state, test failures, build output, logs, and broad listings before falling back to raw command output.

When repeated inspection is needed, prefer a small helper script or repo-native command that emits concise output over manually reopening many files.

## Output Discipline

- Avoid commands that are likely to flood the conversation when a filtered view will answer the question.
- Prefer tool-native limits and targeted reads:
  - `Read(..., offset, limit)` for focused file sections
  - `Grep` to narrow matches before reading files
  - repo scripts or helpers that accept filters, limits, or selectors
- Prefer RTK-filtered shell output for supported shell commands before resorting to raw `git`, test, build, or log output.
- When a full command must run, inspect the smallest useful portion of the result and summarize the rest.
- Do not paste large raw outputs into the conversation unless the user asks for them.
- RTK is not universal: built-in file tools and MCP tools may still be more token-efficient than forcing everything through shell.

## Directory Discipline

Do not scan these by default unless the task explicitly targets them or they contain the failing artifact:

- `node_modules/`
- `.venv/`
- `venv/`
- `dist/`
- `build/`
- `coverage/`
- `.next/`
- `.nuxt/`
- `target/`
- `out/`
- `logs/archive/`
- `generated/`
- `vendor/`
- `.cache/`
- `.git/`

For this repo, also keep unrelated subsystem slices unloaded unless the prompt crosses boundaries.

## Handoff And Continuation

When work spans multiple steps, keep a short handoff or progress note with only:

- current goal
- critical files
- commands already tried
- confirmed errors or constraints
- decisions made
- next step
- files or directories that do not need rereading

Remove dead ends, repeated explanations, and stale assumptions.

## Response Shape

Be concise by default.

Preferred structure:

- changed files
- short reason
- exact verification command
- expected result when needed

Only expand into long explanations when the user asks for teaching, design rationale, or detailed reasoning.

## Triggers To Load This Slice

Load this reference when the prompt asks for:

- repo analysis or repo mapping
- instruction or agent-doc authoring
- repeated search across multiple modules
- large-log or large-output inspection
- context compaction or handoff guidance

Do not load it for small, already-localized edits where normal kernel plus slice guidance is enough.
