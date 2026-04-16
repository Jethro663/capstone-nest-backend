#!/usr/bin/env python3
"""Render durable backend/AI audit artifacts from a normalized JSON payload."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import date
from pathlib import Path
from typing import Any


def _load_payload(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _date_stamp(payload: dict[str, Any]) -> str:
    run_meta = payload.get("runMeta", {})
    raw = run_meta.get("date")
    if isinstance(raw, str) and raw:
        return raw
    return date.today().isoformat()


def _severity_counts(findings: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(str(item.get("severity", "unknown")).lower() for item in findings)
    return dict(sorted(counts.items()))


def _render_list(items: list[Any], empty_message: str) -> list[str]:
    if not items:
        return [f"- {empty_message}"]
    lines: list[str] = []
    for item in items:
        lines.append(f"- {item}")
    return lines


def render_audit(payload: dict[str, Any]) -> str:
    findings = [item for item in _as_list(payload.get("findings")) if isinstance(item, dict)]
    baseline_findings = _as_list(payload.get("baselineFindings"))
    changes_made = _as_list(payload.get("changesMade"))
    verification = _as_list(payload.get("verification"))
    second_pass = _as_list(payload.get("secondPassCleanCheck"))
    comparison = payload.get("comparison", {}) if isinstance(payload.get("comparison"), dict) else {}
    run_meta = payload.get("runMeta", {}) if isinstance(payload.get("runMeta"), dict) else {}
    severity_counts = _severity_counts(findings)

    lines = [
        "# Backend + AI Performance Audit",
        "",
        "## Audit Summary",
        "",
        f"- Date: `{_date_stamp(payload)}`",
        f"- Repo: `{run_meta.get('repo', 'capstone-nest-react-lms')}`",
        f"- Backend root: `{run_meta.get('backendRoot', 'backend')}`",
        f"- AI root: `{run_meta.get('aiRoot', 'ai-service')}`",
        f"- Findings recorded: `{len(findings)}`",
        f"- Severity counts: `{severity_counts}`",
        "",
        "## Baseline Findings",
        "",
    ]
    lines.extend(_render_list(baseline_findings, "No baseline findings were recorded."))

    lines.extend(["", "## Prioritized Findings", ""])
    if not findings:
        lines.append("- No findings were recorded.")
    else:
        for index, finding in enumerate(findings, start=1):
            files = ", ".join(_as_list(finding.get("files"))) or "No files recorded."
            lines.extend(
                [
                    f"### {index}. {finding.get('title', 'Unnamed finding')}",
                    "",
                    f"- Priority: `{finding.get('priority', 'unranked')}`",
                    f"- Severity: `{finding.get('severity', 'unknown')}`",
                    f"- Subsystem: `{finding.get('subsystem', 'unknown')}`",
                    f"- Category: `{finding.get('category', 'uncategorized')}`",
                    f"- Files: {files}",
                    f"- Rationale: {finding.get('rationale', 'No rationale recorded.')}",
                    f"- Evidence: {finding.get('evidence', 'No evidence recorded.')}",
                    f"- Expected impact: {finding.get('expectedImpact', 'No impact recorded.')}",
                    f"- Verification target: {finding.get('verificationTarget', 'No verification target recorded.')}",
                    f"- Status: `{finding.get('status', 'candidate')}`",
                    "",
                ]
            )

    lines.extend(["## Actual Edits", ""])
    lines.extend(_render_list(changes_made, "No safe edits were applied in this run."))

    lines.extend(["", "## Verification Run", ""])
    lines.extend(_render_list(verification, "No verification commands were recorded."))

    lines.extend(["", "## Before vs After", ""])
    lines.append("### Improved")
    lines.append("")
    lines.extend(_render_list(_as_list(comparison.get("improved")), "No confirmed improvements were recorded."))
    lines.extend(["", "### Stayed The Same", ""])
    lines.extend(_render_list(_as_list(comparison.get("unchanged")), "No unchanged items were recorded."))
    lines.extend(["", "### Remaining Risks", ""])
    lines.extend(_render_list(_as_list(comparison.get("remainingRisks")), "No remaining risks were recorded."))

    lines.extend(["", "## Second-Pass Clean Check", ""])
    lines.extend(_render_list(second_pass, "No second-pass clean-check notes were recorded."))
    return "\n".join(lines) + "\n"


def render_fix_plan(payload: dict[str, Any]) -> str:
    plan = payload.get("plan", {}) if isinstance(payload.get("plan"), dict) else {}
    safe = _as_list(plan.get("safeImmediateFixes"))
    conditional = _as_list(plan.get("conditionalRefactors"))
    deferred = _as_list(plan.get("deferredItems"))

    lines = [
        "# Backend + AI Performance Fix Plan",
        "",
        "## Safe Immediate Fixes",
        "",
    ]
    lines.extend(_render_list(safe, "No safe immediate fixes were recorded."))
    lines.extend(["", "## Conditional Local Refactors", ""])
    lines.extend(_render_list(conditional, "No conditional refactors were recorded."))
    lines.extend(["", "## Deferred Items Requiring Human Decision", ""])
    lines.extend(_render_list(deferred, "No deferred items were recorded."))
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("payload_file", type=Path, help="JSON file containing normalized audit results")
    parser.add_argument("--output-dir", type=Path, default=Path("docs/system-audit"))
    args = parser.parse_args()

    payload = _load_payload(args.payload_file)
    stamp = _date_stamp(payload)
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    audit_path = output_dir / f"backend-ai-performance-audit-{stamp}.md"
    plan_path = output_dir / f"backend-ai-performance-fix-plan-{stamp}.md"
    data_path = output_dir / f"backend-ai-performance-data-{stamp}.json"

    audit_path.write_text(render_audit(payload), encoding="utf-8")
    plan_path.write_text(render_fix_plan(payload), encoding="utf-8")
    data_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(
        json.dumps(
            {
                "audit": str(audit_path),
                "plan": str(plan_path),
                "data": str(data_path),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
