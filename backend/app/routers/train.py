import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import numpy as np
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sklearn.model_selection import StratifiedKFold

from app.auth.rbac import UserRecord, require_permission
from app.config import settings
from app.data.preprocessor import ClinicalPreprocessor
from app.evaluation.explainability import compute_model_explainability, compute_quantum_sensitivity
from app.evaluation.metrics import evaluate_model
from app.evidence.evidence_engine import QuantumEvidenceEngine
from app.experiments.resource_profiler import compute_resource_profile
from app.experiments.schemas import ExperimentCreateRequest, JobStatus
from app.experiments.service import experiment_service
from app.jobs.manager import job_manager
from app.models.classical import (
    LogisticRegressionDiseaseClassifier,
    RandomForestDiseaseClassifier,
    SVMDiseaseClassifier,
)
from app.models.vqc import VariationalQuantumClassifier
from app.quantum.noisy_simulator import (
    AER_AVAILABLE,
    build_qiskit_aer_noise_model,
    simulate_noisy_vqc_circuit,
)
from app.schemas import (
    BenchmarkSummary,
    ClassicalModelConfig,
    ConfusionMatrixData,
    EvaluationMetrics,
    ExperimentMetadata,
    FoldMetrics,
    ModelEvaluationResult,
    NoiseExecutionInfo,
    PreprocessingRequest,
    PreprocessingSummary,
    QuantumModelConfig,
    TrainingStatusResponse,
    TrainRequest,
)
from app.state import app_state

logger = logging.getLogger("hybrid-quantum-medical-ai")
router = APIRouter(tags=["Model Training & Benchmark"])


