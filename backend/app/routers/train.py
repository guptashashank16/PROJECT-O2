import traceback
import numpy as np
from fastapi import APIRouter, BackgroundTasks, HTTPException
from sklearn.model_selection import StratifiedKFold

from app.data.preprocessor import ClinicalPreprocessor
from app.evaluation.explainability import compute_model_explainability
from app.evaluation.metrics import calculate_medical_metrics
from app.evidence.evidence_engine import QuantumEvidenceEngine
from app.models.classical import (
    LogisticRegressionDiseaseClassifier,
    RandomForestDiseaseClassifier,
    SVMDiseaseClassifier,
)
from app.models.vqc import VariationalQuantumClassifier
from app.quantum.noisy_simulator import simulate_noisy_probabilities
from app.schemas import (
    BenchmarkSummary,
    EvaluationMetrics,
    ModelEvaluationResult,
    PreprocessingRequest,
    PreprocessingSummary,
    TrainingStatusResponse,
    TrainRequest,
)
from app.security.audit import audit_logger
from app.state import app_state

router = APIRouter(tags=["Preprocessing & Model Training"])


@router.post("/preprocess", response_model=PreprocessingSummary)
async def run_preprocessing(params: PreprocessingRequest = PreprocessingRequest()):
    """Execute leakage-free train/test split, imputation, scaling, feature selection, and PCA reduction."""
    if app_state.raw_df is None:
        raise HTTPException(status_code=404, detail="No active dataset loaded.")
    if app_state.dataset_config is None:
        raise HTTPException(status_code=400, detail="Dataset has not been configured. Please configure target column first.")

    try:
        preprocessor = ClinicalPreprocessor(
            config=app_state.dataset_config,
            params=params,
            random_state=42,
        )
        X_train, X_test, y_train, y_test, summary = preprocessor.fit_and_split(app_state.raw_df)

        app_state.preprocessor = preprocessor
        app_state.preprocessing_summary = summary
        app_state.X_train = X_train
        app_state.X_test = X_test
        app_state.y_train = y_train
        app_state.y_test = y_test

        # Reset trained models
        app_state.models.clear()
        app_state.evaluation_results.clear()
        app_state.explainability_cache.clear()
        app_state.benchmark_summary = None

        audit_logger.log("system", "RESEARCHER", "PREPROCESS", "SUCCESS", f"Preprocessed {len(app_state.raw_df)} rows")
        return summary
    except Exception as e:
        audit_logger.log("system", "RESEARCHER", "PREPROCESS", "FAILED", str(e))
        raise HTTPException(status_code=400, detail=f"Preprocessing failed: {str(e)}")


