# Nexora Complete Handoff Manuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a portable Nexora handoff folder containing a role based User Manual, a complete System Manual, annotated current visuals, quick start and recovery material, the locked source snapshot, the current Android APK, configuration templates, and integrity records.

**Architecture:** Tracked builders under `scripts/handoff/` generate inventories, document sources, DOCX files, PDFs, diagrams, the offline start page, archives, and checksums. Generated deliverables live under `output/NEXORA_HANDOFF_2026-10-01/`. Browser and mobile captures use a disposable documentation environment with synthetic records; package verification treats the approved design as the acceptance contract.

**Tech Stack:** Node.js 20, Python 3.12, python-docx, LibreOffice and Poppler from the bundled workspace runtime, Playwright Chromium, Expo React Native, Docker Compose, PostgreSQL 16 with pgvector, SHA256 utilities, HTML and CSS.

## Global Constraints

- Build from application commit `211483f07b901299b48ae42eda318c7448f1cbfd` on branch `developement`.
- Keep the generated handoff folder below 32 GB.
- Use English only and explain procedures for first year information technology students and information technology faculty.
- Pair web and mobile instructions under the same user task.
- Use real current screens, current rendered components, or verified current architecture diagrams.
- Use synthetic demonstration records only; never capture real student data, secrets, tokens, or production messages.
- Use Nexora navy `#0C1D3A`, red `#DC2626`, dark red `#B91C1C`, pale red `#FEE2E2`, white, and light gray borders.
- Preserve `/home/jethro/Documents/Projects/capstone-nest-backend/docs/feature-analysis/2026-09-21-mobile-teacher-modernization-and-updater-analysis.md` without modifying it.
- Keep generated dependencies, caches, Docker image archives, model files, old APK builds, production secrets, and production database contents out of the package.
- Render and inspect every final DOCX and PDF page before delivery.

---

### Task 1 Package Foundation and Verification Contract

**Files:**
- Create: `scripts/handoff/handoff.config.json`
- Create: `scripts/handoff/lib/config.mjs`
- Create: `scripts/handoff/lib/fs-safety.mjs`
- Create: `scripts/handoff/tests/config.test.mjs`
- Create: `scripts/handoff/tests/fs-safety.test.mjs`
- Create: `scripts/handoff/build-package.mjs`
- Modify: `.gitignore`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/`

**Interfaces:**
- Produces: `loadHandoffConfig(repoRoot)`, `assertSafeOutputPath(repoRoot, outputPath)`, and the fixed package directory tree.
- Consumes: the approved folder layout and locked application commit from the design specification.

- [ ] **Step 1: Write the configuration test**

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { loadHandoffConfig } from "../lib/config.mjs";

test("loads the locked handoff identity", async () => {
  const config = await loadHandoffConfig(process.cwd());
  assert.equal(config.packageName, "NEXORA_HANDOFF_2026-10-01");
  assert.equal(config.applicationCommit, "211483f07b901299b48ae42eda318c7448f1cbfd");
  assert.equal(config.maxBytes, 32 * 1024 * 1024 * 1024);
});
```

- [ ] **Step 2: Write the path safety test**

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeOutputPath } from "../lib/fs-safety.mjs";

