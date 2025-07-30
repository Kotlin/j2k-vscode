from __future__ import annotations

import os
import json
import re
from typing import Any, Dict, Iterable, List, Optional
from types import SimpleNamespace as _NS
import requests

__all__ = ["Anthropic"]

# ------------------------------ Utilities ------------------------------

def _strip_reasoning(text: str) -> str:
    """Remove chain-of-thought or hidden-reasoning blocks often emitted by R1-style models."""
    cleaned = text or ""
    # XML-like tags
    for tag in ("think", "thinking", "reasoning", "reflection", "analysis"):
        cleaned = re.sub(fr"(?is)<{tag}>\\s*.*?\\s*</{tag}>\\s*", "", cleaned)
    # Code-fence variants (```thinking ... ```)
    cleaned = re.sub(r"(?is)```(?:think|thinking|reasoning|analysis)\\b.*?```", "", cleaned)
    return cleaned.strip()

def _block_to_text(block: Any) -> str:
    # Accept Anthropic content blocks; ignore unknown fields like "prefill": true
    if isinstance(block, dict):
        if block.get("type") == "text" and "text" in block:
            return str(block["text"])
        # fallbacks
        return str(block.get("text") or block.get("content") or "")
    return str(block)

def _to_text(content: Any) -> str:
    """Anthropic content blocks or plain strings -> text string."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: List[str] = []
        for c in content:
            parts.append(_block_to_text(c))
        return "".join(parts)
    if isinstance(content, dict):
        return str(content.get("text") or content.get("content") or "")
    return str(content)

def _coerce_messages(messages: Iterable[Dict[str, Any]]) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    for m in messages or []:
        role = m.get("role", "user")
        out.append({"role": role, "content": _to_text(m.get("content", ""))})
    return out

# ------------------------- Response shape helpers ----------------------

class _Block:
    def __init__(self, text: str):
        self.text = text

class _MessageResponse:
    """Mimic the bits of Anthropic's response the notebooks use.

    - Has .content[0].text
    - Also supports response[0].text for a couple of cells that index directly
    """
    def __init__(self, text: str):
        self.content: List[_Block] = [_Block(text)]

    def __getitem__(self, idx: int) -> _Block:
        return self.content[idx]

    def __iter__(self):
        return iter(self.content)

# ------------------------------ Client ---------------------------------

class _Messages:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def create(
        self,
        model: str,
        messages: Iterable[Dict[str, Any]],
        system: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop_sequences: Optional[List[str]] = None,
        stream: bool = False,
        # New: assistant prefill helpers
        assistant_prefill: Optional[str] = None,
        prefill: Optional[str] = None,
        **kwargs: Any,
    ) -> _MessageResponse:
        """Map Anthropics-style call to Ollama's /api/chat.

        Prefill semantics:
          - If `assistant_prefill` or `prefill` is provided, append a final assistant
            message with that text (unless one already exists).
          - If the final message already has role=\"assistant\", it is passed through
            verbatim so the model continues from it (Claude-style prefill).
          - Content blocks like {\"type\": \"text\", \"text\": \"..\", \"prefill\": true}
            are normalized to plain strings.
        """

        # Build messages and normalize content
        coerced = _coerce_messages(messages)

        # If user passed prefill via kwargs (alias) or param, append it unless already present.
        prefill_text = prefill if prefill is not None else assistant_prefill
        if prefill_text:
            if not (coerced and coerced[-1].get("role") == "assistant"):
                coerced.append({"role": "assistant", "content": str(prefill_text)})

        # Inject system
        ollama_messages = []
        if system:
            ollama_messages.append({"role": "system", "content": str(system)})
        ollama_messages.extend(coerced)

        options: Dict[str, Any] = {}
        if temperature is not None:
            options["temperature"] = float(temperature)
        if max_tokens is not None:
            # Ollama uses num_predict for max output tokens
            options["num_predict"] = int(max_tokens)
        if stop_sequences:
            options["stop"] = list(stop_sequences)

        payload = {
            "model": model,
            "messages": ollama_messages,
            "stream": bool(stream),
            # Keep both forms — some templates honor one or the other
            **({"system": str(system)} if system else {}),
            **({"options": options} if options else {}),
        }

        url = f"{self.base_url}/api/chat"
        resp = requests.post(url, json=payload, timeout=600)
        resp.raise_for_status()

        if not stream:
            data = resp.json()
            text = data.get("message", {}).get("content", "") or ""
            return _MessageResponse(_strip_reasoning(text))

        # Streaming fallback: join all \"message\" chunks
        full_text_parts: List[str] = []
        for line in resp.iter_lines(decode_unicode=True):
            if not line:
                continue
            try:
                j = json.loads(line)
            except Exception:
                continue
            msg = j.get("message", {})
            if isinstance(msg, dict) and "content" in msg:
                full_text_parts.append(str(msg["content"]))
        return _MessageResponse(_strip_reasoning("".join(full_text_parts)))

class Anthropic:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        # Default to common Ollama envs, then localhost.
        base = (
            base_url
            or os.getenv("ANTHROPIC_BASE_URL")
            or os.getenv("OLLAMA_API_BASE")
            or os.getenv("OLLAMA_HOST")
            or "http://localhost:11434"
        )
        self.api_key = api_key  # not used by Ollama
        self.messages = _Messages(base)