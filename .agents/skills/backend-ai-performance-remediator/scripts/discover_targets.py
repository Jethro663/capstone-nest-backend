#!/usr/bin/env python3
"""Emit a deterministic inventory of backend modules and AI service files."""

from __future__ import annotations

import json
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _backend_modules(root: Path) -> list[dict[str, object]]:
    modules_dir = root / "backend" / "src" / "modules"
    items: list[dict[str, object]] = []
    for path in sorted(p for p in modules_dir.iterdir() if p.is_dir()):
        file_count = sum(1 for child in path.rglob("*") if child.is_file())
        spec_count = sum(1 for child in path.rglob("*.spec.ts") if child.is_file())
        items.append(
            {
                "name": path.name,
                "path": path.relative_to(root).as_posix(),
                "fileCount": file_count,
                "specCount": spec_count,
            }
        )
    return items


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


def main() -> int:
    root = _repo_root()
    payload = {
        "repoRoot": str(root),
        "backendModules": _backend_modules(root),
        "aiServiceFiles": _ai_files(root),
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