test("accepts only the configured repository output directory", () => {
  const root = "/workspace/repo";
  assert.doesNotThrow(() => assertSafeOutputPath(root, "/workspace/repo/output/NEXORA_HANDOFF_2026-10-01"));
  assert.throws(() => assertSafeOutputPath(root, "/workspace/repo"));
  assert.throws(() => assertSafeOutputPath(root, "/"));
});
```

- [ ] **Step 3: Run the tests and confirm they fail before implementation**

Run: `node --test scripts/handoff/tests/config.test.mjs scripts/handoff/tests/fs-safety.test.mjs`
Expected: FAIL because the modules and configuration do not exist.

- [ ] **Step 4: Implement configuration and safe scaffolding**

`handoff.config.json` must define the package name, application commit, package size limit, current APK path and hash, output directories, brand colors, and manual filenames. `build-package.mjs` must refuse to operate outside the configured output path, create only the fixed directory tree, and write `VERSION.txt` plus `README-FIRST.txt`.

- [ ] **Step 5: Ignore generated output without hiding tracked builders**

Add `/output/NEXORA_HANDOFF_2026-10-01/` to `.gitignore` and keep `scripts/handoff/` tracked.

- [ ] **Step 6: Verify the foundation**

Run: `node --test scripts/handoff/tests/config.test.mjs scripts/handoff/tests/fs-safety.test.mjs`
Expected: 2 passing tests.

Run: `node scripts/handoff/build-package.mjs --scaffold`
Expected: the fixed package directories, `VERSION.txt`, and `README-FIRST.txt` exist with no other generated content.

- [ ] **Step 7: Commit the foundation**

```bash
git add .gitignore scripts/handoff
git commit -m "build: scaffold Nexora handoff package"
```

### Task 2 Current Source Inventory Generator

**Files:**
- Create: `scripts/handoff/generate-inventory.mjs`
- Create: `scripts/handoff/lib/inventory.mjs`
- Create: `scripts/handoff/tests/inventory.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/01-MANUALS/sources/inventory.json`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/01-MANUALS/sources/inventory.md`

**Interfaces:**
- Consumes: repository source at the current checkout and `handoff.config.json`.
- Produces: normalized arrays for web pages, mobile screens and route registrations, backend modules and handlers, AI endpoints, database tables and enums, migrations, queues, environment keys, Compose services, workflows, assets, and documentation freshness.

- [ ] **Step 1: Write inventory fixture tests**

```javascript
test("inventory includes every required subsystem", async () => {
  const inventory = await buildInventory(repoRoot);
  for (const key of ["web", "mobile", "backend", "aiService", "database", "queues", "configuration", "deployment"]) {
    assert.ok(inventory[key], `missing ${key}`);
  }
  assert.equal(inventory.database.migrationFiles.at(-1), "0036_mobile_release_reset_compatibility.sql");
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test scripts/handoff/tests/inventory.test.mjs`
Expected: FAIL because `buildInventory` is missing.

- [ ] **Step 3: Implement deterministic source discovery**

Use repository paths and source syntax, not old manual counts. Sort every path and identifier. Record the command or parser used for each metric. Exclude dependencies, build output, generated caches, and the handoff output folder.

- [ ] **Step 4: Generate and validate the inventory**

Run: `node scripts/handoff/generate-inventory.mjs`
Expected: JSON and Markdown inventories are written with 116 tables, 55 enums, 37 migrations, 114 web pages, 100 mobile screen files, 9 processors, and source derived route and handler totals.

Run: `node --test scripts/handoff/tests/inventory.test.mjs`
Expected: all inventory tests pass.

- [ ] **Step 5: Commit the inventory generator**

```bash
git add scripts/handoff
git commit -m "docs: generate current Nexora system inventory"
```

### Task 3 Offline Start Page and Portable Links

**Files:**
- Create: `scripts/handoff/templates/start-here.html`
- Create: `scripts/handoff/templates/start-here.css`
- Create: `scripts/handoff/generate-start-page.mjs`
- Create: `scripts/handoff/verify-local-links.mjs`
- Create: `scripts/handoff/tests/local-links.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/START-HERE.html`

**Interfaces:**
- Consumes: package metadata and the fixed relative file manifest.
- Produces: one self contained offline HTML entry point with only relative links and embedded CSS.

- [ ] **Step 1: Write the local link test**

```javascript
test("start page uses only portable local links", async () => {
  const result = await verifyLocalLinks(packageRoot, "START-HERE.html");
  assert.deepEqual(result.absolutePaths, []);
  assert.deepEqual(result.missingTargets, []);
  assert.deepEqual(result.remoteAssets, []);
});
```

