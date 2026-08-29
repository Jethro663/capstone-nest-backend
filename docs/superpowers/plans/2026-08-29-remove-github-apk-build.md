# Remove GitHub APK Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all GitHub-hosted Android APK building while preserving local Java 17/Gradle builds and every unrelated CI/CD workflow.

**Architecture:** Delete the single dedicated APK workflow instead of disabling individual triggers or jobs. Validate that no remaining GitHub Actions workflow invokes Gradle APK assembly or performs APK synchronization.

**Tech Stack:** GitHub Actions YAML, Git, ripgrep, Python/PyYAML or Ruby/Psych for YAML parsing.

## Global Constraints

- Do not modify mobile source code, Gradle configuration, or the existing downloadable APK.
- Do not modify the normal CI, Docker publishing, or Railway deployment workflows.
- Remove automatic and manual GitHub-hosted APK builds, APK synchronization, bot commits, and backend version registration together.
- Keep local Java 17 builds from `mobile/android` available through `./gradlew assembleRelease`.

---

### Task 1: Remove the GitHub APK Workflow

**Files:**
- Delete: `.github/workflows/build-mobile-apk.yml`
- Verify unchanged: `.github/workflows/ci.yml`
- Verify unchanged: `.github/workflows/docker-publish.yml`
- Verify unchanged: `.github/workflows/railway-deploy.yml`

**Interfaces:**
- Consumes: GitHub Actions workflow discovery under `.github/workflows/`.
- Produces: A workflow set with no GitHub-hosted Android APK assembly, APK synchronization, bot APK commit, or APK-triggered app-version registration.

- [x] **Step 1: Confirm the deletion target is unique**

Run:

```bash
rg -n -i 'assembleRelease|Build Mobile APK|nexora-student-mobile-release\.apk|auto-update student APK' .github/workflows
```

Expected: All APK build and synchronization matches are confined to `.github/workflows/build-mobile-apk.yml`.

- [x] **Step 2: Delete the dedicated workflow**

Use a patch that deletes the complete `.github/workflows/build-mobile-apk.yml` file. Do not edit any remaining workflow.

- [x] **Step 3: Confirm no APK automation remains**

Run:

```bash
if rg -n -i 'assembleRelease|Build Mobile APK|nexora-student-mobile-release\.apk|auto-update student APK' .github/workflows; then
  exit 1
fi
```

Expected: Exit code 0 with no matches.

- [x] **Step 4: Parse every remaining workflow and inspect the diff**

Run:

```bash
python3 -c 'from pathlib import Path; import yaml; [yaml.safe_load(path.read_text()) for path in Path(".github/workflows").glob("*.yml")]; print("remaining workflows parse successfully")'
git diff --check
git diff --stat
git status --short
```

Expected: YAML parsing exits 0, `git diff --check` exits 0, the diff reports deletion of `.github/workflows/build-mobile-apk.yml` plus this implementation-plan document, and no unrelated working-tree changes appear.

- [x] **Step 5: Commit the implementation**

Run:

```bash
git add .github/workflows/build-mobile-apk.yml docs/superpowers/plans/2026-08-29-remove-github-apk-build.md
git commit -m "ci: remove GitHub APK build workflow"
```

Expected: One commit deleting the APK workflow and recording this implementation plan.
