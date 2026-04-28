from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path
from urllib.parse import urlencode

import httpx

from .config import settings


def _candidate_paths(raw_path: str) -> list[str]:
    normalized = (raw_path or "").strip()
    if not normalized:
        return []

    upload_root = os.path.abspath(settings.upload_dir)
    normalized_slash = normalized.replace("\\", "/").lstrip("./")
    if normalized_slash.startswith("uploads/"):
        normalized_slash = normalized_slash[len("uploads/") :]

    candidates: list[str] = []
    if os.path.isabs(normalized):
        candidates.append(normalized)

    candidates.extend(
        [
            os.path.abspath(normalized),
            os.path.join(upload_root, normalized_slash),
            os.path.join(upload_root, os.path.basename(normalized)),
        ]
    )

    seen: set[str] = set()
    deduped: list[str] = []
    for candidate in candidates:
        absolute = os.path.abspath(candidate)
        if absolute in seen:
            continue
        seen.add(absolute)
        deduped.append(absolute)
    return deduped


def resolve_local_backend_upload_path(raw_path: str) -> str | None:
    for candidate in _candidate_paths(raw_path):
        if os.path.exists(candidate):
            return candidate
    return None


async def materialize_backend_upload(raw_path: str) -> str | None:
    local_path = resolve_local_backend_upload_path(raw_path)
    if local_path:
        return local_path

    backend_internal_url = (settings.backend_internal_url or "").strip().rstrip("/")
    normalized = (raw_path or "").strip()
    if not backend_internal_url or not normalized:
        return None

    suffix = Path(normalized).suffix
    cache_key = hashlib.sha1(normalized.encode("utf-8")).hexdigest()
    cache_dir = Path(tempfile.gettempdir()) / "nexora-backend-upload-cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cached_path = cache_dir / f"{cache_key}{suffix}"
    if cached_path.exists():
        return str(cached_path)

    query = urlencode(
        {
            "path": normalized,
        }
    )
    url = f"{backend_internal_url}/api/internal/uploads/raw?{query}"
    async with httpx.AsyncClient(timeout=settings.backend_upload_fetch_timeout_s) as client:
        response = await client.get(
            url,
            headers={
                "X-Internal-Service-Token": settings.ai_service_shared_secret or ""
            },
        )
        response.raise_for_status()
        cached_path.write_bytes(response.content)

    return str(cached_path)
