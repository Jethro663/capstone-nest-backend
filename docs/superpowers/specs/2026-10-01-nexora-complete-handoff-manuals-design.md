# Nexora Complete Handoff Manuals Design

**Date:** October 1, 2026  
**Source branch:** `developement`  
**Source commit:** `211483f07b901299b48ae42eda318c7448f1cbfd`  
**Primary audience:** First year information technology students, information technology faculty, future maintainers, school administrators, teachers, and learners  
**Delivery target:** A portable external drive package smaller than 32 GB with internet assisted first setup

## Purpose

The handoff package must let a new reader understand, run, operate, maintain, and recover Nexora without first studying the repository. It will provide two complementary books, an offline start page, current installers and source, safe configuration templates, operational procedures, and integrity records. The writing will use short steps, plain English, current Nexora terminology, and real web and mobile visuals.

The package is designed as a durable reference. It will explain what the system does, how each role uses it, how the application components work together, how to deploy and troubleshoot it, and how to confirm that the supplied copy is intact.

## Approved Direction

The selected approach is a combined portable handoff library with two books:

1. **Nexora User Manual** explains tasks by role. Each workflow pairs the web instructions with the corresponding mobile instructions.
2. **Nexora System Manual** explains architecture, modules, contracts, installation, deployment, maintenance, security, recovery, and troubleshooting.

The root entry point is `START-HERE.html`. It works without a web server and links to the books, quick start procedures, installers, source, checksums, and recovery material.

The package is built from the current source snapshot. Application behavior is tied to the commit shown above, while deployment evidence may identify the tested application commit separately when the current commit changes documentation only.

## Delivery Folder

The permanent folder is:

`output/NEXORA_HANDOFF_2026-10-01/`

Its structure is fixed as follows:

```text
NEXORA_HANDOFF_2026-10-01/
├── START-HERE.html
├── README-FIRST.txt
├── MANIFEST.sha256
├── VERSION.txt
├── 01-MANUALS/
│   ├── Nexora-User-Manual.docx
│   ├── Nexora-User-Manual.pdf
│   ├── Nexora-System-Manual.docx
│   ├── Nexora-System-Manual.pdf
│   └── sources/
├── 02-QUICK-START/
│   ├── Windows-Quick-Start.pdf
│   ├── Linux-Quick-Start.pdf
│   ├── First-Run-Checklist.pdf
│   └── Troubleshooting-Decision-Tree.pdf
├── 03-SOURCE/
│   ├── nexora-source-211483f.zip
│   ├── SOURCE-COMMIT.txt
│   └── SOURCE-CONTENTS.txt
├── 04-MOBILE/
│   ├── nexora-mobile-0.1.56-build57.apk
│   ├── APK-SHA256.txt
│   └── Android-Install-Guide.pdf
├── 05-CONFIG-TEMPLATES/
│   ├── root.env.example
│   ├── backend.env.example
│   ├── ai-service.env.example
│   ├── mobile.env.example
│   └── configuration-reference.pdf
├── 06-DATABASE-AND-RECOVERY/
│   ├── Backup-and-Restore-Runbook.pdf
│   ├── Disaster-Recovery-Checklist.pdf
│   ├── demo-data/
│   └── scripts/
├── 07-DIAGRAMS/
├── 08-VISUALS/
│   ├── web/
│   ├── mobile/
│   ├── components/
│   └── annotations/
├── 09-DEPLOYMENT-EVIDENCE/
└── 10-LICENSES-AND-NOTICES/
```

Generated dependencies, Docker image archives, package caches, old APK versions, Ollama models, production secrets, and production database contents are excluded. Internet access is used to download dependencies and model files during setup.

## Manual Design

Both books use US Letter portrait pages, readable body text, black titles and headings, and the current Nexora identity. Red is used for action markers and numbered annotations. Navy is used for table headers, diagram structure, and navigation accents. White and pale gray provide the main reading surfaces.

