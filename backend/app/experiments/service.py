import hashlib
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
import pandas as pd

from app.config import settings
from app.data.profiler import DatasetProfiler
from app.data.sample_loader import load_sample_dataset
from app.experiments.repository import experiment_repo
from app.experiments.resource_profiler import compute_resource_profile
from app.experiments.schemas import (
    ExperimentComparisonItem,
    ExperimentComparisonResponse,
    ExperimentCreateRequest,
    ExperimentDetail,
    ExperimentSummary,
    JobStatus,
)
from app.schemas import (
    ClassicalModelConfig,
    DatasetConfigRequest,
    PreprocessingRequest,
    QuantumModelConfig,
)

logger = logging.getLogger("hybrid-quantum-medical-ai")


class ExperimentService:
    """Core domain service managing the lifecycle, isolation, and comparison of research experiments."""

    def __init__(self):
        self.repo = experiment_repo
        self._ensure_initial_experiment()

    def _compute_fingerprint(self, df: pd.DataFrame) -> str:
        """Generate a stable SHA-256 fingerprint from dataset contents."""
        head_bytes = df.head(50).to_csv(index=False).encode("utf-8")
        return hashlib.sha256(head_bytes).hexdigest()[:16]

    def _ensure_initial_experiment(self) -> None:
        """Seed a default active experiment if none exists."""
        if not self.repo.list_all():
            try:
                df, meta = load_sample_dataset("breast_cancer_wisconsin")
                self.create_experiment(
                    ExperimentCreateRequest(
                        experiment_name="Wisconsin Breast Cancer Initial Benchmark",
                        dataset_name="breast_cancer_wisconsin",
                        description="Initial baseline demonstration benchmark for SIH26139",
                    ),
                    df=df,
                )
            except Exception as e:
                logger.warning(f"Could not auto-create initial experiment: {e}")

    def create_experiment(
        self,
        req: ExperimentCreateRequest,
        df: Optional[pd.DataFrame] = None,
        user_id: str = "researcher",
    ) -> ExperimentDetail:
        now_str = datetime.now(timezone.utc).isoformat()
        exp_id = f"exp-{uuid.uuid4().hex[:8]}"

        dataset_name = req.dataset_name or "breast_cancer_wisconsin"
        if df is None:
            df, _ = load_sample_dataset(dataset_name)

        fingerprint = self._compute_fingerprint(df)
        profiler = DatasetProfiler(df, dataset_name=dataset_name)
        profile = profiler.profile()

        target_col = req.dataset_config.target_column if req.dataset_config else (profile.suggested_target or "diagnosis")
        pos_class = req.dataset_config.positive_class if req.dataset_config else (profile.suggested_positive_class or "M")

        dataset_cfg = req.dataset_config or DatasetConfigRequest(
            target_column=target_col,
            positive_class=pos_class,
            identifier_columns=profile.suggested_identifiers,
            excluded_features=[],
            problem_type="binary_classification",
        )

        quantum_cfg = req.quantum_config or QuantumModelConfig(
            n_qubits=settings.DEFAULT_QUANTUM_QUBITS,
            feature_map="ZZFeatureMap",
            ansatz="RealAmplitudes",
            ansatz_layers=settings.DEFAULT_VQC_LAYERS,
            optimizer="COBYLA",
            max_iterations=settings.DEFAULT_VQC_MAX_ITER,
            fast_demo_mode=settings.FAST_DEMO_MODE,
        )

        classical_cfg = req.classical_config or ClassicalModelConfig(
            logistic_regression=True,
            random_forest=True,
            svm=True,
        )

        prep_cfg = req.preprocessing_config or PreprocessingRequest(
            test_split_ratio=0.2,
            n_quantum_features=quantum_cfg.n_qubits,
            scaler_type="standard",
        )

        exp_name = req.experiment_name or f"Experiment ({dataset_name}) - {quantum_cfg.n_qubits}Q {quantum_cfg.ansatz}"

        experiment = ExperimentDetail(
            experiment_id=exp_id,
            experiment_name=exp_name,
            created_at_utc=now_str,
            updated_at_utc=now_str,
            user_id=user_id,
            description=req.description or "",
            dataset_name=dataset_name,
            dataset_fingerprint=fingerprint,
            dataset_rows=len(df),
            dataset_columns=len(df.columns),
            target_column=target_col,
            positive_class=pos_class,
            dataset_config=dataset_cfg,
            preprocessing_config=prep_cfg,
            quantum_config=quantum_cfg,
            classical_config=classical_cfg,
            status=JobStatus.CREATED,
            progress_percent=0,
            current_stage="Configured",
        )

        self.repo.save(experiment)
        self.repo.set_active_id(exp_id)
        return experiment

    def get_experiment(self, experiment_id: str) -> Optional[ExperimentDetail]:
        return self.repo.get(experiment_id)

    def get_active_experiment(self) -> Optional[ExperimentDetail]:
        active_id = self.repo.get_active_id()
        if active_id:
            return self.repo.get(active_id)
        summaries = self.repo.list_all()
        if summaries:
            return self.repo.get(summaries[0].experiment_id)
        return None

    def list_experiments(self) -> List[ExperimentSummary]:
        return self.repo.list_all()

    def delete_experiment(self, experiment_id: str) -> bool:
        return self.repo.delete(experiment_id)

    def compare_experiments(self, experiment_ids: List[str]) -> ExperimentComparisonResponse:
        """Synthesize neutral empirical parameter & metric differences across multiple experiments."""
        now_str = datetime.now(timezone.utc).isoformat()
        items: List[ExperimentComparisonItem] = []

        def _get_metric_val(obj, key: str, default=None):
            if obj is None:
                return default
            if isinstance(obj, dict):
                return obj.get(key, default)
            return getattr(obj, key, default)

        for exp_id in experiment_ids:
            exp = self.repo.get(exp_id)
            if not exp:
                continue

            q_cfg = exp.quantum_config or QuantumModelConfig(
                n_qubits=6,
                feature_map="ZZFeatureMap",
                ansatz="RealAmplitudes",
                ansatz_layers=2,
                optimizer="COBYLA",
                max_iterations=25,
                fast_demo_mode=True,
            )

            vqc_auc_mean = None
            vqc_auc_std = None
            vqc_sens = None
            vqc_spec = None
            vqc_f1 = None
            vqc_brier = None
            vqc_runtime = None
            vqc_params = None

            best_class_model = None
            best_class_auc = None
            best_class_f1 = None
            noisy_retention = None
            verdict = None

            if exp.benchmark_summary and getattr(exp.benchmark_summary, "results", None):
                results = exp.benchmark_summary.results
                if isinstance(results, dict) and "vqc" in results:
                    vqc_res = results["vqc"]
                    metrics = vqc_res.mean_metrics or vqc_res.metrics
                    vqc_auc_mean = _get_metric_val(metrics, "roc_auc")
                    if vqc_res.std_metrics:
                        vqc_auc_std = _get_metric_val(vqc_res.std_metrics, "roc_auc")
                    vqc_sens = _get_metric_val(metrics, "sensitivity")
                    vqc_spec = _get_metric_val(metrics, "specificity")
                    vqc_f1 = _get_metric_val(metrics, "f1_score")
                    vqc_brier = _get_metric_val(metrics, "brier_score")
                    vqc_runtime = _get_metric_val(metrics, "training_time_seconds")

                # Parameter count
                n_q = getattr(q_cfg, "n_qubits", 6)
                a_layers = getattr(q_cfg, "ansatz_layers", 2)
                ansatz_type = getattr(q_cfg, "ansatz", "RealAmplitudes")
                vqc_params = n_q * (a_layers + 1)
                if ansatz_type == "EfficientSU2":
                    vqc_params *= 2

                # Best classical
                if isinstance(results, dict):
                    classical_models = [r for r in results.values() if getattr(r, "model_type", "") == "classical"]
                    if classical_models:
                        best_c = max(
                            classical_models,
                            key=lambda x: _get_metric_val(x.mean_metrics or x.metrics, "roc_auc", 0.0),
                        )
                        c_metrics = best_c.mean_metrics or best_c.metrics
                        best_class_model = getattr(best_c, "model_name", getattr(best_c, "model_id", "Classical Baseline"))
                        best_class_auc = _get_metric_val(c_metrics, "roc_auc")
                        best_class_f1 = _get_metric_val(c_metrics, "f1_score")

                # Noisy retention
                if exp.noisy_vqc_result and vqc_auc_mean and vqc_auc_mean > 0:
                    noisy_metrics = exp.noisy_vqc_result.mean_metrics or exp.noisy_vqc_result.metrics
                    noisy_auc = _get_metric_val(noisy_metrics, "roc_auc", 0.0)
                    noisy_retention = round((noisy_auc / vqc_auc_mean) * 100, 1)

            if exp.evidence:
                verdict = _get_metric_val(exp.evidence, "verdict", "INSUFFICIENT_EVIDENCE")

            items.append(
                ExperimentComparisonItem(
                    experiment_id=exp.experiment_id,
                    experiment_name=exp.experiment_name,
                    created_at_utc=exp.created_at_utc,
                    dataset_name=exp.dataset_name,
                    n_qubits=getattr(q_cfg, "n_qubits", 6),
                    ansatz=getattr(q_cfg, "ansatz", "RealAmplitudes"),
                    feature_map=getattr(q_cfg, "feature_map", "ZZFeatureMap"),
                    ansatz_layers=getattr(q_cfg, "ansatz_layers", 2),
                    vqc_auc_mean=vqc_auc_mean,
                    vqc_auc_std=vqc_auc_std,
                    vqc_sensitivity=vqc_sens,
                    vqc_specificity=vqc_spec,
                    vqc_f1=vqc_f1,
                    vqc_brier=vqc_brier,
                    vqc_runtime_seconds=vqc_runtime,
                    vqc_parameter_count=vqc_params,
                    best_classical_model=best_class_model,
                    best_classical_auc=best_class_auc,
                    best_classical_f1=best_class_f1,
                    noisy_auc_retention_percent=noisy_retention,
                    verdict=verdict,
                )
            )

        return ExperimentComparisonResponse(
            experiments=items,
            comparison_timestamp_utc=now_str,
        )


experiment_service = ExperimentService()


def get_experiment_service() -> ExperimentService:
    """Compatibility accessor for routers that expect a module-level service factory."""
    return experiment_service