- [ ] **Step 2: Create the accessible page template**

Use semantic landmarks, keyboard focus styles, descriptive links, high contrast colors, no remote resources, no JavaScript dependency, and clear first run paths for Windows, Linux, Android installation, backup and restore, and troubleshooting.

- [ ] **Step 3: Generate the page and run the verifier**

Run: `node scripts/handoff/generate-start-page.mjs`
Expected: `START-HERE.html` is generated with package version and application commit.

Run: `node --test scripts/handoff/tests/local-links.test.mjs`
Expected: PASS after the required destination files have stub entries generated by the scaffold.

- [ ] **Step 4: Inspect the page at desktop and narrow widths**

Open the local file in Chromium at 1440 by 900 and 390 by 844. Confirm no horizontal overflow, readable focus order, working relative links, and visible offline and privacy notices.

- [ ] **Step 5: Commit the start page tooling**

```bash
git add scripts/handoff
git commit -m "docs: add offline Nexora handoff start page"
```

### Task 4 Safe Documentation Data and Capture Environment

**Files:**
- Create: `scripts/handoff/demo-data/assert-disposable-target.mjs`
- Create: `scripts/handoff/demo-data/seed-documentation-data.mjs`
- Create: `scripts/handoff/demo-data/verify-documentation-data.mjs`
- Create: `scripts/handoff/demo-data/documentation-fixture.json`
- Create: `scripts/handoff/tests/disposable-target.test.mjs`
- Create: `scripts/handoff/tests/documentation-fixture.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/06-DATABASE-AND-RECOVERY/demo-data/README.txt`

**Interfaces:**
- Consumes: an explicit `NEXORA_DOC_DATABASE_URL` whose host is local and whose database name starts with `nexora_docs_`.
- Produces: deterministic administrator, teacher, learner, academic, content, assessment, report, intervention, notification, audit, demo, maintenance, and lifecycle records.

- [ ] **Step 1: Test production target refusal**

```javascript
test("rejects non documentation database targets", () => {
  assert.throws(() => assertDisposableTarget("postgres://user:pass@db.railway.app/prod"));
  assert.throws(() => assertDisposableTarget("postgres://user:pass@127.0.0.1/capstone"));
  assert.doesNotThrow(() => assertDisposableTarget("postgres://postgres:postgres@127.0.0.1/nexora_docs_manual"));
});
```

- [ ] **Step 2: Test fixture completeness and idempotency**

The test must require all roles, current academic state, class and roster, lesson and assessment records, returned attempt, report and performance data, intervention, evaluation, announcement, calendar event, notification, audit record, and system setting states. Apply the fixture twice and assert stable row identities.

- [ ] **Step 3: Start an isolated Compose project**

Run with an explicit project name and nondefault ports. Never reuse the current local `capstone` database. Validate Compose configuration before startup.

- [ ] **Step 4: Apply all 37 migrations and seed documentation data**

Expected: `_applied_migrations` ends at `0036_mobile_release_reset_compatibility.sql`; the verifier reports every required fixture category present.

- [ ] **Step 5: Verify live and ready endpoints**

Expected: backend live and ready checks return successful responses; frontend login loads; AI readiness is either verified or labeled unavailable for capture states that do not require AI execution.

- [ ] **Step 6: Export the fixture instructions without credentials**

The package README must explain how to create a new disposable database and invoke the fixture. It must not include the runtime password used during capture.

- [ ] **Step 7: Commit the safe fixture tooling**

```bash
git add scripts/handoff
git commit -m "test: add safe documentation capture fixture"
```

### Task 5 Web Visual Capture and Annotation