The canonical colors are:

- Navy: `#0C1D3A`
- Red: `#DC2626`
- Dark red: `#B91C1C`
- Pale red: `#FEE2E2`
- White: `#FFFFFF`
- Light border: `#D9D9D9`

The GABHS seal, current Nexora mark, school imagery, and current application assets are reused where appropriate. The older teal and orange master manual identity will not be carried forward.

Every book includes:

- a plain title page;
- document version, source commit, build date, and intended reader;
- a deterministic linked table of contents;
- numbered chapters and descriptive headings;
- figure captions and meaningful image alternative text;
- a glossary and searchable index terms;
- a version and evidence appendix;
- page numbers and compact document identity in the footer.

## User Manual Structure

### Getting Started

- What Nexora is
- Supported roles and devices
- Signing in
- Account activation and email verification
- Setting the initial password
- Password recovery
- Completing a profile
- Navigation on web and mobile
- Notifications, profile, password changes, and sign out
- Privacy guidance for school information

### Administrator Tasks

- Dashboard and diagnostics
- Users and role assignment
- Sections, classes, schedules, and rosters
- Roster import and validation
- Calendar and school events
- Nexora Library
- Class Record and academic records
- User reports and system reports
- Evaluations and announcements
- AI chatbot and audit trail
- Academic year and grading settings
- Year transition and learner completion
- Maintenance access and lifecycle review
- Demo mode
- School data reset and recovery safeguards

### Teacher Tasks

- Dashboard, classes, sections, and calendar
- Class roster and learner profiles
- Modules, lessons, files, and library content
- Assessments, question editing, preview, release, and review
- AI draft review and application
- Class Record and score entry
- Reports, performance, interventions, and learner support
- Evaluations and announcements
- Profile and account security

### Student Tasks

- Dashboard and upcoming work
- Courses, classes, modules, lessons, and files
- Assessments, attempts, submission, results, and history
- Calendar and announcements
- JA Hub
- Learners Path, guided assessments, and generated lessons
- Evaluations
- Profile, academic requirements, and transcript related destinations

### Workflow Page Pattern

Each procedure follows one consistent pattern:

1. State the result the reader will achieve.
2. State the required role and any prerequisite records.
3. Show the full web screen with red numbered markers.
4. Explain one action per numbered step.
5. Show a focused crop when the control is small or the result is easy to miss.
6. Present the matching mobile procedure immediately after the web procedure.
7. State the expected result.
8. State the most common mistake and the exact recovery action.
9. Add a short technical note explaining which module or rule performs the work.

## System Manual Structure

### System Overview

- Product purpose and role boundaries
- Repository layout
- Runtime topology
- Data and request flow
- Trust boundaries
- Web and mobile contract ownership
- AI assistance boundaries

### Module Reference

- NestJS feature modules and controllers
- Next.js route groups, shared providers, services, and components
- Expo navigation, screens, providers, services, storage, and updater
- FastAPI endpoints, retrieval, extraction, generation, and reset behavior
- PostgreSQL schemas, relationships, migrations, and pgvector usage
- Redis, BullMQ queues, processors, retry behavior, and restart safety
- Notifications, uploads, audit records, and health checks

Each module entry states its purpose, main files, inputs, outputs, dependencies, data ownership, permissions, normal workflow, failure behavior, and verification method.

### Installation and Local Operation

- Hardware and software prerequisites
- External drive preparation
- Source extraction and checksum verification
- Environment configuration
- Docker Compose setup
- Internet assisted dependency and model download
- Service startup order
- Database migration and safe seeding
- Health and readiness checks
- Web access and mobile API configuration
- Stop, restart, update, and log collection procedures

### Deployment and Operations

- GitHub Actions verification
- Railway services and deployment order
- Environment variables and secrets
- Domains, CORS, cookies, storage, and mobile registration
- Android APK build, release, updater metadata, and installation
- iOS status and evidence boundaries
- Monitoring and optional observability profile
- Capacity, performance, and cost considerations

