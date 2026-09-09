import hashlib
import math
import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import Request


class InMemoryRateLimiter:
    """Simple sliding-window limiter for a single Python service instance."""

    def __init__(
        self,
        limit: int,
        window_seconds: int = 60,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.clock = clock
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> int | None:
        """Record a request; return retry-after seconds when the key is limited."""
        now = self.clock()
        cutoff = now - self.window_seconds

        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= self.limit:
                retry_after = self.window_seconds - (now - events[0])
                return max(1, math.ceil(retry_after))

            events.append(now)
            return None


def build_rate_limit_key(request: Request, authorization: str | None) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        digest = hashlib.sha256(authorization.encode("utf-8")).hexdigest()[:24]
        return f"auth:{digest}"

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",", 1)[0].strip()
    elif request.client:
        client_ip = request.client.host
    else:
        client_ip = "unknown"

    return f"ip:{client_ip}"
