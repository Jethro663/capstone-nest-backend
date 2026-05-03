# Teacher Performance Upgrade Draft

Date: May 3, 2026  
Owner: Product + Frontend + Backend + AI Service  
Route Target: `/dashboard/teacher/performance`

## 1) Why This Upgrade Is Needed

Current route strengths:
- Visual theme already matches LMS branding.
- Data plumbing is real and useful (summary, at-risk list, diagnostics, logs, AI analysis jobs).

Current route weaknesses:
- Too many analytics terms for a busy teacher.
- AI output is not yet classroom-action-first.
- The most visible output can feel abstract (`% mastery`, `misses`) instead of instruction-ready.
- Concept labels can degrade when question tagging is weak, causing low-trust phrasing.

Core product gap:
- The page explains **what happened** but not clearly enough **what to teach next**.

---

## 2) Product Goal

Convert the performance page from a monitoring dashboard into a teacher action workspace.

Teacher questions the page must answer in under 30 seconds:
1. Who needs support now?
2. What exact skill or lesson is breaking?
3. What should I teach in the next class period?

---

## 3) UX Direction (Teacher-Friendly, Not Technical)

### 3.1 Keep The Existing Theme, Change The Language

Replace technical labels with teacher-facing language:
- `At Risk` -> `Needs Support Now`
- `Class Snapshot` -> `Class Pulse`
- `Score Diagnostics` -> `Teaching Signals`
- `Recent Performance Logs` -> `Recent Changes`
- `AI Learning Gap Analysis` -> `AI Teaching Assistant`
- `Mastery` -> `Student Confidence`
- `Misses` -> `Students Confused`

### 3.2 New Workspace Tabs

Use a clear 3-tab structure:
1. `Action` (default)
2. `Lesson Plan AI`
3. `Data Details`

Behavior:
- `Action` is always first because it is the fastest decision path.
- `Data Details` keeps deeper metrics for transparency/audit but no longer leads the route.

### 3.3 Action Tab Layout

Top strip (always visible):
- Total learners
- Learners doing well
- Learners needing support now
- Class trend (`Improving`, `Stable`, `Declining`)

Main panels:
1. `Priority Learners` table
   - Student
   - Current level (`Doing well`, `Watch`, `Needs support`)
   - Main struggle topic
   - Suggested next action
   - CTA: `Open Student Plan`

2. `Top 3 Teaching Signals`
   - Topic
   - Why this matters (plain language)
   - Evidence count
   - Recommended in-class move

3. `This Week Teaching Focus`
   - 3 short bullets:
     - `Reteach`
     - `Practice`
     - `Challenge`

---

## 4) New Feature: AI-Generated Class Lesson Plan

## 4.1 Feature Summary

Add a class-level AI planning flow that generates a lesson plan from:
- student performance profile,
- class module/lesson coverage,
- weak/strong concept distribution.

This plan must differ based on class profile:
- mostly excelling classes,
- mixed ability classes,
- heavily struggling classes.

## 4.2 Plan Modes

The generator should explicitly classify and label output as one of:
1. `Recovery Plan` (many students below threshold)
2. `Mixed Plan` (wide spread of performance)
3. `Acceleration Plan` (majority performing strongly)

## 4.3 Input Signals (Grounded)

Required inputs:
- class performance summary
- concept hotspots
- lowest assessments
- recent trend/log transitions
- class modules and lesson inventory
- available assessments linked to lessons/modules

Optional inputs:
- teacher note (`focus on fractions this week`)
- time budget (`40 mins`, `80 mins`)
- session count (`1`, `2`, `3 meetings`)

## 4.4 Output Contract (Teacher-Usable)

Each generated class lesson plan should return:
- `planType`: `recovery | mixed | acceleration`
- `summary`: one-paragraph plain language rationale
- `targetConcepts`: ranked concepts tied to evidence
- `groupStrategy`:
  - whole-class focus
  - small-group support
  - enrichment track
- `sessionPlan[]`:
  - objective
  - opening activity
  - core instruction
  - guided practice
  - quick check
  - homework/exit task