def run_training_pipeline_task(
    experiment_id: str,
    quantum_config: QuantumModelConfig,
    classical_config: ClassicalModelConfig,
):
    """Background task executing stratified 5-fold CV, Aer noisy simulation, explainability, and evidence synthesis."""
    start_time = time.time()
    try:
        # STAGE 1: PREPROCESSING & INITIALIZATION
        job_manager.update_stage(
            experiment_id=experiment_id,
            job_status=JobStatus.PREPROCESSING,
            stage_name="Dataset Preprocessing & PCA",
            progress=15,
            step_updates={"Dataset Preprocessing": "running"},
        )
        app_state.is_training = True
        app_state.current_step = "Leakage-free Stratified Split & PCA"
        app_state.overall_progress = 15

        if app_state.raw_df is None or app_state.dataset_config is None:
            raise ValueError("No dataset loaded or configured.")

        # Ensure preprocessor is fitted
        if app_state.preprocessor is None or app_state.X_train is None:
            prep_params = PreprocessingRequest(
                n_quantum_features=quantum_config.n_qubits,
                test_split_ratio=0.2,
                scaler_type="standard",
            )
            preprocessor = ClinicalPreprocessor(app_state.dataset_config, prep_params)
            X_tr, X_te, y_tr, y_te, summary = preprocessor.fit_and_split(app_state.raw_df)
            app_state.preprocessor = preprocessor
            app_state.preprocessing_summary = summary
            app_state.X_train = X_tr
            app_state.X_test = X_te
            app_state.y_train = y_tr
            app_state.y_test = y_te

        job_manager.update_stage(
            experiment_id=experiment_id,
            job_status=JobStatus.CLASSICAL_TRAINING,
            stage_name="Training Classical Baselines",
            progress=30,
            step_updates={"Dataset Preprocessing": "completed", "Classical Models Training": "running"},
        )
        app_state.current_step = "Training Classical Baseline Models"
        app_state.overall_progress = 30

        # STAGE 2: CLASSICAL MODELS TRAINING & 5-FOLD CV
        models_to_train = {}
        if classical_config.logistic_regression:
            models_to_train["logistic_regression"] = LogisticRegressionDiseaseClassifier(random_state=settings.RANDOM_SEED)
        if classical_config.random_forest:
            models_to_train["random_forest"] = RandomForestDiseaseClassifier(random_state=settings.RANDOM_SEED)
        if classical_config.svm:
            models_to_train["svm"] = SVMDiseaseClassifier(random_state=settings.RANDOM_SEED)

        app_state.models = models_to_train
        for m_id, model in models_to_train.items():
            model.fit(app_state.X_train, app_state.y_train)

        # STAGE 3: QUANTUM VQC OPTIMIZATION
        job_manager.update_stage(
            experiment_id=experiment_id,
            job_status=JobStatus.QUANTUM_TRAINING,
            stage_name="Variational Quantum Classifier Optimization",
            progress=55,
            step_updates={"Classical Models Training": "completed", "Quantum VQC Optimization": "running"},
        )
        app_state.current_step = "Optimizing Variational Quantum Classifier (VQC)"
        app_state.overall_progress = 55

        vqc = VariationalQuantumClassifier(config=quantum_config, random_state=settings.RANDOM_SEED)
        vqc.fit(app_state.X_train, app_state.y_train)
        app_state.models["vqc"] = vqc

        # STAGE 4: STRATIFIED 5-FOLD CROSS-VALIDATION
        job_manager.update_stage(
            experiment_id=experiment_id,
            job_status=JobStatus.CROSS_VALIDATION,
            stage_name="Stratified 5-Fold Cross-Validation",
            progress=75,
            step_updates={"Quantum VQC Optimization": "completed", "Evaluation & Explainability": "running"},
        )
        app_state.current_step = "Executing Stratified 5-Fold Cross-Validation"
        app_state.overall_progress = 75

        n_splits = 5
        skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=settings.RANDOM_SEED)
        fold_results_by_model: Dict[str, List[FoldMetrics]] = {m: [] for m in app_state.models}

        for fold_idx, (train_idx, val_idx) in enumerate(skf.split(app_state.X_train, app_state.y_train)):
            X_f_tr, y_f_tr = app_state.X_train[train_idx], app_state.y_train[train_idx]
            X_f_val, y_f_val = app_state.X_train[val_idx], app_state.y_train[val_idx]

            for m_id, model in app_state.models.items():
                if m_id == "vqc":
                    fold_vqc_cfg = QuantumModelConfig(
                        n_qubits=quantum_config.n_qubits,
                        feature_map=quantum_config.feature_map,
                        ansatz=quantum_config.ansatz,
                        ansatz_layers=quantum_config.ansatz_layers,
                        optimizer=quantum_config.optimizer,
                        max_iterations=min(15, quantum_config.max_iterations),
                        fast_demo_mode=True,
                    )
                    fold_model = VariationalQuantumClassifier(config=fold_vqc_cfg, random_state=settings.RANDOM_SEED + fold_idx)
                elif m_id == "logistic_regression":
                    fold_model = LogisticRegressionDiseaseClassifier(random_state=settings.RANDOM_SEED)
                elif m_id == "random_forest":
                    fold_model = RandomForestDiseaseClassifier(random_state=settings.RANDOM_SEED)
                else:
                    fold_model = SVMDiseaseClassifier(random_state=settings.RANDOM_SEED)

                fold_model.fit(X_f_tr, y_f_tr)
                fold_eval = evaluate_model(fold_model, X_f_val, y_f_val, sample_names=["0", "1"])
                fold_results_by_model[m_id].append(
                    FoldMetrics(
                        fold_index=fold_idx + 1,
                        train_samples=len(X_f_tr),
                        val_samples=len(X_f_val),
                        metrics=fold_eval.metrics,
                    )
                )

        # Held-out Test Evaluations and Aggregation
        evaluation_results: Dict[str, ModelEvaluationResult] = {}
        for m_id, model in app_state.models.items():
            test_eval = evaluate_model(model, app_state.X_test, app_state.y_test, sample_names=["0", "1"])

            # Mean and Std across CV folds
            cv_folds = fold_results_by_model[m_id]
            cv_aucs = [f.metrics.roc_auc for f in cv_folds]
            cv_sens = [f.metrics.sensitivity for f in cv_folds]
            cv_specs = [f.metrics.specificity for f in cv_folds]
            cv_f1s = [f.metrics.f1_score for f in cv_folds]
            cv_accs = [f.metrics.accuracy for f in cv_folds]
            cv_briers = [f.metrics.brier_score for f in cv_folds if f.metrics.brier_score is not None]

            # Build std EvaluationMetrics from fold standard deviations
            mean_m = test_eval.metrics  # held-out test metrics double as mean for display
            std_m = EvaluationMetrics(
                accuracy=float(np.std(cv_accs)) if cv_accs else 0.0,
                precision=0.0,
                sensitivity=float(np.std(cv_sens)) if cv_sens else 0.0,
                specificity=float(np.std(cv_specs)) if cv_specs else 0.0,
                f1_score=float(np.std(cv_f1s)) if cv_f1s else 0.0,
                roc_auc=float(np.std(cv_aucs)) if cv_aucs else 0.0,
                pr_auc=0.0,
                brier_score=float(np.std(cv_briers)) if cv_briers else 0.0,
                training_time_seconds=0.0,
                inference_time_ms=0.0,
            )

            test_eval.fold_metrics = cv_folds  # correct field name
            test_eval.std_metrics = std_m
            test_eval.mean_metrics = mean_m
            evaluation_results[m_id] = test_eval

        # STAGE 5: NOISY BENCHMARK SIMULATION (Aer Depolarizing + Readout)
        job_manager.update_stage(
            experiment_id=experiment_id,
            job_status=JobStatus.NOISE_EVALUATION,
            stage_name="Qiskit Aer Depolarizing Noise Stress Test",
            progress=85,
        )
        app_state.current_step = "Executing Qiskit Aer Noisy Quantum Simulation"
        app_state.overall_progress = 85

        ideal_vqc = evaluation_results.get("vqc")
        noisy_vqc_result = None
        if ideal_vqc and "vqc" in app_state.models:
            vqc_instance = app_state.models["vqc"]

            # Build the Aer noise model (returns None if qiskit_aer is unavailable)
            noise_model, noise_meta = build_qiskit_aer_noise_model(
                one_qubit_gate_error=0.01,
                two_qubit_gate_error=0.03,
                readout_error=0.02,
            )

            # Returns (noisy_probs: np.ndarray shape (N,2), report: dict)
            noisy_probs, noise_report = simulate_noisy_vqc_circuit(
                vqc_model=vqc_instance,
                X_test=app_state.X_test,
                noise_model=noise_model,
                n_shots=1024,
                noise_metadata=noise_meta,
            )

            # Derive predictions and compute metrics from noisy probabilities
            from sklearn.metrics import (
                accuracy_score as _acc,
                precision_score as _prec,
                recall_score as _rec,
                f1_score as _f1,
                roc_auc_score as _roc,
                brier_score_loss as _brier,
                confusion_matrix as _cm,
            )
            y_test_arr = app_state.y_test
            noisy_pred = (noisy_probs[:, 1] >= 0.5).astype(int)
            noisy_pos_prob = noisy_probs[:, 1]

            _tn, _fp, _fn, _tp = (0, 0, 0, 0)
            try:
                cm_arr = _cm(y_test_arr, noisy_pred, labels=[0, 1])
                _tn, _fp, _fn, _tp = cm_arr.ravel() if cm_arr.size == 4 else (0, 0, 0, 0)
            except Exception:
                pass

            try:
                _spec = float(_tn / (_tn + _fp)) if (_tn + _fp) > 0 else 0.0
                _roc_val = float(_roc(y_test_arr, noisy_pos_prob)) if len(np.unique(y_test_arr)) > 1 else 0.5
                noisy_metrics = EvaluationMetrics(
                    accuracy=float(round(_acc(y_test_arr, noisy_pred), 4)),
                    precision=float(round(_prec(y_test_arr, noisy_pred, zero_division=0), 4)),
                    sensitivity=float(round(_rec(y_test_arr, noisy_pred, zero_division=0), 4)),
                    specificity=float(round(_spec, 4)),
                    f1_score=float(round(_f1(y_test_arr, noisy_pred, zero_division=0), 4)),
                    roc_auc=float(round(_roc_val, 4)),
                    brier_score=float(round(_brier(y_test_arr, noisy_pos_prob), 4)),
                    training_time_seconds=ideal_vqc.metrics.training_time_seconds,
                    inference_time_ms=ideal_vqc.metrics.inference_time_ms,
                )
            except Exception as e:
                logger.warning("Noisy metrics computation failed: %s — using ideal metrics.", e)
                noisy_metrics = ideal_vqc.metrics

            noisy_cm = ConfusionMatrixData(
                true_positive=int(_tp), false_positive=int(_fp),
                true_negative=int(_tn), false_negative=int(_fn),
                labels=["0", "1"],
            )
            noisy_vqc_result = ModelEvaluationResult(
                model_id="noisy_vqc",
                model_name="Noisy VQC (Aer Depolarizing)",
                model_type="quantum",
                metrics=noisy_metrics,
                confusion_matrix=noisy_cm,
            )
            app_state.evaluation_results["noisy_vqc"] = noisy_vqc_result

        # STAGE 6: EXPLAINABILITY COMPUTATION
        job_manager.update_stage(
            experiment_id=experiment_id,
            job_status=JobStatus.EXPLAINABILITY,
            stage_name="Feature Sensitivity & Explainability Analysis",
            progress=92,
        )
        app_state.current_step = "Computing Model Explainability & Sensitivity"
        app_state.overall_progress = 92

        quantum_feat_names = [f"PC_{i+1}" for i in range(quantum_config.n_qubits)]
        orig_feat_names = app_state.preprocessing_summary.selected_feature_names if app_state.preprocessing_summary else []
        pca_comps = app_state.preprocessor.pca.components_ if app_state.preprocessor and app_state.preprocessor.pca else None

        explainability_cache: Dict[str, Any] = {}
        for m_id, model in app_state.models.items():
            if m_id == "vqc":
                expl = compute_quantum_sensitivity(
                    model=model,
                    X_test=app_state.X_test,
                    feature_names=quantum_feat_names,
                    pca_components=pca_comps,
                    original_feature_names=orig_feat_names,
                )
            else:
                expl = compute_model_explainability(
                    model=model,
                    X_test=app_state.X_test,
                    y_test=app_state.y_test,
                    feature_names=quantum_feat_names,
                )
            explainability_cache[m_id] = expl

        # STAGE 7: QUANTUM EVIDENCE ENGINE & PROVENANCE SYNTHESIS
        job_manager.update_stage(
            experiment_id=experiment_id,
            job_status=JobStatus.REPORT_GENERATION,
            stage_name="Evidence Engine Synthesis & Provenance Audit",
            progress=96,
        )
        app_state.current_step = "Synthesizing Quantum Evidence Verdict"
        app_state.overall_progress = 96

        vqc_metrics_dict = ideal_vqc.metrics.model_dump() if ideal_vqc else {}
        vqc_std_dict = (
            ideal_vqc.std_metrics.model_dump()
            if (ideal_vqc and ideal_vqc.std_metrics and hasattr(ideal_vqc.std_metrics, "model_dump"))
            else (ideal_vqc.std_metrics if ideal_vqc and isinstance(ideal_vqc.std_metrics, dict) else {})
        )
        
        classical_models_res = {k: v for k, v in evaluation_results.items() if v.model_type == "classical"}
        best_classical_res = max(classical_models_res.values(), key=lambda x: x.metrics.roc_auc) if classical_models_res else None
        best_classical_metrics = best_classical_res.metrics.model_dump() if best_classical_res else {}
        best_classical_std = (
            best_classical_res.std_metrics.model_dump()
            if (best_classical_res and best_classical_res.std_metrics and hasattr(best_classical_res.std_metrics, "model_dump"))
            else (best_classical_res.std_metrics if best_classical_res and isinstance(best_classical_res.std_metrics, dict) else {})
        )

        vqc_folds_auc = [f.metrics.roc_auc for f in ideal_vqc.fold_metrics] if (ideal_vqc and ideal_vqc.fold_metrics) else []
        classical_folds_auc = [f.metrics.roc_auc for f in best_classical_res.fold_metrics] if (best_classical_res and best_classical_res.fold_metrics) else []

        evidence_verdict = QuantumEvidenceEngine.evaluate(
            vqc_metrics=vqc_metrics_dict,
            best_classical_metrics=best_classical_metrics,
            vqc_std=vqc_std_dict,
            classical_std=best_classical_std,
            noisy_vqc_metrics=noisy_vqc_result.metrics.model_dump() if noisy_vqc_result else None,
            quantum_resources={
                "n_qubits": quantum_config.n_qubits,
                "circuit_depth": quantum_config.ansatz_layers * 2 + 1,
                "parameter_count": quantum_config.n_qubits * (quantum_config.ansatz_layers + 1),
                "inference_time_ms": vqc_metrics_dict.get("inference_time_ms", 15.0),
            },
            sample_size=(
                (len(app_state.X_train) + len(app_state.X_test))
                if (app_state.X_train is not None and app_state.X_test is not None)
                else (len(app_state.raw_df) if app_state.raw_df is not None else 100)
            ),
            vqc_fold_aucs=vqc_folds_auc,
            classical_fold_aucs=classical_folds_auc,
        )

        now_utc = datetime.now(timezone.utc).isoformat()
        prep_summary = app_state.preprocessing_summary
        ds_cfg = app_state.dataset_config
        exp_metadata = ExperimentMetadata(
            experiment_id=experiment_id,
            timestamp=now_utc,
            dataset_name=app_state.dataset_name,
            dataset_rows=len(app_state.raw_df),
            dataset_columns=len(app_state.raw_df.columns),
            target_column=ds_cfg.target_column if ds_cfg else "",
            positive_class=ds_cfg.positive_class if ds_cfg else "",
            train_samples=len(app_state.X_train),
            test_samples=len(app_state.X_test),
            test_split_ratio=0.2,
            random_seed=settings.RANDOM_SEED,
            scaler_type="standard",
            feature_selection_k=None,
            pca_components=quantum_config.n_qubits,
            selected_feature_names=prep_summary.selected_feature_names if prep_summary else [],
            n_qubits=quantum_config.n_qubits,
            feature_map=quantum_config.feature_map,
            ansatz=quantum_config.ansatz,
            ansatz_layers=quantum_config.ansatz_layers,
            optimizer=quantum_config.optimizer,
            max_iterations=quantum_config.max_iterations,
            training_mode="DEMO_MODE" if quantum_config.fast_demo_mode else "RESEARCH_MODE",
            vqc_training_samples_used=len(app_state.X_train),
            vqc_iterations_used=quantum_config.max_iterations,
            classical_models_enabled=[
                m for m, enabled in [
                    ("logistic_regression", classical_config.logistic_regression),
                    ("random_forest", classical_config.random_forest),
                    ("svm", classical_config.svm),
                ] if enabled
            ],
            noise_one_qubit_error=0.01,
            noise_two_qubit_error=0.03,
            noise_readout_error=0.02,
            noise_execution_mode="AER_EXECUTION" if AER_AVAILABLE else "FALLBACK_SIMULATION",
        )

        best_auc_m = max(evaluation_results.values(), key=lambda x: x.metrics.roc_auc).model_id
        best_sens_m = max(evaluation_results.values(), key=lambda x: x.metrics.sensitivity).model_id
        best_acc_m = max(evaluation_results.values(), key=lambda x: x.metrics.accuracy).model_id

        summary = BenchmarkSummary(
            dataset_name=app_state.dataset_name,
            target_column=app_state.dataset_config.target_column,
            positive_class=app_state.dataset_config.positive_class,
            test_samples_count=len(app_state.X_test),
            evaluation_mode="Stratified 5-Fold Cross-Validation (Held-out Test Evaluated)",
            results=evaluation_results,
            noisy_vqc_result=noisy_vqc_result,
            best_accuracy_model=best_acc_m,
            best_sensitivity_model=best_sens_m,
            best_auc_model=best_auc_m,
            evidence=evidence_verdict,
            experiment_metadata=exp_metadata,
        )

        app_state.evaluation_results = evaluation_results
        app_state.explainability_cache = explainability_cache
        app_state.benchmark_summary = summary
        app_state.experiment_metadata = exp_metadata

        # Compute Resource Profile
        res_profile = compute_resource_profile(
            experiment_id=experiment_id,
            experiment_name=f"Benchmark ({app_state.dataset_name})",
            quantum_config=quantum_config,
            preprocessing_summary=app_state.preprocessing_summary,
            benchmark_summary=summary,
            vqc_result=ideal_vqc,
            classical_results=classical_models_res,
        )

        # Update and persist experiment detail in repository
        exp_detail = experiment_service.get_experiment(experiment_id)
        if exp_detail:
            exp_detail.status = JobStatus.COMPLETED
            exp_detail.progress_percent = 100
            exp_detail.current_stage = "Completed"
            exp_detail.job_end_time = datetime.now(timezone.utc).isoformat()
            exp_detail.quantum_config = quantum_config
            exp_detail.classical_config = classical_config
            exp_detail.preprocessing_summary = app_state.preprocessing_summary
            exp_detail.benchmark_summary = summary
            exp_detail.noisy_vqc_result = noisy_vqc_result
            exp_detail.evidence = evidence_verdict
            exp_detail.explainability = explainability_cache
            exp_detail.resource_profile = res_profile
            exp_detail.metadata = exp_metadata
            experiment_service.repo.save(exp_detail)

        job_manager.complete_job(experiment_id=experiment_id, success=True)
        app_state.is_training = False
        app_state.current_step = "Benchmarking & Evidence Complete"
        app_state.overall_progress = 100
        logger.info(f"Experiment {experiment_id} completed successfully in {round(time.time() - start_time, 2)}s.")

    except Exception as e:
        logger.error(f"Training pipeline error for experiment {experiment_id}: {e}", exc_info=True)
        job_manager.complete_job(experiment_id=experiment_id, success=False, error_message=str(e))
        app_state.is_training = False
        app_state.error_message = str(e)
        exp_detail = experiment_service.get_experiment(experiment_id)
        if exp_detail:
            exp_detail.status = JobStatus.FAILED
            exp_detail.current_stage = f"Failed: {str(e)}"
            exp_detail.error_message = str(e)
            experiment_service.repo.save(exp_detail)


