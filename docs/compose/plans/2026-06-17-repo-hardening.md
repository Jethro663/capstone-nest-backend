# Repo Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove obvious secret-leakage risks and stale documentation while updating the two known frontend smoke scripts with the smallest safe changes.

**Architecture:** Prefer non-destructive hygiene fixes over behavioral refactors. Keep runtime behavior intact by separating local secret usage from tracked files, and harden smoke scripts around the UI that exists today instead of restoring deprecated controls.

**Tech Stack:** Markdown docs, NestJS, Next.js, FastAPI/Pydantic settings, Playwright smoke scripts, Git ignore/index hygiene

---

## File map

- Modify: `.gitignore` - ignore AI local env files going forward
- Modify: `ai-service/app/config.py` - prefer ignored `.env.local` before tracked template values
- Modify: `backend/BACKEND_SETUP.md` - replace real-looking secrets and default credentials with placeholders/guidance
- Modify: `next-frontend/scripts/engine-perf-smoke.js` - align smoke to current template workspace controls
- Modify: `next-frontend/scripts/discussion-perf-smoke.js` - remove stale hardcoded class IDs and wait for current discussion UI
- Modify: `next-frontend/README.md` - replace starter boilerplate with product-specific guidance
- Modify: `backend/README.md` - replace Nest starter boilerplate with service-specific guidance

## Execution steps

- [ ] Validate each reported issue against current files before changing anything
- [ ] Remove hardcoded secret examples from `backend/BACKEND_SETUP.md`
- [ ] Stop future tracking of AI local env files and prefer `.env.local` in config
- [ ] Update engine smoke to verify current non-destructive template controls
- [ ] Harden discussion smoke against stale seeded IDs and UI timing
- [ ] Replace both service READMEs with accurate product documentation
- [ ] Verify changed scripts with static checks and confirm the Git status matches the intended scope