**Files:**
- Create: `scripts/handoff/capture/web-capture-matrix.json`
- Create: `scripts/handoff/capture/capture-web.mjs`
- Create: `scripts/handoff/capture/annotate-image.mjs`
- Create: `scripts/handoff/capture/verify-captures.mjs`
- Create: `scripts/handoff/tests/capture-matrix.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/08-VISUALS/web/`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/08-VISUALS/annotations/web-capture-metadata.json`

**Interfaces:**
- Consumes: inventory routes, synthetic accounts, deterministic fixture identifiers, and capture matrix entries.
- Produces: full page and focused PNG captures plus red numbered annotated versions and metadata.

- [ ] **Step 1: Test capture matrix coverage**

```javascript
test("every current web page has a capture owner", async () => {
  const pages = inventory.web.pages.map((page) => page.route);
  const covered = new Set(matrix.flatMap((entry) => entry.routes));
  assert.deepEqual(pages.filter((route) => !covered.has(route)), []);
});
```

- [ ] **Step 2: Define route prerequisites and expected evidence**

Each entry records role, route, fixture identifiers, viewport, expected heading, sensitive selectors to mask, annotation coordinates, image purpose, manual chapter, and whether the image is a live screen or a component render.

- [ ] **Step 3: Capture all public, authentication, administrator, teacher, and student routes**

Use Playwright with the local documentation environment. Fail on console errors, failed protected API requests, unexpected redirects, missing expected headings, or unmasked sensitive selectors.

- [ ] **Step 4: Annotate and optimize without reducing legibility**

Use red numbered circles with white numerals. Preserve original captures. Store annotations as new files and keep full screen context before crops.

- [ ] **Step 5: Verify coverage and image integrity**

Run: `node scripts/handoff/capture/verify-captures.mjs --platform web`
Expected: every required matrix entry has a nonempty PNG, metadata, route identity, source commit, role, capture date, and synthetic data classification.

- [ ] **Step 6: Commit the capture tooling and matrix**

```bash
git add scripts/handoff
git commit -m "docs: automate Nexora web manual captures"
```

### Task 6 Mobile Visual Capture and Annotation

**Files:**
- Create: `scripts/handoff/capture/mobile-capture-matrix.json`
- Create: `scripts/handoff/capture/capture-mobile.mjs`
- Create: `scripts/handoff/capture/mobile-component-gallery.tsx`
- Create: `scripts/handoff/tests/mobile-capture-matrix.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/08-VISUALS/mobile/`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/08-VISUALS/components/`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/08-VISUALS/annotations/mobile-capture-metadata.json`

**Interfaces:**
- Consumes: active mobile route registrations, build 57 identity, documentation API, and synthetic fixture records.
- Produces: native or Expo rendered screen images, component state renders, annotations, and provenance metadata.

- [ ] **Step 1: Test registered route coverage**

Require every active authentication, profile completion, student, teacher, and administrator route surface to map to a capture or an explicit shared component image.

- [ ] **Step 2: Create a development only component gallery**

The gallery imports current production components and injects typed synthetic props for destructive, rare, empty, loading, validation, success, failure, confirmation, and recovery states. It must be excluded from production navigation and bundles.

- [ ] **Step 3: Capture current native Android routes**

Use the isolated documentation environment and current mobile source. Record emulator model, Android version, viewport, app version, build number, commit, role, screen name, and capture date.

- [ ] **Step 4: Capture component only states**

Use component rendering only where triggering the real state would be destructive, asynchronous, unavailable, or privacy sensitive. Label these figures as current component renders.

- [ ] **Step 5: Annotate and verify**

Run: `node scripts/handoff/capture/verify-captures.mjs --platform mobile`
Expected: no missing route owners, no missing provenance, no zero byte images, and no file with unmasked sensitive text.

- [ ] **Step 6: Commit the mobile capture tooling**

```bash
git add scripts/handoff
git commit -m "docs: automate Nexora mobile manual captures"
```

### Task 7 User Manual Source and Document Generation

**Files:**
- Create: `scripts/handoff/content/user-manual.md`
- Create: `scripts/handoff/content/user-manual-figures.json`
- Create: `scripts/handoff/documents/manual_common.py`
- Create: `scripts/handoff/documents/build_user_manual.py`
- Create: `scripts/handoff/tests/user-manual-coverage.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/01-MANUALS/Nexora-User-Manual.docx`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/01-MANUALS/Nexora-User-Manual.pdf`