def execute_training_pipeline(request: TrainRequest):
    """Synchronous background execution of 5-Fold CV training, noise simulation, and evidence synthesis."""
    try:
        app_state.is_training = True
        app_state.error_message = None
        
        # Step 1: Data verification
        app_state.current_step = "Verifying dataset and fold structures"
        app_state.steps[0].status = "completed"
        app_state.steps[0].progress = 100
        app_state.overall_progress = 15

        raw_df = app_state.raw_df
        target_col = app_state.dataset_config.target_column
        pos_class = app_state.preprocessor.positive_class_label
        labels = app_state.preprocessor.class_labels_

        # Prepare fold splits on raw data
        valid_df = raw_df.dropna(subset=[target_col]).copy()
        y_all = (valid_df[target_col].astype(str).str.strip() == str(pos_class).strip()).astype(int).values

        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        folds = list(skf.split(valid_df, y_all))

        # Train primary models on global split for persistence & inference
        X_train = app_state.X_train
        X_test = app_state.X_test
        y_train = app_state.y_train
        y_test = app_state.y_test

        # Step 2: Classical Baselines
        app_state.current_step = "Training Classical Baselines (LR, RF, SVM) across 5 Folds"
        app_state.steps[1].status = "running"
        app_state.steps[1].progress = 10

        classical_models = {}
        if request.classical_config.logistic_regression:
            lr = LogisticRegressionDiseaseClassifier(random_state=42)
            lr.fit(X_train, y_train)
            app_state.models["logistic_regression"] = lr
            classical_models["logistic_regression"] = lr

        if request.classical_config.random_forest:
            rf = RandomForestDiseaseClassifier(random_state=42)
            rf.fit(X_train, y_train)
            app_state.models["random_forest"] = rf
            classical_models["random_forest"] = rf

        if request.classical_config.svm:
            svm = SVMDiseaseClassifier(random_state=42)
            svm.fit(X_train, y_train)
            app_state.models["svm"] = svm
            classical_models["svm"] = svm

        app_state.steps[1].status = "completed"
        app_state.steps[1].progress = 100
        app_state.overall_progress = 45

        # Step 3: VQC Training
        app_state.current_step = "Simulating & Optimizing Variational Quantum Classifier (VQC)"
        app_state.steps[2].status = "running"
        app_state.steps[2].progress = 0

        def vqc_progress(pct: int, loss: float):
            app_state.steps[2].progress = pct
            app_state.steps[2].message = f"Loss: {loss:.4f}"
            app_state.overall_progress = 45 + int(pct * 0.35)

        vqc = VariationalQuantumClassifier(config=request.quantum_config, random_state=42)
        vqc.fit(X_train, y_train, progress_callback=vqc_progress)
        app_state.models["vqc"] = vqc

        app_state.steps[2].status = "completed"
        app_state.steps[2].progress = 100
        app_state.overall_progress = 80

        # Step 4: 5-Fold Cross Validation Evaluation
        app_state.current_step = "Evaluating 5-Fold CV, Noisy Simulation & Evidence Synthesis"
        app_state.steps[3].status = "running"
        app_state.steps[3].progress = 20

        # Run leakage-free 5-fold evaluation for per-fold mean ± std
        fold_results_by_model = {m_id: [] for m_id in app_state.models.keys()}
        
        for fold_idx, (train_idx, val_idx) in enumerate(folds):
            train_fold_df = valid_df.iloc[train_idx]
            val_fold_df = valid_df.iloc[val_idx]
            y_fold_train = y_all[train_idx]
            y_fold_val = y_all[val_idx]

            fold_prep = ClinicalPreprocessor(
                config=app_state.dataset_config,
                params=app_state.preprocessor.params,
                random_state=42 + fold_idx,
            )
            X_fold_train_q = fold_prep.fit_transform_fold(train_fold_df, y_fold_train)
            X_fold_val_q = fold_prep.transform_fold(val_fold_df)

            for m_id, main_model in app_state.models.items():
                if m_id == "vqc":
                    m_fold = VariationalQuantumClassifier(config=request.quantum_config, random_state=42 + fold_idx)
                elif m_id == "logistic_regression":
                    m_fold = LogisticRegressionDiseaseClassifier(random_state=42)
                elif m_id == "random_forest":
                    m_fold = RandomForestDiseaseClassifier(random_state=42)
                elif m_id == "svm":
                    m_fold = SVMDiseaseClassifier(random_state=42)
                else:
                    continue

                m_fold.fit(X_fold_train_q, y_fold_train)
                res_fold = calculate_medical_metrics(m_fold, X_fold_val_q, y_fold_val, labels)
                fold_results_by_model[m_id].append(res_fold.metrics)

        # Global Evaluation Results
        eval_results = {}
        pca_components = app_state.preprocessor.pca.components_ if app_state.preprocessor.pca else None
        orig_features = app_state.preprocessor.selected_feature_names_
        q_feature_names = [f"PC_{i+1}" for i in range(X_train.shape[1])]

        for model_id, model in app_state.models.items():
            res = calculate_medical_metrics(model, X_test, y_test, labels)
            
            # Compute 5-fold mean ± std
            fold_metrics_list = fold_results_by_model.get(model_id, [])
            if fold_metrics_list:
                mean_acc = float(np.mean([m.accuracy for m in fold_metrics_list]))
                std_acc = float(np.std([m.accuracy for m in fold_metrics_list]))

                mean_auc = float(np.mean([m.roc_auc for m in fold_metrics_list]))
                std_auc = float(np.std([m.roc_auc for m in fold_metrics_list]))

                mean_sens = float(np.mean([m.sensitivity for m in fold_metrics_list]))
                std_sens = float(np.std([m.sensitivity for m in fold_metrics_list]))

                mean_spec = float(np.mean([m.specificity for m in fold_metrics_list]))
                std_spec = float(np.std([m.specificity for m in fold_metrics_list]))

                mean_f1 = float(np.mean([m.f1_score for m in fold_metrics_list]))
                std_f1 = float(np.std([m.f1_score for m in fold_metrics_list]))

                mean_brier = float(np.mean([m.brier_score for m in fold_metrics_list]))
                std_brier = float(np.std([m.brier_score for m in fold_metrics_list]))

                res.mean_metrics = EvaluationMetrics(
                    accuracy=round(mean_acc, 4),
                    precision=round(float(np.mean([m.precision for m in fold_metrics_list])), 4),
                    sensitivity=round(mean_sens, 4),
                    specificity=round(mean_spec, 4),
                    f1_score=round(mean_f1, 4),
                    roc_auc=round(mean_auc, 4),
                    pr_auc=round(float(np.mean([m.pr_auc for m in fold_metrics_list])), 4),
                    brier_score=round(mean_brier, 4),
                    training_time_seconds=round(model.training_time_seconds, 3),
                    inference_time_ms=res.metrics.inference_time_ms,
                )

                res.std_metrics = EvaluationMetrics(
                    accuracy=round(std_acc, 4),
                    precision=round(float(np.std([m.precision for m in fold_metrics_list])), 4),
                    sensitivity=round(std_sens, 4),
                    specificity=round(std_spec, 4),
                    f1_score=round(std_f1, 4),
                    roc_auc=round(std_auc, 4),
                    pr_auc=round(float(np.std([m.pr_auc for m in fold_metrics_list])), 4),
                    brier_score=round(std_brier, 4),
                    training_time_seconds=0.0,
                    inference_time_ms=0.0,
                )

            eval_results[model_id] = res

            # Explainability computation
            expl = compute_model_explainability(
                model=model,
                X_test=X_test,
                y_test=y_test,
                feature_names=q_feature_names,
                pca_components=pca_components,
                original_feature_names=orig_features,
            )
            app_state.explainability_cache[model_id] = expl

        app_state.evaluation_results = eval_results

        # Noisy Quantum Simulation Stress Test
        ideal_vqc = app_state.models.get("vqc")
        noisy_vqc_result = None
        if ideal_vqc:
            ideal_probs = ideal_vqc.predict_proba(X_test)
            noisy_probs = simulate_noisy_probabilities(ideal_probs, noise_level=0.06, random_seed=42)
            
            # Create dummy classifier wrapper returning noisy probabilities for evaluation
            class NoisyVQCWrapper:
                def __init__(self, n_probs, orig):
                    self.n_probs = n_probs
                    self.model_id = "vqc_noisy"
                    self.model_name = "Noisy VQC (Simulated Noise)"
                    self.model_type = "quantum"
                    self.training_time_seconds = orig.training_time_seconds

                def predict_proba(self, X):
                    return self.n_probs

                def predict(self, X):
                    return (self.n_probs[:, 1] >= 0.5).astype(int)

                def get_params(self):
                    return {**orig.get_params(), "noisy_simulation": True, "noise_model": "Depolarizing + Readout"}

            noisy_wrapper = NoisyVQCWrapper(noisy_probs, ideal_vqc)
            noisy_vqc_result = calculate_medical_metrics(noisy_wrapper, X_test, y_test, labels)

        # Quantum Evidence Engine Evaluation
        vqc_eval = eval_results.get("vqc")
        classical_evals = [v for k, v in eval_results.items() if k != "vqc"]
        best_classical = max(classical_evals, key=lambda x: x.metrics.roc_auc) if classical_evals else vqc_eval

        vqc_m = vqc_eval.metrics.model_dump() if vqc_eval else {}
        c_m = best_classical.metrics.model_dump() if best_classical else {}
        
        vqc_s = vqc_eval.std_metrics.model_dump() if (vqc_eval and vqc_eval.std_metrics) else {"roc_auc": 0.03}
        c_s = best_classical.std_metrics.model_dump() if (best_classical and best_classical.std_metrics) else {"roc_auc": 0.03}

        evidence_summary = QuantumEvidenceEngine.evaluate(
            vqc_metrics=vqc_m,
            best_classical_metrics=c_m,
            vqc_std=vqc_s,
            classical_std=c_s,
            noisy_vqc_metrics=noisy_vqc_result.metrics.model_dump() if noisy_vqc_result else None,
            quantum_resources={"n_qubits": request.quantum_config.n_qubits, "circuit_depth": request.quantum_config.ansatz_layers, "inference_time_ms": vqc_m.get("inference_time_ms", 10.0)},
            sample_size=len(valid_df),
        )

        best_acc_model = max(eval_results.keys(), key=lambda k: eval_results[k].metrics.accuracy)
        best_sens_model = max(eval_results.keys(), key=lambda k: eval_results[k].metrics.sensitivity)
        best_auc_model = max(eval_results.keys(), key=lambda k: eval_results[k].metrics.roc_auc)

        app_state.benchmark_summary = BenchmarkSummary(
            dataset_name=app_state.dataset_name,
            target_column=app_state.dataset_config.target_column,
            positive_class=app_state.dataset_config.positive_class,
            test_samples_count=len(X_test),
            evaluation_mode="5-fold_stratified_cross_validation",
            results=eval_results,
            noisy_vqc_result=noisy_vqc_result,
            evidence=evidence_summary.model_dump(),
            best_accuracy_model=best_acc_model,
            best_sensitivity_model=best_sens_model,
            best_auc_model=best_auc_model,
        )

        app_state.steps[3].status = "completed"
        app_state.steps[3].progress = 100
        app_state.overall_progress = 100
        app_state.current_step = "Training Complete"
        app_state.is_training = False

        audit_logger.log("system", "RESEARCHER", "TRAIN", "SUCCESS", f"Benchmark completed with verdict {evidence_summary.verdict}")

    except Exception as e:
        app_state.is_training = False
        app_state.error_message = f"Training error: {str(e)}"
        app_state.current_step = "Error"
        audit_logger.log("system", "RESEARCHER", "TRAIN", "FAILED", str(e))
        traceback.print_exc()


@router.post("/train", response_model=TrainingStatusResponse)
async def start_training(request: TrainRequest, background_tasks: BackgroundTasks):
    """Trigger training of classical and quantum models with real-time progress tracking."""
    if app_state.X_train is None or app_state.y_train is None:
        if app_state.raw_df is None or app_state.dataset_config is None:
            raise HTTPException(status_code=400, detail="Dataset not ready. Load a dataset and configure target first.")
        
        preprocessor = ClinicalPreprocessor(
            config=app_state.dataset_config,
            params=PreprocessingRequest(n_quantum_features=request.quantum_config.n_qubits),
            random_state=42,
        )
        X_train, X_test, y_train, y_test, summary = preprocessor.fit_and_split(app_state.raw_df)
        app_state.preprocessor = preprocessor
        app_state.preprocessing_summary = summary
        app_state.X_train = X_train
        app_state.X_test = X_test
        app_state.y_train = y_train
        app_state.y_test = y_test

    app_state.reset_training_status()
    background_tasks.add_task(execute_training_pipeline, request)
    
    return app_state.get_training_status()


@router.get("/training/status", response_model=TrainingStatusResponse)
async def get_status():
    """Poll current training status and step progression."""
    return app_state.get_training_status()
