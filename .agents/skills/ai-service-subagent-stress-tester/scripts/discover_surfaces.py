#!/usr/bin/env python3
"""Emit a deterministic inventory of AI-service surfaces and nearby backend contract files."""

from __future__ import annotations

import json
from pathlib import Path


AI_ROUTE_HINTS = (
    "chat",
    "student/tutor",
    "student/ja",
    "extract",
    "extractions",
    "teacher/interventions",
    "teacher/quizzes",
    "health",
)

BACKEND_HINT_FILES = (
    "backend/src/modules/ai-mentor/ai-proxy.service.ts",
    "backend/src/modules/ai-mentor/ai-mentor.controller.ts",
    "backend/src/modules/lxp/lxp.controller.ts",
    "backend/src/modules/lxp/lxp.service.ts",
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _ai_files(root: Path) -> list[dict[str, object]]:
    app_dir = root / "ai-service" / "app"
    items: list[dict[str, object]] = []
    for path in sorted(app_dir.glob("*.py")):
        if path.name == "__init__.py":
            continue
        items.append(
            {
                "name": path.name,
                "path": path.relative_to(root).as_posix(),
                "bytes": path.stat().st_size,
            }
        )
    return items


def _ai_tests(root: Path) -> list[dict[str, object]]:
    tests_dir = root / "ai-service" / "tests"
    items: list[dict[str, object]] = []
    for path in sorted(tests_dir.glob("test_*.py")):
        items.append(
            {
                "name": path.name,
                "path": path.relative_to(root).as_posix(),
            }
        )
    return items


def _route_hints(root: Path) -> list[str]:
    main_path = root / "ai-service" / "app" / "main.py"
    content = main_path.read_text(encoding="utf-8")
    lines = []
    for line in content.splitlines():
        stripped = line.strip()
        if "@app." in stripped and any(hint in stripped for hint in AI_ROUTE_HINTS):
            lines.append(stripped)
    return lines


def _backend_contract_files(root: Path) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for rel in BACKEND_HINT_FILES:
        path = root / rel
        if path.exists():
            items.append(
                {
                    "path": rel.replace("\\", "/"),
                    "bytes": path.stat().st_size,
                }
            )
    return items


def main() -> int:
    root = _repo_root()
    payload = {
        "repoRoot": str(root),
        "aiFiles": _ai_files(root),
        "aiTests": _ai_tests(root),
        "routeHints": _route_hints(root),
        "backendContractFiles": _backend_contract_files(root),
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
