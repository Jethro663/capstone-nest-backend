# Nexora Documentation Index

This index separates current operating guidance from dated evidence. A date in a filename normally means “snapshot taken on that date,” not “current source of truth.”

## Start here

- Repository overview and startup: [`../README.md`](../README.md)
- Current verified state and bounded debt: [`../CURRENT_REPO_STATE.md`](../CURRENT_REPO_STATE.md)
- Agent routing kernel: [`../AGENTS.md`](../AGENTS.md)
- Performance/architecture implementation record: [`../implementation-fix.md`](../implementation-fix.md)
- Improvement roadmap and decision record: [`../improvement-plan.md`](../improvement-plan.md)

## Current subsystem guidance

- Backend: [`../backend/README.md`](../backend/README.md) and [`../backend/AGENTS.md`](../backend/AGENTS.md)
- Web: [`../next-frontend/README.md`](../next-frontend/README.md) and [`../next-frontend/AGENTS.md`](../next-frontend/AGENTS.md)
- AI service: [`../ai-service/README.md`](../ai-service/README.md) and [`../ai-service/AGENTS.md`](../ai-service/AGENTS.md)
- Mobile: [`../mobile/README.md`](../mobile/README.md) and [`../mobile/AGENTS.md`](../mobile/AGENTS.md)
- Monitoring: [`../monitoring/README.md`](../monitoring/README.md)
- Load testing: [`../load-tests/README.md`](../load-tests/README.md)

## Operations and deployment

- Classroom readiness: [`operations/classroom-readiness-runbook.md`](operations/classroom-readiness-runbook.md)
- GitHub Actions and deployment: [`devops/github-actions-cicd.md`](devops/github-actions-cicd.md)
- Azure Container Apps reference: [`deployment/AZURE_CONTAINER_APPS_DEPLOYMENT.md`](deployment/AZURE_CONTAINER_APPS_DEPLOYMENT.md)
- Current CI/dependency baseline: [`system-audit/ci-quality-baseline-2026-07-10.md`](system-audit/ci-quality-baseline-2026-07-10.md)

Deployment documents are provider-specific. Verify current workflows, environment variables, and provider settings before using commands from them.

## Architecture and product references

- System documentation: [`architecture/chapter-3/chapter-3-system-documentation.md`](architecture/chapter-3/chapter-3-system-documentation.md)
- JAKIPIR/RAG practice architecture: [`architecture/ja-rag-and-practice.md`](architecture/ja-rag-and-practice.md)
- Diagram index: [`diagrams/README.md`](diagrams/README.md)
- Mobile architecture blueprint: [`blueprints/mobile-update-arch.md`](blueprints/mobile-update-arch.md)

These documents explain intent and research context. Runtime contracts still come from code and the current subsystem guidance.

## Dated evidence and historical plans

- `system-audit/`: evidence captured during specific audits, including the July 13 performance audit and fix plan.
- `testing/`: role and module audit snapshots.
- `superpowers/plans/` and `superpowers/specs/`: implementation designs retained for traceability after completion.
- `compose/plans/` and `compose/reports/`: prior stabilization work.
- `research-paper-audit/`, `thesis-defense/`, and `demo/`: research, defense, and demonstration material; not runtime instructions.
- `operations/*plan*` and dated weakness documents: historical remediation records unless the current state document links them as active work.

Do not silently rewrite dated evidence to look current. Add a new dated audit or update the current-state documents instead.

## Cleanup policy

The repository does not track generated Playwright HTML reports, videos, screenshots, PDFs, spreadsheets, or `test-results` output. Regenerate those locally when needed. Real architectural decisions, audit inputs, and reproducible source artifacts remain tracked.

The obsolete June state dump, the early frontend Phase 1 completion memo, and the mobile placeholder memo were removed after their current information was folded into the root and subsystem READMEs.
