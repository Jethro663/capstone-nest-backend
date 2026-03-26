#!/usr/bin/env python3
"""Render Markdown audit and fix-plan artifacts from normalized findings JSON."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path


def _load_payload(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _slug(role: str) -> str:
    return role.strip().lower()


def _ensure_list(value):
    return value if isinstance(value, list) else []


def render_audit(payload: dict) -> str:
    role = payload["role"]
    findings = _ensure_list(payload.get("findings"))
    routes = _ensure_list(payload.get("routes"))
    skipped = _ensure_list(payload.get("skipped"))
    run_meta = payload.get("runMeta", {})
    severity_counts = Counter((finding.get("severity") or "unknown").lower() for finding in findings)

    lines = [
        f"# {role.title()} Frontend Audit",
        "",
        "## Run Summary",
        "",
        f"- Role: `{role}`",
        f"- Frontend root: `{run_meta.get('frontendRoot', 'next-frontend')}`",
        f"- Seed file: `{run_meta.get('seedFile', 'backend/seed-database.js')}`",
        f"- Base URL: `{run_meta.get('baseUrl', 'unknown')}`",
        f"- Routes discovered: `{len(routes)}`",
        f"- Findings: `{len(findings)}`",
        f"- Severity counts: `{dict(severity_counts) if severity_counts else {}}`",
        "",
        "## Route Inventory",
        "",
    ]

    if routes:
        lines.extend(f"- `{route}`" for route in routes)
    else:
        lines.append("- No routes were recorded.")

    lines.extend(["", "## Findings", ""])

    if not findings:
        lines.append("- No findings were recorded.")
    else:
        for index, finding in enumerate(findings, start=1):
            evidence = finding.get("evidence") or "No additional evidence recorded."
            repro = finding.get("repro") or "Replay the same route and action."
            lines.extend(
                [
                    f"### {index}. {finding.get('title') or finding.get('action') or 'Unnamed finding'}",
                    "",
                    f"- Severity: `{finding.get('severity', 'unknown')}`",
                    f"- Route: `{finding.get('route', 'unknown')}`",
                    f"- Action: `{finding.get('action', 'unknown')}`",
                    f"- Symptom: {finding.get('symptom', 'Unknown symptom')}",
                    f"- Owner: `{finding.get('owner', 'unknown')}`",
                    f"- Source: `{finding.get('source', 'unknown')}`",
                    f"- Evidence: {evidence}",
                    f"- Repro: {repro}",
                    "",
                ]
            )

    lines.extend(["## Not Exercised", ""])
    if skipped:
        lines.extend(f"- {item}" for item in skipped)
    else:
        lines.append("- No skipped actions were recorded.")

    return "\n".join(lines) + "\n"


def render_fix_plan(payload: dict) -> str:
    role = payload["role"]
    findings = _ensure_list(payload.get("findings"))

    lines = [
        f"# {role.title()} Frontend Fix Plan",
        "",
        "## Summary",
        "",
        f"- Target role: `{role}`",
        f"- Issues to address: `{len(findings)}`",
        "- This plan is derived from the latest audit evidence and stops before code changes.",
        "",
        "## Issues",
        "",
    ]

    if not findings:
        lines.append("- No issues were recorded.")
        return "\n".join(lines) + "\n"

    for index, finding in enumerate(findings, start=1):
        verification = finding.get("verification")
        if not verification:
            route = finding.get("route", "unknown")
            action = finding.get("action", "unknown")
            verification = (
                f"Re-run the {role} audit flow for `{route}` and confirm "
                f"`{action}` succeeds without console or network errors."
            )
        lines.extend(
            [
                f"### {index}. {finding.get('title') or finding.get('action') or 'Unnamed issue'}",
                "",
                f"- Owner: `{finding.get('owner', 'unknown')}`",
                f"- Source area: `{finding.get('source', 'unknown')}`",
                f"- Problem: {finding.get('symptom', 'Unknown symptom')}",
                f"- Fix intent: {finding.get('fixIntent') or 'Trace the failing UI action, align the page state/API contract, and restore the expected behavior.'}",
                f"- Verification: {verification}",
                "",
            ]
        )

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("findings_file", type=Path, help="JSON file containing normalized audit findings")
    parser.add_argument("--output-dir", type=Path, default=Path("docs/testing"))
    args = parser.parse_args()

    payload = _load_payload(args.findings_file)
    role = _slug(payload["role"])
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    audit_path = output_dir / f"{role}-frontend-audit.md"
    plan_path = output_dir / f"{role}-frontend-fix-plan.md"

    audit_path.write_text(render_audit(payload), encoding="utf-8")
    plan_path.write_text(render_fix_plan(payload), encoding="utf-8")

    print(json.dumps({"audit": str(audit_path), "plan": str(plan_path)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