**Interfaces:**
- Consumes: route inventory, web and mobile capture metadata, approved chapter structure, and verified current behavior.
- Produces: editable DOCX and print ready PDF with paired web and mobile procedures.

- [ ] **Step 1: Write the coverage test**

Require every web primary navigation destination, every mobile drawer destination, every authentication and onboarding flow, and every secondary route family to appear in a named user task with at least one verified visual.

- [ ] **Step 2: Author the manual in plain English**

Use one action per numbered step. State prerequisites, expected result, stop conditions, common mistakes, recovery actions, and a short technical note. Pair Web and Mobile subsections inside each task.

- [ ] **Step 3: Build the DOCX**

Use US Letter portrait, built in Title and Heading styles, black titles and headings, 11 point body text, inline images, captions, meaningful alternative text, navy table headers, light gray borders, and a deterministic linked table of contents.

- [ ] **Step 4: Render DOCX and emit PDF**

Use the bundled workspace Python and LibreOffice paths. Render every page to PNG and emit the PDF. Inspect all pages at 100 percent zoom.

- [ ] **Step 5: Run accessibility and structure audits**

Run the document accessibility audit, heading audit, image audit, and section audit. Fix skipped headings, missing alt text, missing table header flags, raw URL link text, clipped images, bad page breaks, and unreadable tables. Rebuild and rerender after every fix.

- [ ] **Step 6: Verify manual coverage and text quality**

Run: `node --test scripts/handoff/tests/user-manual-coverage.test.mjs`
Expected: all route and visual coverage assertions pass.

Scan the source and final extracted text for placeholder terms, private data, obsolete counts, old teal identity references, and instructions that contradict current source.

- [ ] **Step 7: Commit the User Manual sources and builder**

```bash
git add scripts/handoff/content/user-manual.md scripts/handoff/content/user-manual-figures.json scripts/handoff/documents scripts/handoff/tests/user-manual-coverage.test.mjs
git commit -m "docs: build complete Nexora User Manual"
```

### Task 8 System Manual Source and Document Generation

**Files:**
- Create: `scripts/handoff/content/system-manual.md`
- Create: `scripts/handoff/content/system-manual-figures.json`
- Create: `scripts/handoff/diagrams/generate-diagrams.mjs`
- Create: `scripts/handoff/documents/build_system_manual.py`
- Create: `scripts/handoff/tests/system-manual-coverage.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/01-MANUALS/Nexora-System-Manual.docx`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/01-MANUALS/Nexora-System-Manual.pdf`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/07-DIAGRAMS/`

**Interfaces:**
- Consumes: current inventory, repository instructions, Compose topology, contracts, migrations, deployment workflows, operational evidence, and generated diagrams.
- Produces: module reference, architecture, installation, deployment, maintenance, security, recovery, and troubleshooting manual.

- [ ] **Step 1: Test subsystem coverage**

Require every backend feature module and controller, public handler family, web route group, mobile navigation group, AI endpoint family, schema family, migration range, queue processor, Compose service, workflow, and environment key to map to a System Manual section or appendix.

- [ ] **Step 2: Generate verified diagrams**

Create high resolution diagrams for runtime topology, request and authentication flow, academic data flow, assessment lifecycle, AI job flow, notification flow, backup and restore, deployment pipeline, and troubleshooting decision paths. Validate diagram labels against inventory identifiers.

- [ ] **Step 3: Author the manual and appendices**

For each module, state purpose, owners, main files, inputs, outputs, dependencies, data ownership, permissions, normal workflow, failure behavior, and verification. Mark claims Confirmed, Inferred, or Unverified when evidence strength matters.

- [ ] **Step 4: Build DOCX and PDF**

