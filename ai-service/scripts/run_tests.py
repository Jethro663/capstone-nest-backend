from __future__ import annotations

import os
import pathlib
import sys
import unittest


def configure_test_environment() -> None:
    os.environ.setdefault("AI_RUNTIME_MODE", "test")


def main() -> int:
    configure_test_environment()
    project_root = pathlib.Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(project_root))

    suite = unittest.defaultTestLoader.discover(
        start_dir=str(project_root / "tests"),
        top_level_dir=str(project_root),
    )
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