- `differentiation`:
  - struggling learners track
  - average learners track
  - advanced learners track
- `sourceEvidence`:
  - concept + count
  - linked assessments
  - linked lesson/module references
- `teacherReviewRequired: true`

## 4.5 UX Flow

`Lesson Plan AI` tab flow:
1. Teacher clicks `Generate Class Lesson Plan`.
2. Modal asks:
   - Plan horizon (`next class`, `this week`)
   - Time per meeting
   - Optional teacher note
3. Job starts with progress status.
4. Result renders in editable sections.
5. Teacher can:
   - edit plan text,
   - remove/replace activity blocks,
   - save draft,
   - apply to class workflow (announcement/module task/intervention support path).

## 4.6 Guardrails

Hard rules:
- Do not recommend content outside class module scope unless clearly marked `optional extension`.
- Do not auto-publish to students.
- Always show evidence references for each major recommendation.
- Return `insufficient evidence` state when signals are weak.
- Preserve deterministic checks for thresholds and trend classification before AI narrative expansion.

---

## 5) Technical Draft (Implementation Direction)

## 5.1 Frontend

Target file:
- `next-frontend/app/(dashboard)/dashboard/teacher/performance/page.tsx`

Key refactor plan:
- Split page into focused components:
  - `PerformanceActionTab`
  - `PerformanceLessonPlanTab`
  - `PerformanceDataTab`
- Move copy strings into a route-local content map for consistent teacher phrasing.
- Keep existing analysis flow, but upgrade rendering to full teacher action cards.

## 5.2 Backend

Keep current performance job pattern and extend it.

Proposed endpoints:
- `POST /performance/classes/:classId/lesson-plan/jobs`
- `GET /performance/lesson-plan/jobs/:jobId`
- `GET /performance/lesson-plan/jobs/:jobId/result`

Proposed output type:
- `class_lesson_plan`

Reuse:
- existing job lifecycle (`pending`, `processing`, `completed`, `failed`)
- teacher/admin role guards
- class ownership checks

## 5.3 AI Service

Create a dedicated generation routine for class-level planning that:
- consumes normalized class performance signals + curriculum scope,
- classifies plan type deterministically first,
- uses model generation for instructional narrative and activity sequencing,
- returns strict JSON schema for frontend rendering/editing.

---

## 6) Quality And Trust Requirements

Acceptance quality bar:
1. Teacher can understand primary recommendations without reading technical terms.
2. Every major recommendation has visible evidence.
3. Generated plan can be edited before any apply step.
4. Empty/weak data does not produce fake certainty.
5. Plan output differs meaningfully across recovery/mixed/acceleration class profiles.

---

## 7) Rollout Plan

Phase 1: UX Reframe (No new AI endpoint)
- Rename labels and restructure tabs.
- Promote action-first summaries.
- Expand current AI analysis rendering to show richer existing fields.

Phase 2: Class Lesson Plan Jobs
- Add backend + AI job endpoints.
- Add `Lesson Plan AI` tab with generate/status/result flow.

Phase 3: Apply Workflow
- Save, revise, and apply plan into teacher workflows with approval checkpoints.

---

## 8) Success Metrics

Primary:
- Time-to-first-action on performance page (target: reduced by 40%).
- Teacher plan adoption rate (generated plan -> saved draft).

Secondary:
- Reduction in abandoned analysis runs.
- Increased intervention follow-through for flagged learners.
- Higher teacher satisfaction score on clarity/usability.

---

## 9) Non-Goals (For This Iteration)

- Fully autonomous plan publishing.
- Replacing teacher judgment with AI decisions.
- Building a new grading engine.
- Cross-class district-level optimization.

---

## 10) Final Product Positioning

This upgraded page should feel like:
- a **Teacher Decision Assistant**, not a raw analytics wall.

The biggest win is not “more metrics.”  
The biggest win is:  
`From class performance signal -> to concrete next lesson plan -> with evidence -> teacher-approved execution.`
