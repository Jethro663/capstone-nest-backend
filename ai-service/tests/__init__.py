from __future__ import annotations

import os
import pathlib
import sys

os.environ.setdefault("AI_RUNTIME_MODE", "test")

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
