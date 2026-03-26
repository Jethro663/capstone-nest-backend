# Prompt Contracts

## Accepted Prompts

These prompts should trigger the skill:

- `complete testing for admin`
- `complete testing for teacher`
- `complete testing for student`
- `check every button for admin`
- `run a frontend integration audit for teacher`
- `do a role regression sweep for student`

## Required Interpretation

- Infer one target role per run.
- Default to safe transactional coverage.
- Stop after generating the audit report and fix plan unless the user explicitly asks for implementation.

## Output Contract

Produce:

1. A Markdown audit report at `docs/testing/<role>-frontend-audit.md`
2. A Markdown fix plan at `docs/testing/<role>-frontend-fix-plan.md`

Each finding should include:

- severity
- route
- action
- symptom
- evidence
- likely owner
- likely source
- concise reproduction note

Each fix-plan entry should include:

- issue title
- owner
- source area
- implementation intent
- verification step

## Execution Contract

- Use Serena to build a route inventory before Playwright interaction.
- Use Playwright for browser execution and evidence capture.
- Use the bundled helper scripts when available instead of rewriting parsers and renderers.
- Respect runtime sandbox and approval rules; the skill cannot grant itself broader permissions.
