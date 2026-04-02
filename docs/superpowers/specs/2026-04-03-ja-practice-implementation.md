# JA Practice v1 Implementation Spec

Date: 2026-04-03

## Goal
Implement JA Practice as a first-class student subsystem with:
- unified student entry at `/dashboard/student/ja`
- JA-owned persistence and XP
- synchronous generation of 10 objective items
- deterministic answer checking
- save/resume + anti-cheat strike telemetry

## Delivered Boundaries
- Official assessment/LXP records are untouched.
- JA data is isolated in JA-specific tables.
- Existing student tutor endpoints remain operational (legacy compatibility).
- Student `chatbot` and `lxp` routes redirect to JA.

## Backend Surface
- `GET /api/ai/student/ja/practice/bootstrap`
- `POST /api/ai/student/ja/practice/sessions`
- `GET /api/ai/student/ja/practice/sessions/:sessionId`
- `POST /api/ai/student/ja/practice/sessions/:sessionId/responses`
- `POST /api/ai/student/ja/practice/sessions/:sessionId/events`
- `POST /api/ai/student/ja/practice/sessions/:sessionId/complete`
- `DELETE /api/ai/student/ja/practice/sessions/:sessionId`

## Data Model
- `ja_sessions`
- `ja_session_items`
- `ja_session_responses`
- `ja_session_events`
- `ja_progress`
- `ja_xp_ledger`

## AI-Service Internal Contracts
- `GET /student/ja/practice/bootstrap`
- `POST /student/ja/practice/sessions/generate`

## Sequence: Start Session
```mermaid
sequenceDiagram
  participant UI as Next.js JA Page
  participant API as NestJS JA Module
  participant AIS as FastAPI JA Endpoint
  participant DB as PostgreSQL

  UI->>API: POST /api/ai/student/ja/practice/sessions
  API->>DB: Validate enrollment + visible source IDs
  API->>AIS: POST /student/ja/practice/sessions/generate
  AIS->>DB: Build objective question packet (10 items)
  AIS-->>API: Packet + validation metadata
  API->>DB: Insert ja_sessions + ja_session_items
  API->>DB: Audit log ja.session.created
  API-->>UI: Session snapshot + items
```

## Sequence: Resume Session
```mermaid
sequenceDiagram
  participant UI as Next.js JA Page
  participant API as NestJS JA Module
  participant DB as PostgreSQL

  UI->>API: GET /api/ai/student/ja/practice/sessions/:id
  API->>DB: Fetch session + items + responses
  API-->>UI: Rehydrated session state
```

## Sequence: Submit Response
```mermaid
sequenceDiagram
  participant UI as Next.js JA Page
  participant API as NestJS JA Module
  participant DB as PostgreSQL

  UI->>API: POST /api/ai/student/ja/practice/sessions/:id/responses
  API->>DB: Load item answer_key_json
  API->>API: Deterministic objective evaluation
  API->>DB: Upsert ja_session_responses
  API->>DB: Update ja_sessions.current_index
  API-->>UI: Correctness + feedback + progress counters
```

## Sequence: Complete + Award
```mermaid
sequenceDiagram
  participant UI as Next.js JA Page
  participant API as NestJS JA Module
  participant DB as PostgreSQL

  UI->>API: POST /api/ai/student/ja/practice/sessions/:id/complete
  API->>DB: Aggregate scores + answered count
  API->>DB: Check ja_xp_ledger idempotency
  alt First completion
    API->>DB: Insert ja_xp_ledger
    API->>DB: Upsert ja_progress
  end
  API->>DB: Mark session completed + reward_state=awarded
  API->>DB: Insert ja_session_events + audit log
  API-->>UI: Summary + awardedNow + xpAwarded
```

## QA Acceptance Checklist
- session stores exactly 10 validated objective items
- response upsert works on re-answer
- completion idempotency prevents double XP
- focus strike events are recorded
- deleting session removes JA-owned rows only
- `/dashboard/student/chatbot` redirects to `/dashboard/student/ja`
- `/dashboard/student/lxp` redirects to `/dashboard/student/ja`