### Maintenance and Recovery

- Database backup and restore
- Upload preservation
- Redis and queue recovery
- Migration verification
- Demo mode and safe testing
- Maintenance access
- System reset safeguards
- Incident triage
- Disaster recovery checklist
- Version upgrades and rollback decisions

### Security and Privacy

- Authentication and rotating refresh tokens
- Role based access control
- Backend authority and client trust boundaries
- Internal AI service authentication
- Secret handling
- Audit history
- School data privacy
- Screenshot and demonstration data rules

## Visual Evidence Rules

Visuals must come from current source or a verified current runtime. They must not recreate a screen from memory.

Accepted visual sources are:

1. A browser screenshot from the current web build using synthetic demonstration data.
2. A native Android or Expo screenshot from the current mobile source or build 57.
3. A rendered current component used when a real state is destructive, rare, asynchronous, or unsafe to trigger.
4. A diagram generated from verified current architecture and contracts.

Every screenshot records:

- role;
- platform;
- route or mobile screen name;
- application version or commit;
- capture date;
- data classification;
- manual chapter and figure number.

No visual may contain real learner names, grades, messages, email addresses, tokens, secrets, or notification content. Demonstration identities and data must be visibly synthetic.

Annotations use red numbered circles and short labels outside the control whenever space allows. A full screen image establishes context. A second crop is included only when it materially improves legibility.

The base capture inventory covers all 114 web pages and all active mobile route surfaces. Critical workflows receive additional images for empty, loading, validation, success, failure, confirmation, and recovery states. Existing embedded web guide renderings can be reused after current source verification. Mobile walkthrough visuals require new capture or component rendering because the mobile source has no equivalent manual shot set.

## Demonstration Data

The current general seed populates only a subset of the present schema and cannot by itself demonstrate every current module. The handoff build therefore uses a disposable documentation database and a dedicated demonstration fixture.

The fixture must include:

- one administrator, one teacher, and at least two learners;
- a current academic year and grading period;
- one section and one active class;
- a roster with clearly fictional identities;
- a module, lesson, file, assessment, attempt, score, and returned result;
- an announcement, calendar event, evaluation, report data, performance data, and intervention case;
- Learners Path and JA demonstration records;
- notifications and audit events;
- safe maintenance, demo mode, and lifecycle states;
- deterministic identifiers needed by screenshot scripts.

The fixture must be idempotent, must target only an explicitly selected disposable database, and must refuse production like database hosts or names.

## Source and Binary Packaging

The source archive is created with `git archive` from commit `211483f07b901299b48ae42eda318c7448f1cbfd`. It contains tracked source only and excludes repository history, dependencies, caches, local environment files, test output, and earlier APK releases.

The package includes only the current Android artifact:

- Version: `0.1.56`
- Build: `57`
- Size: `37,663,914` bytes
- SHA256: `e5d8c1abc1935768dae5b2523bd85adf9ccab50085a7f6a516495304890495d8`

Every final file is recorded in `MANIFEST.sha256`. The start page includes a plain explanation of how to verify the manifest on Windows and Linux.

## Configuration Safety

Configuration templates contain names, safe example values, and explanations only. They never contain deployed credentials. Variables are grouped by service and purpose. The System Manual distinguishes required, conditionally required, optional, and generated values.

The configuration appendix covers the 98 current documentable environment keys and calls out keys that were absent from the old manual. Secret values are always created or copied into a local untracked file.

## Backup and Restore

The package adds a reproducible PostgreSQL backup and restore procedure because the current documentation does not provide a complete one. The runbook includes:

- backup prerequisites and free space check;
- timestamped custom format database dump;
- upload storage backup;
- manifest generation;
- restore into a new empty database;
- migration and row count verification;
- application readiness verification;
- explicit stop conditions for wrong targets, missing dumps, hash mismatch, and migration mismatch.

