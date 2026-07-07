# Audit Notes

## Assumptions
- Approximate page references are based on the paper's list of figures/list of tables and extracted paragraph ordering when exact rendered pagination was not recoverable from raw text alone.
- When a feature existed in code but was not executed live in this audit, it is marked Real or Partial based on implementation evidence and explicitly noted as not live-verified.
- When a mobile feature had a screen shell but the repository itself stated the data source was not live-backed, it was treated as Partial rather than Real.

## Key Evidence Sources
- Uploaded research paper DOCX and extracted text/media
- `Concept Paper.pdf` plus extracted `Concept paper.txt`
- `backend/package.json`, `next-frontend/package.json`, `mobile/package.json`
- `docker-compose.yml`
- `backend/src/drizzle/schema/*`
- `backend/src/modules/*`
- `ai-service/app/*`
- `docs/research-paper-audit/repo_scan.json`
- `docs/research-paper-audit/playwright-summary.json`

## Repo Truth Anchors
- Threshold anchor: `backend/src/modules/lxp/lxp.service.ts:35`
- Threshold default anchor: `backend/src/drizzle/schema/performance.schema.ts:47`
- Grade-level anchor: `backend/src/drizzle/schema/base.schema.ts:68`
- Mobile teacher limitation: `mobile/src/screens/TeacherUnsupportedScreen.tsx:40,45`
- Mobile discussion limitation: `mobile/src/screens/ClassDetailScreen.tsx:1228`
- Swagger route anchor: `backend/src/main.ts:123-124`
- Real-time notification anchor: `backend/src/modules/notifications/notifications.gateway.ts:13`
- AI fallback anchor: `ai-service/app/config.py:51-87` and `ai-service/app/cloud_fallback.py`

## Working Verdict
- Readiness score: 42/100
- Panel risk: Critical
- Verdict: Not safe

## Severity Counts
- Critical: 8
- Major: 10
- Moderate: 5
- Minor: 2
