import logging
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException, status

from app.experiments.schemas import JobStatus
from app.schemas import StepStatus, TrainingStatusResponse

logger = logging.getLogger("hybrid-quantum-medical-ai")


class JobManager:
    """Manages active training execution jobs, stages, and duplicate run protection."""

    def __init__(self):
        self._lock = threading.RLock()
        self._active_jobs: Dict[str, str] = {}  # experiment_id -> job_id
        self._job_stages: Dict[str, Dict] = {}

    def start_job(self, experiment_id: str, job_id: str) -> None:
        with self._lock:
            if experiment_id in self._active_jobs:
                active_job_id = self._active_jobs[experiment_id]
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A training job ({active_job_id}) is already active for experiment '{experiment_id}'. Concurrent runs are prohibited.",
                )
            
            self._active_jobs[experiment_id] = job_id
            now_iso = datetime.now(timezone.utc).isoformat()
            self._job_stages[experiment_id] = {
                "job_id": job_id,
                "status": JobStatus.QUEUED,
                "current_stage": "Job Queued",
                "progress": 5,
                "start_time": now_iso,
                "end_time": None,
                "error_message": None,
                "steps": [
                    StepStatus(name="Dataset Preprocessing", status="pending"),
                    StepStatus(name="Classical Models Training", status="pending"),
                    StepStatus(name="Quantum VQC Optimization", status="pending"),
                    StepStatus(name="Evaluation & Explainability", status="pending"),
                ]
            }

    def update_stage(
        self,
        experiment_id: str,
        job_status: JobStatus,
        stage_name: str,
        progress: int,
        step_updates: Optional[Dict[str, str]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        with self._lock:
            if experiment_id in self._job_stages:
                job_info = self._job_stages[experiment_id]
                job_info["status"] = job_status
                job_info["current_stage"] = stage_name
                job_info["progress"] = progress
                if error_message:
                    job_info["error_message"] = error_message
                
                if step_updates:
                    for s in job_info["steps"]:
                        if s.name in step_updates:
                            s.status = step_updates[s.name]
                            if step_updates[s.name] == "completed":
                                s.progress = 100
                            elif step_updates[s.name] == "running":
                                s.progress = 50

    def complete_job(self, experiment_id: str, success: bool = True, error_message: Optional[str] = None) -> None:
        with self._lock:
            if experiment_id in self._job_stages:
                job_info = self._job_stages[experiment_id]
                job_info["end_time"] = datetime.now(timezone.utc).isoformat()
                if success:
                    job_info["status"] = JobStatus.COMPLETED
                    job_info["current_stage"] = "Completed"
                    job_info["progress"] = 100
                    for s in job_info["steps"]:
                        s.status = "completed"
                        s.progress = 100
                else:
                    job_info["status"] = JobStatus.FAILED
                    job_info["current_stage"] = "Failed"
                    job_info["error_message"] = error_message
                
            if experiment_id in self._active_jobs:
                del self._active_jobs[experiment_id]

    def is_running(self, experiment_id: str) -> bool:
        with self._lock:
            return experiment_id in self._active_jobs

    def get_status(self, experiment_id: str) -> TrainingStatusResponse:
        with self._lock:
            if experiment_id in self._job_stages:
                info = self._job_stages[experiment_id]
                is_active = info["status"] not in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]
                return TrainingStatusResponse(
                    is_training=is_active,
                    current_step=info["current_stage"],
                    overall_progress=info["progress"],
                    steps=info["steps"],
                    error_message=info.get("error_message"),
                )
            
            return TrainingStatusResponse(
                is_training=False,
                current_step="Idle",
                overall_progress=0,
                steps=[
                    StepStatus(name="Dataset Preprocessing", status="pending"),
                    StepStatus(name="Classical Models Training", status="pending"),
                    StepStatus(name="Quantum VQC Optimization", status="pending"),
                    StepStatus(name="Evaluation & Explainability", status="pending"),
                ],
                error_message=None,
            )


job_manager = JobManager()
