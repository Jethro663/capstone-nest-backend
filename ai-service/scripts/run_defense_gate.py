from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
from typing import Any

import httpx


def _print(msg: str) -> None:
    print(f"[defense-gate] {msg}")


def run_unit_suite(project_root: pathlib.Path) -> None:
    _print("Running ai-service unit tests...")
    result = subprocess.run(
        [sys.executable, str(project_root / "scripts" / "run_tests.py")],
        cwd=project_root,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("Unit test suite failed.")


def run_objective_eval(project_root: pathlib.Path) -> None:
    _print("Running objective grading fixture checks...")
    sys.path.insert(0, str(project_root))
    from app.objective_grading import evaluate_objective_answer  # noqa: WPS433

    fixture_path = project_root / "evals" / "objective_cases.json"
    cases = json.loads(fixture_path.read_text(encoding="utf-8"))
    failures: list[str] = []
    for case in cases:
        verdict = evaluate_objective_answer(
            question_text=str(case["question"]),
            expected_answer=str(case["expectedAnswer"]),
            student_answer=str(case["studentAnswer"]),
        )
        expected_correct = bool(case["expectCorrect"])
        if verdict.is_correct != expected_correct:
            failures.append(
                f'{case["name"]}: expected={expected_correct} got={verdict.is_correct} reason={verdict.reason}'
            )
    if failures:
        raise RuntimeError("Objective grading fixture checks failed:\n" + "\n".join(failures))


def run_optional_http_smoke() -> None:
    base_url = os.getenv("DEFENSE_SMOKE_BASE_URL", "").strip()
    if not base_url:
        _print("Skipping HTTP smoke checks (DEFENSE_SMOKE_BASE_URL not set).")
        return

    endpoints = [
        "/health",
        "/ready",
    ]
    _print(f"Running HTTP smoke checks against {base_url}...")
    failures: list[str] = []
    with httpx.Client(timeout=20.0) as client:
        for endpoint in endpoints:
            url = base_url.rstrip("/") + endpoint
            try:
                response = client.get(url)
            except Exception as err:  # pragma: no cover - network condition dependent
                failures.append(f"{endpoint}: request error {err}")
                continue
            if response.status_code >= 500:
                failures.append(f"{endpoint}: status {response.status_code}")
    if failures:
        raise RuntimeError("HTTP smoke checks detected server errors:\n" + "\n".join(failures))


def main() -> int:
    project_root = pathlib.Path(__file__).resolve().parents[1]
    try:
        run_unit_suite(project_root)
        run_objective_eval(project_root)
        run_optional_http_smoke()
        _print("Defense gate passed.")
        return 0
    except Exception as err:
        _print(str(err))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
