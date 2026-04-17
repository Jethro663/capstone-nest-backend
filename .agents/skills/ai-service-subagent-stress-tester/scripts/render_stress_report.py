#!/usr/bin/env python3
"""Render durable AI stress-test artifacts from a normalized JSON payload."""

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


def _render_list(items: list[Any], empty_message: str) -> list[str]:
    if not items:
        return [f"- {empty_message}"]
    return [f"- {item}" for item in items]


def _status_counts(findings: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(str(item.get("status", "unknown")).lower() for item in findings)
    return dict(sorted(counts.items()))


def render_audit(payload: dict[str, Any]) -> str:
    baseline = _as_list(payload.get("baseline"))
    scenarios = [item for item in _as_list(payload.get("scenarios")) if isinstance(item, dict)]
    findings = [item for item in _as_list(payload.get("findings")) if isinstance(item, dict)]
    changes = _as_list(payload.get("changesMade"))
    verification = _as_list(payload.get("verification"))
    comparison = payload.get("comparison", {}) if isinstance(payload.get("comparison"), dict) else {}
    readiness = payload.get("readiness", {}) if isinstance(payload.get("readiness"), dict) else {}
    second_pass = _as_list(payload.get("secondPassVerification"))
    run_meta = payload.get("runMeta", {}) if isinstance(payload.get("runMeta"), dict) else {}

    lines = [
        "# AI Service Stress Test Audit",
        "",
        "## Stress-Test Summary",
        "",
        f"- Date: `{_date_stamp(payload)}`",
        f"- Repo: `{run_meta.get('repo', 'capstone-nest-react-lms')}`",
        f"- Findings recorded: `{len(findings)}`",
        f"- Scenario count: `{len(scenarios)}`",
        f"- Status counts: `{_status_counts(findings)}`",
        "",
        "## Baseline",
        "",
    ]
    lines.extend(_render_list(baseline, "No baseline checks were recorded."))

    lines.extend(["", "## Scenario Matrix Summary", ""])
    if not scenarios:
        lines.append("- No scenarios were recorded.")
    else:
        for index, scenario in enumerate(scenarios, start=1):
            lines.extend(
                [
                    f"### {index}. {scenario.get('feature', 'unknown feature')} - {scenario.get('scenario', 'unnamed scenario')}",
                    "",
                    f"- Load style: `{scenario.get('loadStyle', 'unspecified')}`",
                    f"- Expected result: {scenario.get('expectedResult', 'Not recorded.')}",
                    f"- Failure signal: {scenario.get('failureSignal', 'Not recorded.')}",
                    f"- Observability evidence: {scenario.get('observabilityEvidence', 'Not recorded.')}",
                    f"- Confidence: `{scenario.get('confidence', 'unknown')}`",
                    "",
                ]
            )

    lines.extend(["## Prioritized Findings", ""])
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
                    f"- Status: `{finding.get('status', 'unknown')}`",
                    f"- Category: `{finding.get('category', 'uncategorized')}`",
                    f"- Files: {files}",
                    f"- Evidence: {finding.get('evidence', 'No evidence recorded.')}",
                    "",
                ]
            )

    lines.extend(["## Actual Edits", ""])
    lines.extend(_render_list(changes, "No safe edits were applied in this run."))

    lines.extend(["", "## Verification", ""])
    lines.extend(_render_list(verification, "No verification commands were recorded."))

    lines.extend(["", "## Before vs After", ""])
    lines.append("### Improved")
    lines.append("")
    lines.extend(_render_list(_as_list(comparison.get("improved")), "No confirmed improvements were recorded."))
    lines.extend(["", "### Stayed The Same", ""])
    lines.extend(_render_list(_as_list(comparison.get("unchanged")), "No unchanged items were recorded."))
    lines.extend(["", "### Remaining Risks", ""])
    lines.extend(_render_list(_as_list(comparison.get("remainingRisks")), "No remaining risks were recorded."))

    lines.extend(["", "## Confidence in LXP and AI Feature Readiness", ""])
    lines.append(f"- LXP: `{readiness.get('lxp', 'unverified')}`")
    lines.append(f"- AI features: `{readiness.get('aiFeatures', 'unverified')}`")
    lines.extend(_render_list(_as_list(readiness.get("notes")), "No readiness notes were recorded."))

    lines.extend(["", "## Second-Pass Verification", ""])
    lines.extend(_render_list(second_pass, "No second-pass verification notes were recorded."))
    return "\n".join(lines) + "\n"


def render_plan(payload: dict[str, Any]) -> str:
    plan = payload.get("plan", {}) if isinstance(payload.get("plan"), dict) else {}
    safe = _as_list(plan.get("safeImmediateFixes"))
    conditional = _as_list(plan.get("conditionalRefactors"))
    deferred = _as_list(plan.get("deferredItems"))

    lines = [
        "# AI Service Stress Test Fix Plan",
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
    parser.add_argument("payload_file", type=Path, help="JSON file containing normalized stress-test results")
    parser.add_argument("--output-dir", type=Path, default=Path("docs/system-audit"))
    args = parser.parse_args()

    payload = _load_payload(args.payload_file)
    stamp = _date_stamp(payload)
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    audit_path = output_dir / f"ai-service-stress-audit-{stamp}.md"
    plan_path = output_dir / f"ai-service-stress-fix-plan-{stamp}.md"
    data_path = output_dir / f"ai-service-stress-data-{stamp}.json"

    audit_path.write_text(render_audit(payload), encoding="utf-8")
    plan_path.write_text(render_plan(payload), encoding="utf-8")
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
