# Tooling Slice

Use available MCP tools by default when they are a better fit than raw shell inspection.

## Default Preference

- `Serena` first for codebase discovery, symbol lookup, reference tracing, and focused source inspection.
- `Playwright` first for real browser execution, auth flows, route transitions, console/network evidence, and UI reproduction in `next-frontend`.
- `Chrome DevTools` when browser-level debugging needs lower-level network, performance, or console inspection than Playwright snapshots provide.
- `shell` for package scripts, git, installs, server startup, file listing, and commands that are not better served by MCP tools.
- When using `shell` for output-heavy command work and `rtk` is installed, prefer RTK-filtered execution paths to reduce command-output tokens.

## RTK Guidance

- Prefer normal commands through the shell hook when RTK is already installed and configured; let the hook rewrite supported commands automatically.
- Use explicit `rtk ...` commands when the hook does not apply, when validating RTK behavior itself, or when a command family benefits from RTK-specific wrappers such as `rtk git`, `rtk test`, `rtk err`, `rtk read`, `rtk grep`, or `rtk find`.
- Favor RTK for large shell-oriented output such as `git status`, `git diff`, `git log`, test runners, build output, package-manager listings, container logs, and broad file listings.
- Do not replace a narrower tool with a broader RTK shell command. If `Serena`, `Read`, `Grep`, or `Glob` already answers the question more precisely, use the narrower tool.
- Remember the scope limit: hook-based RTK filtering applies to shell commands, not to built-in file tools. Use explicit `rtk` shell commands only when that tradeoff still improves the signal-to-token ratio.

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
- built-in file or search tools already provide a smaller view than an RTK-wrapped shell command

## Do Not Force MCP Tools When

- the task is package, git, build, seed, test, or server startup work
- the target is `mobile` runtime behavior that Playwright does not cover
- a repo script already gives the highest-signal answer
