from typing import Any
import httpx
from app.core.config import config

class OllamaClient:
    """
    Lightweight Ollama client wrapper.
    Expects Ollama's /api/generate endpoint. Returns best-effort text.
    """

    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or config.OLLAMA_BASE_URL).rstrip("/") + "/api/generate"

    async def generate(self, model: str, prompt: str, timeout: int | float = None) -> str:
        timeout = timeout or config.AI_REQUEST_TIMEOUT_SECONDS
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            # ✅ FIX: Set temperature to 0 for deterministic (consistent) output
            "options": {
                "temperature": 0.0,
                "seed": 42  # Optional: Fixed seed helps even more
            }
        }
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(self.base_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            # Common Ollama shapes: {"response":"..."} or {"results":[{"content":"..."}]}
            if isinstance(data, dict):
                if "response" in data and isinstance(data["response"], str):
                    return data["response"]
                if "results" in data and isinstance(data["results"], list) and len(data["results"]) > 0:
                    first = data["results"][0]
                    if isinstance(first, dict) and "content" in first:
                        return first["content"]
            return resp.text

# singleton
ollama_client = OllamaClient()
