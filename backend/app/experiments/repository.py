import json
import logging
import threading
from pathlib import Path
from typing import Dict, List, Optional

from app.config import settings
from app.experiments.schemas import ExperimentDetail, ExperimentSummary, JobStatus

logger = logging.getLogger("hybrid-quantum-medical-ai")


class ExperimentRepository:
    """Thread-safe file-backed repository for experiment storage and isolation."""

    def __init__(self, storage_dir: Optional[Path] = None):
        # NOTE (Vercel): The local filesystem is ephemeral on Vercel serverless deployments.
        # Experiments written here will NOT survive function restarts. Use an external DB for persistence.
        self.storage_dir = storage_dir or settings.EXPERIMENTS_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._cache: Dict[str, ExperimentDetail] = {}
        self._active_experiment_id: Optional[str] = None
        self._load_existing()

    def _load_existing(self) -> None:
        with self._lock:
            for filepath in self.storage_dir.glob("*.json"):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        exp = ExperimentDetail(**data)
                        self._cache[exp.experiment_id] = exp
                        if self._active_experiment_id is None:
                            self._active_experiment_id = exp.experiment_id
                except Exception as e:
                    logger.warning(f"Failed to load experiment from {filepath.name}: {e}")

    def save(self, experiment: ExperimentDetail) -> ExperimentDetail:
        with self._lock:
            self._cache[experiment.experiment_id] = experiment
            filepath = self.storage_dir / f"{experiment.experiment_id}.json"
            try:
                # Dump Pydantic model to json dict
                data = experiment.model_dump(mode="json")
                with open(filepath, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
            except Exception as e:
                logger.error(f"Failed to save experiment {experiment.experiment_id} to disk: {e}")
            return experiment

    def get(self, experiment_id: str) -> Optional[ExperimentDetail]:
        with self._lock:
            if experiment_id in self._cache:
                return self._cache[experiment_id]
            filepath = self.storage_dir / f"{experiment_id}.json"
            if filepath.exists():
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        exp = ExperimentDetail(**data)
                        self._cache[exp.experiment_id] = exp
                        return exp
                except Exception as e:
                    logger.error(f"Failed to read experiment {experiment_id}: {e}")
            return None

    def list_all(self) -> List[ExperimentSummary]:
        with self._lock:
            summaries: List[ExperimentSummary] = []
            for exp in sorted(self._cache.values(), key=lambda x: x.created_at_utc, reverse=True):
                best_model = None
                best_auc = None
                verdict = None
                if exp.benchmark_summary:
                    best_model = exp.benchmark_summary.best_auc_model
                    if best_model and best_model in exp.benchmark_summary.results:
                        res = exp.benchmark_summary.results[best_model]
                        best_auc = res.mean_metrics.roc_auc if res.mean_metrics else res.metrics.roc_auc
                if exp.evidence:
                    verdict = exp.evidence.verdict

                n_qubits = 6
                if exp.quantum_config:
                    n_qubits = exp.quantum_config.n_qubits

                summaries.append(
                    ExperimentSummary(
                        experiment_id=exp.experiment_id,
                        experiment_name=exp.experiment_name,
                        created_at_utc=exp.created_at_utc,
                        dataset_name=exp.dataset_name,
                        dataset_rows=exp.dataset_rows,
                        feature_count=exp.dataset_columns,
                        n_qubits=n_qubits,
                        status=exp.status,
                        progress_percent=exp.progress_percent,
                        current_stage=exp.current_stage,
                        best_model_name=best_model,
                        best_auc=best_auc,
                        verdict=verdict,
                    )
                )
            return summaries

    def delete(self, experiment_id: str) -> bool:
        with self._lock:
            if experiment_id in self._cache:
                del self._cache[experiment_id]
            filepath = self.storage_dir / f"{experiment_id}.json"
            if filepath.exists():
                try:
                    filepath.unlink()
                    if self._active_experiment_id == experiment_id:
                        self._active_experiment_id = next(iter(self._cache.keys()), None)
                    return True
                except Exception as e:
                    logger.error(f"Failed to delete experiment file {filepath}: {e}")
            return False

    def get_active_id(self) -> Optional[str]:
        with self._lock:
            return self._active_experiment_id

    def set_active_id(self, experiment_id: str) -> None:
        with self._lock:
            self._active_experiment_id = experiment_id


experiment_repo = ExperimentRepository()
