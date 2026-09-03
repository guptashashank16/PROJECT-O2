import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("hybrid-quantum-medical-ai")

class AuditLogger:
    """Lightweight operational audit logger (no patient data or credentials recorded)."""

    def __init__(self, log_path: Optional[Path] = None):
        if log_path is None:
            from app.config import settings
            log_path = settings.ARTIFACTS_DIR / "audit_log.json"
        self.log_path = log_path
        self._entries: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if self.log_path.exists():
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    self._entries = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load audit_log.json: {e}")

    def log(
        self,
        user: str,
        role: str,
        action: str,
        status: str,
        details: Optional[str] = None,
        ip: str = "127.0.0.1",
    ) -> None:
        entry = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "user": user,
            "role": role,
            "action": action,
            "status": status,
            "details": details or "",
            "ip": ip,
        }
        self._entries.append(entry)
        logger.info(f"AUDIT | {user} ({role}) | {action} | {status}")
        self._save()

    def _save(self) -> None:
        try:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            # Keep max 500 entries
            recent = self._entries[-500:]
            with open(self.log_path, "w", encoding="utf-8") as f:
                json.dump(recent, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save audit log: {e}")

    def get_entries(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._entries[-limit:]

audit_logger = AuditLogger()
