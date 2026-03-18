from __future__ import annotations

import base64
import os
from typing import Any

from .config import settings


def encode_file_to_base64(file_path: str) -> str:
    with open(file_path, "rb") as file_obj:
        return base64.b64encode(file_obj.read()).decode("utf-8")


def normalize_attachment_images(
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

        abs_path = os.path.abspath(file_path)
        if not os.path.exists(abs_path):
            continue
        prepared.append(
            {
                "filePath": abs_path,
                "base64Data": encode_file_to_base64(abs_path),
                "mimeType": mime_type,
            }
        )
    return prepared


def resolve_backend_upload_path(raw_path: str) -> str | None:
    normalized = (raw_path or "").strip()
    if not normalized:
        return None

    upload_root = os.path.abspath(settings.upload_dir)
    backend_root = os.path.dirname(upload_root)
    normalized_slash = normalized.replace("\\", "/").lstrip("./")

    candidates = [
        os.path.abspath(normalized),
        os.path.join(backend_root, normalized_slash),
        os.path.join(upload_root, normalized_slash.removeprefix("uploads/")),
    ]

    if normalized_slash.startswith("api/assessments/questions/images/"):
        candidates.append(
            os.path.join(
                upload_root,
                "question-images",
                os.path.basename(normalized_slash),
            )
        )

    for candidate in candidates:
        abs_candidate = os.path.abspath(candidate)
        if os.path.exists(abs_candidate):
            return abs_candidate
    return None