Backup and restore scripts require explicit database names and paths. They refuse broad or unresolved targets and do not delete data automatically.

## Start Page

`START-HERE.html` is a self contained offline page with no external fonts, scripts, or network requirements. It contains:

- the package version and source commit;
- a five step first run path;
- links to the User Manual and System Manual;
- Windows and Linux quick starts;
- Android installation;
- backup and restore;
- troubleshooting by symptom;
- source, configuration, and checksum locations;
- a warning that internet is required for first time dependency and model downloads;
- a clear statement that production secrets and production data are not included.

## Verification Gates

The handoff is complete only when all gates pass.

### Content Gate

- Every current primary web and mobile destination appears in the User Manual.
- Every active backend, web, mobile, AI, database, queue, and deployment subsystem appears in the System Manual.
- Every command is checked against current configuration or executed in an isolated environment.
- Unsupported or unverified behavior is labeled precisely.

### Visual Gate

- Every figure has a caption and meaningful alternative text.
- Every screenshot uses current source and synthetic data.
- All DOCX pages are rendered and inspected.
- All PDF pages are rendered and inspected.
- No clipping, overlap, missing glyphs, unreadable diagrams, broken tables, or excessive empty pages remain.

### Operational Gate

- Compose configuration validates.
- Disposable setup reaches live and ready health checks.
- Backup and restore completes against a disposable database.
- Source and APK hashes match the recorded values.
- The offline start page opens and all local links resolve.

### Portability Gate

- The complete folder is smaller than 32 GB.
- The source archive excludes dependencies and secrets.
- Only the current APK is included.
- No absolute machine paths appear in reader facing content.
- The package works when moved to a different folder or external drive.

## Evidence Status

### Confirmed

- Current source branch and commit are `developement` and `211483f07b901299b48ae42eda318c7448f1cbfd`.
- The current repository has 116 Drizzle tables, 55 enums, 485 NestJS HTTP handlers, 63 FastAPI handlers, 114 Next.js pages, 100 mobile screen files, 9 BullMQ processors, and 37 SQL migration files.
- The existing 343 page master manual is tied to commit `3d0c93e` from July 13, 2026 and contains no real application walkthrough screenshots.
- The current general database seed writes to 22 named tables and does not cover the complete current schema.
- The current Docker Compose file defines six core services and eight optional observability services.
- The current APK version, build, size, and hash match the values in this design.
- A source archive and the current APK fit well within the 32 GB package limit when dependencies, model files, old APKs, and caches are excluded.

### Inferred

- The finished User Manual will require at least one visual for every role task and additional state images for complex workflows.
- The finished System Manual will be easier to maintain when inventory appendices are generated from source instead of copied by hand.
- The complete visual set will require a disposable documentation environment rather than the current local database.

### Unverified Until Build Execution

- Exact final page counts for both books.
- Exact final screenshot count and package size.
- Native rendering on every target Windows Word version.
- Physical Android device rendering for every mobile route.
- iPhone and TestFlight behavior that has not yet received physical device evidence.

## Implementation Sequence

1. Create the portable folder, version file, manifest tooling, and offline start page.
2. Generate current inventories for routes, modules, controllers, tables, queues, migrations, variables, and deployment assets.
3. Build the safe disposable documentation database and demonstration fixture.
4. Capture and annotate the web visuals.
5. Capture and annotate the mobile visuals.
6. Author the User Manual source and generate DOCX and PDF editions.
7. Author the System Manual source and generate DOCX and PDF editions.
8. Add quick starts, configuration reference, backup and restore material, Android installation, and troubleshooting aids.
9. Package source and the current APK.
10. Generate checksums, validate all links, render every page, inspect every page, and verify final size.

## Acceptance

The design is accepted when the user confirms that this structure matches the requested external drive handoff. Implementation then follows a written task plan and preserves the locked source commit, paired web and mobile instructions, beginner friendly language, current Nexora visual identity, synthetic data rule, and complete verification gates.
