from __future__ import annotations

import json
import logging
import os
import threading
import time
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class GeminiKeyPool:
    """Manages multiple Gemini API keys with thread-safe failover, cooldowns, and instant rotation."""

    def __init__(self, cooldown_seconds: float = 60.0):
        self._lock = threading.Lock()
        self._cooldown_seconds = cooldown_seconds
        self._cooldowns: dict[str, float] = {}  # key -> timestamp when cooldown ends
        self._rotation_count: int = 0
        self._current_index: int = 0

    def get_configured_keys(self) -> list[str]:
        """Discovers all configured Gemini keys from environment variables.
        
        Supports:
        - GEMINI_API_KEYS="key1,key2,key3,key4,key5"
        - GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4, GEMINI_API_KEY_5
        - GEMINI_API_KEY (backward compatible single key)
        """
        keys: list[str] = []

        def _add_key(raw_val: str | None) -> None:
            if not raw_val:
                return
            cleaned = raw_val.strip()
            if cleaned and cleaned not in keys and not cleaned.startswith("replace-with"):
                keys.append(cleaned)

        # 1. Comma / semicolon / newline separated list in GEMINI_API_KEYS
        multi_keys = os.getenv("GEMINI_API_KEYS", "")
        if multi_keys:
            for piece in multi_keys.replace(";", ",").replace("\n", ",").split(","):
                _add_key(piece)

        # 2. Numbered keys GEMINI_API_KEY_1 through GEMINI_API_KEY_20
        for i in range(1, 21):
            _add_key(os.getenv(f"GEMINI_API_KEY_{i}"))

        # 3. Default single GEMINI_API_KEY
        _add_key(os.getenv("GEMINI_API_KEY"))

        return keys

    @staticmethod
    def mask_key(key: str) -> str:
        """Safely mask key for logs."""
        if not key:
            return "(empty)"
        if len(key) <= 10:
            return "***"
        return f"{key[:6]}...{key[-4:]}"

    def get_ordered_candidates(self) -> list[tuple[int, str]]:
        """Returns ordered list of (1-based index, key) candidates, prioritizing non-cooldown keys."""
        with self._lock:
            all_keys = self.get_configured_keys()
            if not all_keys:
                return []

            now = time.time()
            # Clean expired cooldowns
            self._cooldowns = {k: exp for k, exp in self._cooldowns.items() if exp > now}

            ready: list[tuple[int, str]] = []
            cooling: list[tuple[int, str, float]] = []

            for idx, key in enumerate(all_keys):
                if key in self._cooldowns:
                    cooling.append((idx + 1, key, self._cooldowns[key]))
                else:
                    ready.append((idx + 1, key))

            # Sort cooling keys by earliest expiration
            cooling.sort(key=lambda x: x[2])
            cooling_tuples = [(item[0], item[1]) for item in cooling]

            # Shift ready candidates so active cursor goes first
            if ready and self._current_index < len(ready):
                ready = ready[self._current_index:] + ready[:self._current_index]

            return ready + cooling_tuples

    def mark_exhausted(self, key: str, reason: str = "rate_limit") -> None:
        """Mark a key as temporarily exhausted and advance cursor."""
        with self._lock:
            self._cooldowns[key] = time.time() + self._cooldown_seconds
            self._rotation_count += 1
            all_keys = self.get_configured_keys()
            if all_keys:
                self._current_index = (self._current_index + 1) % len(all_keys)
            logger.warning(
                "Gemini key (%s) marked exhausted [%s]. Cooldown active for %.0fs. Total rotations: %d",
                self.mask_key(key),
                reason,
                self._cooldown_seconds,
                self._rotation_count,
            )

    def mark_success(self, key: str) -> None:
        """Clear cooldown on successful request."""
        with self._lock:
            if key in self._cooldowns:
                del self._cooldowns[key]

    def get_status(self) -> dict[str, Any]:
        """Observability status of the key pool."""
        with self._lock:
            all_keys = self.get_configured_keys()
            now = time.time()
            return {
                "total_keys": len(all_keys),
                "keys": [
                    {
                        "index": i + 1,
                        "masked": self.mask_key(k),
                        "cooling_down": k in self._cooldowns and self._cooldowns[k] > now,
                        "cooldown_remaining_seconds": max(0.0, round(self._cooldowns[k] - now, 1)) if k in self._cooldowns else 0.0,
                    }
                    for i, k in enumerate(all_keys)
                ],
                "active_cursor": self._current_index + 1 if all_keys else 0,
                "total_rotations": self._rotation_count,
            }


# Singleton key pool instance
key_pool = GeminiKeyPool(cooldown_seconds=60.0)


