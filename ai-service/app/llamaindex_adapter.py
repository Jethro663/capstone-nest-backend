from __future__ import annotations

from typing import Any

try:
    from llama_index.core.schema import TextNode
except Exception:  # pragma: no cover - optional dependency at runtime
    TextNode = None  # type: ignore[assignment]


def llamaindex_available() -> bool:
    return TextNode is not None


def build_text_node(
    *,
    text: str,
    node_id: str,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    payload = {
        "nodeId": node_id,
        "text": text,
        "metadata": metadata,
        "framework": "llamaindex" if llamaindex_available() else "fallback",
    }
    if TextNode is None:
        return payload

    node = TextNode(text=text, id_=node_id, metadata=metadata)
    payload["llamaIndexNode"] = {
        "nodeId": node.node_id,
        "metadataKeys": sorted(node.metadata.keys()),
    }
    return payload
