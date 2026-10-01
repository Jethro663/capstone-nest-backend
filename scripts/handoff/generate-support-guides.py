#!/usr/bin/env python3
"""Generate the portable, beginner-facing Nexora support PDFs."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    PageBreak,
    Spacer,
    Table,
    TableStyle,
)


NAVY = colors.HexColor("#0C1D3A")
RED = colors.HexColor("#DC2626")
RED_DARK = colors.HexColor("#B91C1C")
RED_SOFT = colors.HexColor("#FEE2E2")
INK = colors.HexColor("#101828")
MUTED = colors.HexColor("#475467")
BORDER = colors.HexColor("#D9D9D9")
PALE = colors.HexColor("#F7F8FA")
COMMIT = "211483f07b901299b48ae42eda318c7448f1cbfd"


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("NexoraTitle", parent=base["Title"], fontName="Helvetica-Bold", fontSize=22, leading=25, textColor=NAVY, spaceAfter=5 * mm),
        "subtitle": ParagraphStyle("NexoraSubtitle", parent=base["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=MUTED, alignment=TA_CENTER, spaceAfter=4 * mm),
        "h1": ParagraphStyle("NexoraH1", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=NAVY, spaceBefore=2.5 * mm, spaceAfter=2 * mm),
        "h2": ParagraphStyle("NexoraH2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=RED_DARK, spaceBefore=3 * mm, spaceAfter=1.5 * mm),
        "body": ParagraphStyle("NexoraBody", parent=base["BodyText"], fontName="Helvetica", fontSize=8.8, leading=11.5, textColor=INK, spaceAfter=1.5 * mm),
        "small": ParagraphStyle("NexoraSmall", parent=base["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=1.5 * mm),
        "bullet": ParagraphStyle("NexoraBullet", parent=base["BodyText"], fontName="Helvetica", fontSize=8.8, leading=11.5, textColor=INK, leftIndent=6 * mm, firstLineIndent=-3.5 * mm, spaceAfter=1 * mm),
        "code": ParagraphStyle("NexoraCode", parent=base["Code"], fontName="Courier", fontSize=7.5, leading=9.5, textColor=INK, backColor=PALE, borderColor=BORDER, borderWidth=0.5, borderPadding=5, spaceAfter=2 * mm),
        "callout": ParagraphStyle("NexoraCallout", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8.7, leading=11.5, textColor=RED_DARK, backColor=RED_SOFT, borderColor=RED, borderWidth=0.7, borderPadding=6, spaceBefore=1 * mm, spaceAfter=2.5 * mm),
        "table": ParagraphStyle("NexoraTable", parent=base["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=INK),
        "table_head": ParagraphStyle("NexoraTableHead", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white),
    }


S = styles()


def xml(value: str) -> str:
    return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def p(text: str, style: str = "body"):
    return Paragraph(xml(text).replace("\n", "<br/>"), S[style])


def rich(text: str, style: str = "body"):
    return Paragraph(text, S[style])


def bullet(text: str):
    return Paragraph(f"&#8226;&nbsp;&nbsp;{xml(text)}", S["bullet"])


def numbered(items):
    return [Paragraph(f"<b>{index}.</b>&nbsp;&nbsp;{xml(item)}", S["bullet"]) for index, item in enumerate(items, 1)]


def code(text: str):
    return p(text, "code")


def callout(title: str, text: str):
    return rich(f"<b>{xml(title)}</b><br/>{xml(text)}", "callout")


def table(headers, rows, widths=None):
    data = [[Paragraph(xml(cell), S["table_head"]) for cell in headers]]
    data += [[Paragraph(xml(cell), S["table"]) for cell in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
    ]))
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(RED)
    canvas.setLineWidth(1.2)
    canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(NAVY)
    canvas.drawString(18 * mm, height - 12 * mm, "NEXORA")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"{doc.title}  |  {COMMIT[:8]}  |  Page {doc.page}")
    canvas.restoreState()


def build_pdf(path: Path, title: str, subtitle: str, story):
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(path), pagesize=A4, title=title, author="Nexora / Gat Andres Bonifacio High School",
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=19 * mm, bottomMargin=14 * mm,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates(PageTemplate(id="nexora", frames=[frame], onPage=header_footer))
    opening = [Spacer(1, 3 * mm), p("GAT ANDRES BONIFACIO HIGH SCHOOL", "subtitle"), p(title, "title"), p(subtitle, "subtitle"), callout("Evidence edition", f"Instructions match application snapshot {COMMIT}. Production credentials and school records are not included.")]
    doc.build(opening + story)


def first_read_story():
    return [
        p("Use this package in this order", "h1"),
        *numbered([
            "Copy the entire NEXORA_HANDOFF_2026-10-01 folder from the external drive to a local SSD. Keep the drive copy unchanged as your reference copy.",
            "Open START-HERE.html, then read the System Manual chapters 1 through 6 before installing or restoring anything.",
            "Verify MANIFEST.sha256 before trusting the source archive or APK.",
            "Choose the Windows or Linux/macOS quick start and prepare unique local secrets from the supplied templates.",
            "Start the stack, wait for health checks, then use the User Manual for role-by-role web and mobile tasks.",
        ]),
        p("What is included", "h1"),
        table(["Folder", "Purpose"], [
            ["01-MANUALS", "Complete printable/editable User and System Manuals plus searchable Markdown sources."],
            ["02-QUICK-START", "Beginner setup paths, first-run checklist, and symptom-based troubleshooting."],
            ["03-SOURCE", "Source-only archive locked to commit 211483f; dependencies and secrets are excluded."],
            ["04-MOBILE", "Current Android APK, install guide, and SHA-256 evidence."],
            ["05-CONFIG-TEMPLATES", "Sanitized templates and the complete 98-key configuration reference."],
            ["06-DATABASE-AND-RECOVERY", "Backup/restore runbooks, guarded scripts, recovery checklist, and synthetic fixture notes."],
            ["07-DIAGRAMS / 08-VISUALS", "Architecture diagrams and the evidence images used by the manuals."],
            ["09-DEPLOYMENT-EVIDENCE", "Snapshot, verification, release, and evidence-boundary records."],
            ["10-LICENSES-AND-NOTICES", "Project and direct-dependency notices."],
        ], [45 * mm, 120 * mm]),
        p("Safety rules", "h1"),
        callout("Stop immediately", "Do not continue if the target database, environment, account role, backup checksum, or affected-record preview differs from what you intended."),
        bullet("Never copy a production .env file onto the external drive."),
        bullet("Never run containers, databases, node_modules, or Android builds directly from the removable drive."),
        bullet("Never remove Docker volumes or overwrite a production database as a troubleshooting step."),
        bullet("The first setup needs internet access for container images, npm/Python packages, and AI models."),
    ]


def windows_story():
    return [
        p("Before you begin", "h1"),
        bullet("64-bit Windows 10/11 with virtualization enabled, administrator rights for installation, and at least 25 GB free local disk space."),
        bullet("Install Git, Docker Desktop with WSL 2, Node.js 20.9 or newer, and a modern browser."),
        bullet("Connect to the internet for the first build and Ollama model downloads."),
        callout("Use a local folder", "Copy the package to C:\\Nexora-Handoff or another short writable path. Do not run Docker from the external drive."),
        p("1. Extract the locked source", "h1"),
        code("Expand-Archive -Path .\\03-SOURCE\\nexora-source-211483f.zip -DestinationPath C:\\Nexora-Source\nSet-Location C:\\Nexora-Source"),
        p("2. Prepare configuration", "h1"),
        code("Copy-Item .env.compose.example .env\nnotepad .env"),
        bullet("Replace every CHANGE_ME value with a unique value. Keep BACKEND_DATABASE_URL and AI_DATABASE_URL passwords aligned with POSTGRES_PASSWORD."),
        bullet("Do not add secrets to NEXT_PUBLIC_* or EXPO_PUBLIC_* values."),
        p("3. Validate and start", "h1"),
        code("docker compose config --quiet\ndocker compose up -d"),
        bullet("The first start may take several minutes because three AI models are downloaded. Watch progress with docker compose logs -f ollama."),
        p("4. Prove readiness", "h1"),
        code("docker compose ps\ndocker compose logs --tail=100\nInvoke-WebRequest http://localhost:3000/api/health/ready\nStart-Process http://localhost:3001"),
        callout("Done when", "All six core services are running or healthy, backend readiness succeeds, and the Nexora web page opens at http://localhost:3001."),
        p("5. Stop without losing data", "h1"),
        code("docker compose down"),
        bullet("This keeps named volumes. Never add --volumes unless the environment is disposable and deletion was explicitly approved."),
    ]


def linux_story():
    return [
        p("Before you begin", "h1"),
        bullet("Linux with Docker Engine + Compose v2, or macOS with Docker Desktop; Git; Node.js 20.9 or newer; at least 25 GB free local disk space."),
        bullet("Internet access is required for the first build and model downloads."),
        p("1. Extract into a writable local folder", "h1"),
        code("mkdir -p ~/nexora-source\nunzip 03-SOURCE/nexora-source-211483f.zip -d ~/nexora-source\ncd ~/nexora-source"),
        p("2. Prepare unique local configuration", "h1"),
        code("cp .env.compose.example .env\nchmod 600 .env\n${EDITOR:-nano} .env"),
        bullet("Replace every CHANGE_ME value. Keep database passwords aligned and keep the internal AI shared secret identical for backend and AI service."),
        p("3. Validate and start", "h1"),
        code("docker compose config --quiet\ndocker compose up -d"),
        p("4. Watch and verify", "h1"),
        code("docker compose ps\ndocker compose logs --tail=100\ncurl --fail http://localhost:3000/api/health/ready\ncurl --fail http://localhost:3001"),
        callout("Done when", "The six core services are healthy/running, readiness returns success, and the frontend returns HTTP 200."),
        p("5. Normal stop and restart", "h1"),
        code("docker compose down\ndocker compose up -d"),
        bullet("Named volumes survive this restart. Never use docker compose down --volumes on a shared or valuable environment."),
    ]


def first_run_story():
    checks = [
        ("Identity", "VERSION.txt shows commit 211483f07b901299b48ae42eda318c7448f1cbfd."),
        ("Integrity", "MANIFEST.sha256 verifies with no missing or changed files."),
        ("Location", "Source is extracted to a local SSD, not executed from the external drive."),
        ("Secrets", "Every CHANGE_ME value is replaced; .env is untracked and private."),
        ("Compose", "docker compose config --quiet exits successfully."),
        ("Services", "postgres, redis, ollama, backend, ai-service, and frontend are running/healthy."),
        ("Backend", "GET http://localhost:3000/api/health/ready succeeds."),
        ("Web", "http://localhost:3001 loads and the browser console has no blocking error."),
        ("Roles", "A synthetic learner, teacher, and administrator can sign in and only see allowed workspaces."),
        ("Read flow", "One dashboard/class/calendar view loads for each role."),
        ("Write flow", "One synthetic draft or preview saves once and remains correct after refresh."),
        ("Mobile", "APK checksum matches before install; sign-in reaches the configured HTTPS API."),
        ("Evidence", "Operator records date, environment, source commit, result, and unresolved warnings."),
    ]
    return [
        p("First-run acceptance checklist", "h1"),
        callout("Rule", "Do not onboard real users or import real rosters until every applicable row passes."),
        table(["Pass?", "Check", "Expected evidence"], [["[  ]", a, b] for a, b in checks], [13 * mm, 33 * mm, 118 * mm]),
        p("Stop conditions", "h1"),
        bullet("Any checksum mismatch, unknown source commit, or package path that points outside the copied handoff folder."),
        bullet("Database/readiness errors, role leakage, policy bypass, or a write result that changes after refresh."),
        bullet("A request to reuse production secrets or copy production records into an uncontrolled device."),
    ]


def troubleshooting_story():
    rows = [
        ["docker command not found", "Docker is not installed or the terminal is stale.", "Install/start Docker Desktop or Engine; reopen the terminal; run docker version."],
        ["Compose validation fails", "Missing/invalid .env value.", "Read the exact variable name; compare with .env.compose.example; never guess a secret from another environment."],
        ["Container exited", "Startup or dependency failure.", "Run docker compose ps --all, then docker compose logs --tail=200 SERVICE."],
        ["Ollama still starting", "First model downloads are incomplete.", "Keep internet connected; run docker compose logs -f ollama; wait for all three model messages."],
        ["Backend readiness 503", "Database, Redis, AI, model, or storage is not ready.", "Inspect the readiness body and corresponding service logs; repair that dependency first."],
        ["Web opens but API fails", "Wrong API URL, backend unavailable, or browser origin mismatch.", "Check backend readiness and the configured API origin; rebuild frontend after build-time URL changes."],
        ["Login rejected", "Wrong credentials, inactive account, role/lifecycle state, or stale session.", "Use an authorized synthetic account; read the exact message; clear only that session and retry once."],
        ["Mobile cannot connect", "EXPO_PUBLIC_API_URL is unreachable from the device.", "Use a reachable HTTPS address; 10.0.2.2 works only for Android emulator to host."],
        ["APK will not install", "Unknown apps disabled, old signature conflict, corruption, or unsupported device.", "Verify SHA-256; allow this file manager/browser; remove only an explicitly approved conflicting test install."],
        ["Restore refuses target", "The script detected an existing/unsafe database name or checksum mismatch.", "Stop. Create a new *_restore_test name and re-verify the backup; do not bypass the guard."],
    ]
    return [
        p("Decision rule", "h1"),
        callout("Read before retrying", "Capture the exact command, service, timestamp, visible message, and request ID. Retry a write only after you understand whether the first attempt committed."),
        table(["Symptom", "Likely cause", "Next safe action"], rows, [42 * mm, 48 * mm, 75 * mm]),
        p("Escalate when", "h1"),
        bullet("Authorization, data scope, grade/history integrity, backup validity, or rollback safety is uncertain."),
        bullet("The same corrected step fails twice, a production-only change is requested, or evidence would need to be deleted to continue."),
    ]


def android_story():
    return [
        p("Artifact identity", "h1"),
        table(["Field", "Expected"], [
            ["Version", "0.1.56"], ["Build", "57"], ["Size", "37,663,914 bytes"],
            ["SHA-256", "e5d8c1abc1935768dae5b2523bd85adf9ccab50085a7f6a516495304890495d8"],
        ], [35 * mm, 130 * mm]),
        p("1. Verify before installing", "h1"),
        code("Windows:  Get-FileHash .\\nexora-mobile-0.1.56-build57.apk -Algorithm SHA256\nLinux:    sha256sum nexora-mobile-0.1.56-build57.apk"),
        callout("Stop", "Do not install if the size or SHA-256 differs, even if the file name looks correct."),
        p("2. Install on Android", "h1"),
        *numbered([
            "Copy the APK to the Android device through a trusted cable or the external drive.",
            "Open the file in Files/My Files. If Android asks, allow installs from that specific file manager temporarily.",
            "Review the app name and requested permissions, then choose Install.",
            "Open Nexora and enter the school-provided server and account details only through the app's supported flow.",
            "After installation, disable the temporary Install unknown apps permission if it is no longer needed.",
        ]),
        p("3. Confirm operation", "h1"),
        bullet("Sign-in screen renders with the GABHS/Nexora identity."),
        bullet("The configured API is reachable from the device network."),
        bullet("One role workspace loads and a sign-out/sign-in cycle works."),
        bullet("An installer launch is not proof of installation; confirm the app opens and reports version 0.1.56 build 57."),
    ]


def backup_story():
    return [
        p("What this protects", "h1"),
        bullet("PostgreSQL/pgvector database in custom pg_dump format."),
        bullet("Uploaded files or object-storage export."),
        bullet("Checksums, source commit, database server version, and operator notes."),
        callout("Production rule", "Use a documented consistency/maintenance window. Never place production credentials or unencrypted production data in this handoff folder."),
        p("Backup procedure", "h1"),
        *numbered([
            "Confirm the exact environment, database host/name, owner, maintenance window, retention destination, and free space.",
            "Quiesce application writes or use the approved consistency strategy. Record the start time and deployed commit.",
            "Run the guarded backup script with explicit database URL, upload path, and a new output directory.",
            "Verify MANIFEST.sha256 in the backup directory and store a second copy in authorized durable storage.",
            "Resume writes only after the dump, files, manifest, and operator record are complete.",
        ]),
        p("Restore drill", "h1"),
        *numbered([
            "Choose a new empty disposable database whose name ends in _restore_test. Never point the first restore at production.",
            "Verify the backup manifest before creating the target.",
            "Run the guarded restore script. It refuses existing databases and does not delete a database automatically.",
            "Run current migrations only if the restore procedure explicitly calls for forward compatibility; record each result.",
            "Start an isolated app against the restored target and verify readiness, authentication, role isolation, representative files, one queue job, and one audit read.",
            "Compare key row counts and business invariants. Document the drill and retain the source backup unchanged.",
        ]),
        p("Example shell commands", "h1"),
        code("./scripts/backup-nexora.sh --db-url 'postgresql://...' --uploads /srv/nexora/uploads --output /secure/backups/nexora-YYYYMMDD\n./scripts/restore-nexora-verify.sh --admin-url 'postgresql://...' --backup /secure/backups/nexora-YYYYMMDD --target-db nexora_restore_test --confirm CREATE_EMPTY_TARGET"),
        callout("Do not cut over", "A successful pg_restore is not enough. Cutover requires integrity checks, application smoke tests, explicit authorization, a rollback target, and an approved window."),
    ]


def disaster_story():
    phases = [
        ["1. Stabilize", "[  ] Stop unsafe writes; preserve logs, audit IDs, queue IDs, current binaries, and current database/files."],
        ["2. Declare", "[  ] Record incident owner, severity, scope, start time, affected users, and communication channel."],
        ["3. Select", "[  ] Choose the latest verified backup before the incident; verify checksum and compatibility."],
        ["4. Rehearse", "[  ] Restore to a new isolated target and run migrations/integrity checks without touching production."],
        ["5. Validate", "[  ] Prove health, authentication, role isolation, academic evidence, files, queues, notifications, and audit reads."],
        ["6. Decide", "[  ] Obtain explicit cutover authorization with expected data loss window and rollback decision."],
        ["7. Cut over", "[  ] Change one controlled dependency at a time; monitor; retain the prior target read-only."],
        ["8. Close", "[  ] Reconcile data, notify stakeholders, rotate exposed credentials, and write the incident report."],
    ]
    return [
        p("Disaster recovery checklist", "h1"),
        callout("First principle", "Preserve evidence and restore into a new target. Do not erase the damaged environment or overwrite production during diagnosis."),
        table(["Phase", "Required evidence"], phases, [35 * mm, 130 * mm]),
        p("Minimum acceptance evidence", "h1"),
        bullet("Exact source commit/build and environment configuration key map."),
        bullet("Database and file checksums plus restore command output."),
        bullet("Readiness, role smoke, representative academic-history, upload, queue, notification, and audit checks."),
        bullet("Named approver, cutover time, expected recovery point, rollback target, and post-cutover observation result."),
    ]


def config_story(inventory_path: Path):
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    keys = inventory["configuration"]["uniqueKeys"]
    if isinstance(keys, dict):
        keys = keys.get("items", [])

    def purpose(key):
        if any(token in key for token in ("SECRET", "PASSWORD", "TOKEN", "API_KEY", "PEPPER")):
            return "Secret or credential; create uniquely, store outside source control, and rotate after exposure."
        if any(token in key for token in ("DATABASE", "POSTGRES", "DB_")):
            return "Database connection or database behavior; keep the intended environment explicit."
        if any(token in key for token in ("REDIS", "QUEUE", "BULL")):
            return "Redis or durable background-job behavior."
        if any(token in key for token in ("AI_", "OLLAMA", "MODEL", "EMBED", "OPENROUTER")):
            return "AI runtime, provider, model, retrieval, timeout, or concurrency setting."
        if any(token in key for token in ("NEXT_PUBLIC", "EXPO_PUBLIC", "URL", "DOMAIN", "CORS")):
            return "Client-visible URL/origin or build-time value; public prefixes must never contain secrets."
        if any(token in key for token in ("SMTP", "EMAIL", "MAIL", "OTP")):
            return "Email or verification delivery behavior."
        if any(token in key for token in ("RESET", "ERASE", "MAINTENANCE", "LIFECYCLE")):
            return "High-impact safety control; keep disabled until its governed workflow is approved."
        return "Environment-specific runtime configuration; document the owner and expected value."

    story = [
        p("Configuration rules", "h1"),
        callout("No real secrets", "The files in 05-CONFIG-TEMPLATES are sanitized starting points. Create .env only in the local source copy and never commit or return it to the external drive."),
        bullet("Root .env is the default Docker Compose input; .env.compose.example is its template."),
        bullet("AI_SERVICE_SHARED_SECRET must match backend and AI service, but must never appear in NEXT_PUBLIC_* or EXPO_PUBLIC_* values."),
        bullet("Changing a build-time web/mobile public URL requires a rebuild."),
        bullet("Keep reset, cascade erase, and maintenance controls disabled until their preview, audit, ownership, and recovery prerequisites are approved."),
        p(f"Complete current key index ({len(keys)} keys)", "h1"),
    ]
    rows = []
    for item in keys:
        sources = ", ".join(item.get("sources", []))
        rows.append([item["key"], purpose(item["key"]), sources])
    story.append(table(["Key", "Purpose", "Observed source(s)"], rows, [42 * mm, 75 * mm, 48 * mm]))
    return story


def main():
    repo = Path(__file__).resolve().parents[2]
    output = repo / "output" / "NEXORA_HANDOFF_2026-10-01"
    inventory = output / "01-MANUALS" / "sources" / "inventory.json"
    if not inventory.is_file():
        raise SystemExit(f"Missing inventory: {inventory}")
    specs = [
        (output / "02-QUICK-START" / "00-READ-ME-FIRST.pdf", "Read Me First", "The safest path from external drive to a verified Nexora workspace", first_read_story()),
        (output / "02-QUICK-START" / "Windows-Quick-Start.pdf", "Windows Quick Start", "Docker Desktop and PowerShell setup for a first-year IT operator", windows_story()),
        (output / "02-QUICK-START" / "Linux-Quick-Start.pdf", "Linux and macOS Quick Start", "Docker Compose terminal setup for a first-year IT operator", linux_story()),
        (output / "02-QUICK-START" / "First-Run-Checklist.pdf", "First-Run Checklist", "Evidence required before the system is trusted or real users are onboarded", first_run_story()),
        (output / "02-QUICK-START" / "Troubleshooting-Decision-Tree.pdf", "Troubleshooting Decision Tree", "Symptom, likely cause, safe next action, and escalation boundary", troubleshooting_story()),
        (output / "04-MOBILE" / "Android-Install-Guide.pdf", "Android Installation Guide", "Verify, install, connect, and validate Nexora Mobile 0.1.56 build 57", android_story()),
        (output / "06-DATABASE-AND-RECOVERY" / "Backup-and-Restore-Runbook.pdf", "Backup and Restore Runbook", "Guarded PostgreSQL, uploads, checksum, and restore-drill procedure", backup_story()),
        (output / "06-DATABASE-AND-RECOVERY" / "Disaster-Recovery-Checklist.pdf", "Disaster Recovery Checklist", "Preserve evidence, rehearse in isolation, validate, authorize, and cut over safely", disaster_story()),
        (output / "05-CONFIG-TEMPLATES" / "configuration-reference.pdf", "Configuration Reference", "All current documentable environment keys and their safe handling rules", config_story(inventory)),
    ]
    for path, title, subtitle, story in specs:
        build_pdf(path, title, subtitle, story)
        print(f"generated {path.relative_to(output)}")


if __name__ == "__main__":
    main()
