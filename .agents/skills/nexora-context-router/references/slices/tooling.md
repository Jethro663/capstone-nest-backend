# Tooling Slice

Use available MCP tools by default when they are a better fit than raw shell inspection.

## Default Preference

- `Serena` first for codebase discovery, symbol lookup, reference tracing, and focused source inspection.
- `Playwright` first for real browser execution, auth flows, route transitions, console/network evidence, and UI reproduction in `next-frontend`.
- `Chrome DevTools` when browser-level debugging needs lower-level network, performance, or console inspection than Playwright snapshots provide.
- `shell` for package scripts, git, installs, server startup, file listing, and commands that are not better served by MCP tools.

## Serena Triggers

- finding owning files for a route, symbol, or feature
- tracing references before editing
- understanding large files through symbol overview instead of full-file dumping
- locating route trees, service wrappers, guards, hooks, or module boundaries

## Playwright Triggers

- reproducing frontend bugs in the real browser
- verifying login, refresh, logout, redirects, and protected routes
- capturing UI evidence, console logs, or failed network requests
- exercising buttons, tabs, dialogs, forms, and route transitions in `next-frontend`

## Do Not Default To Shell When

- Serena can answer the code-ownership or symbol question directly
- Playwright can reproduce the browser behavior directly
- browser evidence is needed and shell output would only be indirect

## Do Not Force MCP Tools When

- the task is package, git, build, seed, test, or server startup work
- the target is `test-mobile` runtime behavior that Playwright does not cover
- a repo script already gives the highest-signal answer