Reuse the common document design. Use landscape sections only for diagrams or matrices that remain unreadable in portrait. Keep captions with figures and repeat table headers across page breaks.

- [ ] **Step 5: Render and inspect every page**

Run the same visual, accessibility, heading, image, and section audits as the User Manual. Fix every defect and rerender.

- [ ] **Step 6: Verify complete system coverage**

Run: `node --test scripts/handoff/tests/system-manual-coverage.test.mjs`
Expected: zero unmapped modules, routes, handlers, tables, migrations, queues, services, workflows, or documented environment keys.

- [ ] **Step 7: Commit the System Manual sources and builder**

```bash
git add scripts/handoff/content/system-manual.md scripts/handoff/content/system-manual-figures.json scripts/handoff/diagrams scripts/handoff/documents/build_system_manual.py scripts/handoff/tests/system-manual-coverage.test.mjs
git commit -m "docs: build complete Nexora System Manual"
```

### Task 9 Quick Starts Configuration Recovery and Troubleshooting

**Files:**
- Create: `scripts/handoff/content/windows-quick-start.md`
- Create: `scripts/handoff/content/linux-quick-start.md`
- Create: `scripts/handoff/content/android-install-guide.md`
- Create: `scripts/handoff/content/configuration-reference.md`
- Create: `scripts/handoff/content/backup-and-restore-runbook.md`
- Create: `scripts/handoff/content/disaster-recovery-checklist.md`
- Create: `scripts/handoff/content/troubleshooting-decision-tree.md`
- Create: `scripts/handoff/recovery/backup-postgres.sh`
- Create: `scripts/handoff/recovery/restore-postgres.sh`
- Create: `scripts/handoff/tests/recovery-safety.test.mjs`
- Generate: corresponding PDF files under `02-QUICK-START/`, `04-MOBILE/`, `05-CONFIG-TEMPLATES/`, and `06-DATABASE-AND-RECOVERY/`.

**Interfaces:**
- Consumes: current scripts, Compose configuration, environment inventory, APK identity, health endpoints, and disposable database.
- Produces: beginner friendly operational references and explicit safe recovery scripts.

- [ ] **Step 1: Test destructive target refusal**

The backup and restore wrappers must reject empty paths, root paths, unresolved variables, production like hostnames, missing source dumps, hash mismatches, and restore targets that are not new documentation databases.

- [ ] **Step 2: Write literal first run procedures**

Include prerequisites, exact UI and terminal paths, commands, expected output, stop conditions, troubleshooting, privacy boundaries, and evidence capture for Windows and Linux.

- [ ] **Step 3: Write the complete configuration reference**

List all current documentable keys by service and mark each Required, Conditional, Optional, or Generated. Explain purpose, safe example form, dependencies, restart requirement, and secrecy level without embedding deployed values.

- [ ] **Step 4: Implement and exercise backup and restore**

Create a timestamped PostgreSQL custom format dump, upload archive, metadata file, and SHA256 manifest. Restore to a new disposable database. Verify migrations, selected row counts, file hashes, and application readiness.

- [ ] **Step 5: Build and inspect the supporting PDFs**

Render each document, inspect every page, and verify that decision trees remain readable at normal print scale.

- [ ] **Step 6: Commit operational sources and scripts**

```bash
git add scripts/handoff/content scripts/handoff/recovery scripts/handoff/tests/recovery-safety.test.mjs
git commit -m "docs: add Nexora handoff operations and recovery guides"
```

### Task 10 Source APK Templates and Integrity Packaging