def is_rate_limit_or_quota_error(ex: Exception) -> bool:
    """Detects HTTP 429, RESOURCE_EXHAUSTED, quota limits, or token rate limits from Gemini."""
    code = getattr(ex, "code", None)
    if code in (429, 503):
        return True

    status = str(getattr(ex, "status", "") or "").upper()
    if any(s in status for s in ("RESOURCE_EXHAUSTED", "UNAVAILABLE", "DEADLINE_EXCEEDED")):
        return True

    msg = str(ex).lower()
    keywords = [
        "429",
        "resource_exhausted",
        "resourceexhausted",
        "resource has been exhausted",
        "quota",
        "rate limit",
        "ratelimit",
        "limit exceeded",
        "exhausted",
        "too many requests",
        "token limit",
        "tokens per minute",
        "requests per minute",
        "tpm",
        "rpm",
        "quota exceeded",
    ]
    return any(k in msg for k in keywords)


def generate_plan(
    objective: str,
    agent_names: list[str],
    destination: str = "",
    catalog_items: list[dict[str, Any]] | None = None
) -> dict[str, Any] | None:
    """Generate a structured plan using Gemini with instant multi-key failover and safe deterministic fallback."""
    candidates = key_pool.get_ordered_candidates()
    if not candidates:
        if os.getenv("AI_REQUIRE_GEMINI", "false").lower() == "true":
            raise RuntimeError("GEMINI_API_KEY or GEMINI_API_KEYS is required but was not configured.")
        return None

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    prompt = (
        "You are the TravelWise planning coordinator. "
        "Create a safe, concise plan for this travel objective. "
        "Do not invent bookings, prices, weather, or personal data. "
        "Return JSON only with keys: summary (string), steps (array of strings), "
        "approval_reason (string). Objective: "
        f"{objective}. Destination: {destination}. "
        f"Approved provider catalog (use item IDs when recommending): {json.dumps(catalog_items or [])}. "
        f"Available specialist agents: {', '.join(agent_names)}."
    )

    last_error: Exception | None = None

    for key_num, key in candidates:
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
            )
            if response.text:
                result = json.loads(response.text)
                if isinstance(result, dict) and isinstance(result.get("steps"), list):
                    key_pool.mark_success(key)
                    logger.info("Successfully generated Gemini plan using Key #%d (%s) with model %s", key_num, key_pool.mask_key(key), model_name)
                    return result
        except Exception as ex:
            last_error = ex
            is_quota = is_rate_limit_or_quota_error(ex)
            key_pool.mark_exhausted(key, reason="quota_exceeded" if is_quota else "error")
            masked = key_pool.mask_key(key)
            if is_quota:
                logger.warning(
                    "Gemini Key #%d (%s) hit quota/rate limit: %s. Instantly failing over to next available key in pool...",
                    key_num,
                    masked,
                    ex,
                )
            else:
                logger.warning(
                    "Gemini Key #%d (%s) failed (%s). Attempting next available key in pool...",
                    key_num,
                    masked,
                    ex,
                )
            continue

    if os.getenv("AI_REQUIRE_GEMINI", "false").lower() == "true":
        raise last_error or RuntimeError("All Gemini API keys failed.")

    logger.warning("All Gemini API keys failed or exhausted; degrading gracefully to deterministic plan fallback.")
    return {
        "summary": f"Deterministic coordinated plan for {destination or 'group trip'}.",
        "steps": [
            "Audit overall trip budget and project remaining daily burn rate.",
            "Review destination safety indices and meteorological hazard alerts.",
            "Verify scheduled activity timeline for temporal or location conflicts.",
            "Compute multi-party balance settlement and route for human approval."
        ],
        "approval_reason": "Human approval required prior to executing financial settlements."
    }


def call_gemini_with_rotation(
    prompt: str,
    response_mime_type: str = "application/json",
    temperature: float = 0.2,
    model: str | None = None,
) -> str | None:
    """General purpose text or JSON generation with instant multi-key failover."""
    candidates = key_pool.get_ordered_candidates()
    if not candidates:
        return None

    model_name = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    for key_num, key in candidates:
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    response_mime_type=response_mime_type,
                ),
            )
            if response.text:
                key_pool.mark_success(key)
                return response.text
        except Exception as ex:
            is_quota = is_rate_limit_or_quota_error(ex)
            key_pool.mark_exhausted(key, reason="quota_exceeded" if is_quota else "error")
            logger.warning(
                "Gemini Key #%d (%s) failed (%s). Rotating to next key in pool...",
                key_num,
                key_pool.mask_key(key),
                ex,
            )
            continue

    return None
