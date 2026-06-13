from __future__ import annotations

import asyncio
import base64
from typing import Any

from .backend_uploads import materialize_backend_upload, resolve_local_backend_upload_path


async def encode_file_to_base64(file_path: str) -> str:
    def _read():
        with open(file_path, "rb") as file_obj:
            return base64.b64encode(file_obj.read()).decode("utf-8")

    return await asyncio.to_thread(_read)


async def normalize_attachment_images(
    attachments: list[dict[str, Any]] | None,
) -> list[dict[str, str]]:
    prepared: list[dict[str, str]] = []
    for attachment in attachments or []:
        file_path = (attachment.get("filePath") or "").strip()
        base64_data = (attachment.get("base64Data") or "").strip()
        mime_type = (attachment.get("mimeType") or "").strip() or "image/png"

        if base64_data:
            prepared.append({"base64Data": base64_data, "mimeType": mime_type})
            continue

        if not file_path:
            continue

        resolved_path = await materialize_backend_upload(file_path)
        if not resolved_path:
            continue
        prepared.append(
            {
                "filePath": resolved_path,
                "base64Data": await encode_file_to_base64(resolved_path),
                "mimeType": mime_type,
            }
        )
    return prepared


def resolve_backend_upload_path(raw_path: str) -> str | None:
    normalized = (raw_path or "").strip()
    if not normalized:
        return None
    resolved = resolve_local_backend_upload_path(normalized)
    if resolved:
        return resolved

    normalized_slash = normalized.replace("\\", "/").lstrip("./")
    if normalized_slash.startswith("api/assessments/questions/images/"):
        return resolve_local_backend_upload_path(
            f"uploads/question-images/{normalized_slash.rsplit('/', 1)[-1]}"
        )
    return None