**Files:**
- Create: `scripts/handoff/package-artifacts.mjs`
- Create: `scripts/handoff/generate-checksums.mjs`
- Create: `scripts/handoff/tests/package-artifacts.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/03-SOURCE/nexora-source-211483f.zip`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/04-MOBILE/nexora-mobile-0.1.56-build57.apk`
- Generate: configuration templates and notices
- Generate: `output/NEXORA_HANDOFF_2026-10-01/MANIFEST.sha256`

**Interfaces:**
- Consumes: locked Git commit, current immutable APK, example environment files, license manifests, and package contents.
- Produces: reproducible source archive, verified APK copy, safe templates, notices, and complete checksum manifest.

- [ ] **Step 1: Test exclusion rules**

Require the source archive to exclude `.git`, `.env`, dependencies, caches, output, test reports, old APKs, and generated binaries. Require the package to contain exactly one APK.

- [ ] **Step 2: Build the source archive from Git**

Run `git archive` against `211483f07b901299b48ae42eda318c7448f1cbfd`, compress it, and write source commit and contents records.

- [ ] **Step 3: Copy and verify the immutable APK**

Require size `37,663,914` bytes and SHA256 `e5d8c1abc1935768dae5b2523bd85adf9ccab50085a7f6a516495304890495d8`. Refuse any mismatch.

- [ ] **Step 4: Generate safe configuration templates and notices**

Copy only example templates, rename them for clarity, and scan values for credential patterns. Generate third party license summaries from lock files without copying dependency trees.

- [ ] **Step 5: Generate the package manifest**

Hash every final package file except `MANIFEST.sha256`, sort by portable relative path, then write the manifest last.

- [ ] **Step 6: Commit the packaging tooling**

```bash
git add scripts/handoff
git commit -m "build: package Nexora source APK and integrity records"
```

### Task 11 Final Completion Audit

**Files:**
- Create: `scripts/handoff/verify-handoff.mjs`
- Create: `scripts/handoff/tests/verify-handoff.test.mjs`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/09-DEPLOYMENT-EVIDENCE/completion-report.json`
- Generate: `output/NEXORA_HANDOFF_2026-10-01/09-DEPLOYMENT-EVIDENCE/completion-report.txt`

**Interfaces:**
- Consumes: approved design, implementation plan, all generated files, render reports, capture metadata, inventory, package manifest, and runtime verification results.
- Produces: requirement by requirement completion evidence and final pass or fail status.

- [ ] **Step 1: Encode every acceptance requirement**

Create machine readable checks for required files, route and subsystem coverage, screenshot provenance, synthetic data classification, document accessibility, render page counts, local links, checksums, archive exclusions, package size, backup and restore result, Compose validation, health checks, and APK identity.

- [ ] **Step 2: Run focused builder tests**

Run: `node --test scripts/handoff/tests/*.test.mjs`
Expected: all handoff builder, safety, coverage, and packaging tests pass.

- [ ] **Step 3: Run repository relevant verification**

Run Compose configuration validation, migration checks, backend build and focused tests, frontend build and focused tests, mobile typecheck and release checks, and AI service tests needed to verify documented procedures. Record exact commands and results.

- [ ] **Step 4: Verify all final documents visually**

Confirm that every page of every DOCX and PDF has a reviewed PNG. Record reviewer status per page. Fail completion if any page is missing, clipped, overlapping, unreadable, or contains placeholder or private information.

- [ ] **Step 5: Verify package portability and integrity**

Copy the folder to a different temporary parent path. Open `START-HERE.html`, verify all relative links, verify every checksum, confirm the package is below 32 GB, and confirm that no reader facing file contains an absolute path from the build machine.

- [ ] **Step 6: Run the completion verifier**

Run: `node scripts/handoff/verify-handoff.mjs`
Expected: `PASS`, with zero missing requirements and a completion report identifying the locked application commit and handoff build commit.

- [ ] **Step 7: Commit final reproducibility tooling**

```bash
git add scripts/handoff
git commit -m "test: verify complete Nexora handoff package"
```

- [ ] **Step 8: Present the finished package**

Open `START-HERE.html` in the Codex browser panel and open both final DOCX sources with PDF preview. Report the final folder path, final size, page counts, visual counts, source commit, build commit, APK identity, verification result, and any evidence explicitly limited to emulator or source level testing.
