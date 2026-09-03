import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import HTTPException, Request, status

class SimpleRateLimiter:
    """In-memory sliding window rate limiter per client IP / endpoint key."""

    def __init__(self):
        # Key: (ip, endpoint_tag) -> List of timestamps
        self.requests: Dict[Tuple[str, str], List[float]] = defaultdict(list)

    def check_rate_limit(self, request: Request, endpoint_tag: str, max_requests: int, window_seconds: int = 60) -> None:
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = (client_ip, endpoint_tag)
        now = time.time()
        
        # Remove timestamps outside window
        self.requests[key] = [ts for ts in self.requests[key] if now - ts < window_seconds]
        
        if len(self.requests[key]) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {endpoint_tag}. Maximum {max_requests} requests per {window_seconds}s.",
            )
        
        self.requests[key].append(now)

rate_limiter = SimpleRateLimiter()