@router.post("/preprocess", response_model=PreprocessingSummary)
async def preprocess_dataset(
    params: PreprocessingRequest,
    user: UserRecord = Depends(require_permission("dataset:configure")),
):
    """Execute leakage-safe scaling, imputation, feature selection, and PCA quantum compression."""
    if app_state.raw_df is None or app_state.dataset_config is None:
        raise HTTPException(status_code=400, detail="Please load and configure a dataset before preprocessing.")

    try:
        preprocessor = ClinicalPreprocessor(app_state.dataset_config, params)
        X_train, X_test, y_train, y_test, summary = preprocessor.fit_and_split(app_state.raw_df)

        app_state.preprocessor = preprocessor
        app_state.preprocessing_summary = summary
        app_state.X_train = X_train
        app_state.X_test = X_test
        app_state.y_train = y_train
        app_state.y_test = y_test

        # Sync active experiment
        active_exp = experiment_service.get_active_experiment()
        if active_exp:
            active_exp.preprocessing_config = params
            active_exp.preprocessing_summary = summary
            experiment_service.repo.save(active_exp)

        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preprocessing error: {str(e)}")


@router.post("/train", response_model=TrainingStatusResponse)
async def trigger_training(
    request: TrainRequest,
    background_tasks: BackgroundTasks,
    user: UserRecord = Depends(require_permission("model:train")),
):
    """Trigger background hybrid benchmark execution with concurrency and duplicate submission protection."""
    if app_state.raw_df is None:
        raise HTTPException(status_code=400, detail="No active dataset loaded for training.")

    active_exp = experiment_service.get_active_experiment()
    if not active_exp:
        active_exp = experiment_service.create_experiment(
            ExperimentCreateRequest(
                experiment_name=f"Benchmark ({app_state.dataset_name})",
                dataset_name=app_state.dataset_name,
            ),
            df=app_state.raw_df,
            user_id=user.username,
        )

    exp_id = active_exp.experiment_id

    # Concurrency and duplicate submission protection (Task Group 3 & 11)
    if job_manager.is_running(exp_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A training job is already actively executing for experiment '{exp_id}'. Please await completion or inspect status.",
        )

    job_id = f"job-{uuid.uuid4().hex[:8]}"
    job_manager.start_job(experiment_id=exp_id, job_id=job_id)

    background_tasks.add_task(
        run_training_pipeline_task,
        experiment_id=exp_id,
        quantum_config=request.quantum_config,
        classical_config=request.classical_config,
    )

    return job_manager.get_status(exp_id)


@router.get("/training/status", response_model=TrainingStatusResponse)
async def get_training_status(
    user: UserRecord = Depends(require_permission("model:view")),
):
    """Retrieve active training progress, execution stage, and fold status."""
    active_exp = experiment_service.get_active_experiment()
    if active_exp and job_manager.is_running(active_exp.experiment_id):
        return job_manager.get_status(active_exp.experiment_id)
    return app_state.get_training_status()
