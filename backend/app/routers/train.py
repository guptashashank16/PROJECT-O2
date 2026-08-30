import traceback
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.data.preprocessor import ClinicalPreprocessor
from app.evaluation.explainability import compute_model_explainability
from app.evaluation.metrics import calculate_medical_metrics
from app.models.classical import (
    LogisticRegressionDiseaseClassifier,
    RandomForestDiseaseClassifier,
    SVMDiseaseClassifier,
)
from app.models.vqc import VariationalQuantumClassifier
from app.schemas import (
    BenchmarkSummary,
    PreprocessingRequest,
    PreprocessingSummary,
    StepStatus,
    TrainingStatusResponse,
    TrainRequest,
)
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

        return summary
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preprocessing failed: {str(e)}")


def execute_training_pipeline(request: TrainRequest):
    """Synchronous background execution of model training and benchmarking."""
    try:
        app_state.is_training = True
        app_state.error_message = None
        
        # Step 1: Verification of preprocessed data
        app_state.current_step = "Verifying preprocessed feature splits"
        app_state.steps[0].status = "completed"
        app_state.steps[0].progress = 100
        app_state.overall_progress = 20

        X_train = app_state.X_train
        X_test = app_state.X_test
        y_train = app_state.y_train
        y_test = app_state.y_test
        labels = app_state.preprocessor.class_labels_

        # Step 2: Classical Models Training
        app_state.current_step = "Training Classical Baselines (LR, RF, SVM)"
        app_state.steps[1].status = "running"
        app_state.steps[1].progress = 10

        if request.classical_config.logistic_regression:
            lr = LogisticRegressionDiseaseClassifier(random_state=42)
            lr.fit(X_train, y_train)
            app_state.models["logistic_regression"] = lr
            app_state.steps[1].progress = 40

        if request.classical_config.random_forest:
            rf = RandomForestDiseaseClassifier(random_state=42)
            rf.fit(X_train, y_train)
            app_state.models["random_forest"] = rf
            app_state.steps[1].progress = 70

        if request.classical_config.svm:
            svm = SVMDiseaseClassifier(random_state=42)
            svm.fit(X_train, y_train)
            app_state.models["svm"] = svm
            app_state.steps[1].progress = 100

        app_state.steps[1].status = "completed"
        app_state.overall_progress = 50

        # Step 3: Quantum VQC Training
        app_state.current_step = "Simulating & Optimizing Variational Quantum Classifier (VQC)"
        app_state.steps[2].status = "running"
        app_state.steps[2].progress = 0

        def vqc_progress(pct: int, loss: float):
            app_state.steps[2].progress = pct
            app_state.steps[2].message = f"Loss: {loss:.4f}"
            app_state.overall_progress = 50 + int(pct * 0.35)

        vqc = VariationalQuantumClassifier(config=request.quantum_config, random_state=42)
        vqc.fit(X_train, y_train, progress_callback=vqc_progress)
        app_state.models["vqc"] = vqc

        app_state.steps[2].status = "completed"
        app_state.steps[2].progress = 100
        app_state.overall_progress = 85

        # Step 4: Evaluation & Explainability
        app_state.current_step = "Calculating Medical Metrics & Quantum Sensitivity"
        app_state.steps[3].status = "running"
        app_state.steps[3].progress = 20

        eval_results = {}
        pca_components = app_state.preprocessor.pca.components_ if app_state.preprocessor.pca else None
        orig_features = app_state.preprocessor.selected_feature_names_
        q_feature_names = [f"PC_{i+1}" for i in range(X_train.shape[1])]

        for model_id, model in app_state.models.items():
            # 1. Metrics
            res = calculate_medical_metrics(model, X_test, y_test, labels)
            eval_results[model_id] = res

            # 2. Explainability
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

        # Determine best models
        best_acc_model = max(eval_results.keys(), key=lambda k: eval_results[k].metrics.accuracy)
        best_sens_model = max(eval_results.keys(), key=lambda k: eval_results[k].metrics.sensitivity)
        best_auc_model = max(eval_results.keys(), key=lambda k: eval_results[k].metrics.roc_auc)

        app_state.benchmark_summary = BenchmarkSummary(
            dataset_name=app_state.dataset_name,
            target_column=app_state.dataset_config.target_column,
            positive_class=app_state.dataset_config.positive_class,
            test_samples_count=len(X_test),
            results=eval_results,
            best_accuracy_model=best_acc_model,
            best_sensitivity_model=best_sens_model,
            best_auc_model=best_auc_model,
        )

        app_state.steps[3].status = "completed"
        app_state.steps[3].progress = 100
        app_state.overall_progress = 100
        app_state.current_step = "Training Complete"
        app_state.is_training = False

    except Exception as e:
        app_state.is_training = False
        app_state.error_message = f"Training error: {str(e)}"
        app_state.current_step = "Error"
        traceback.print_exc()


@router.post("/train", response_model=TrainingStatusResponse)
async def start_training(request: TrainRequest, background_tasks: BackgroundTasks):
    """Trigger training of classical and quantum models with real-time progress tracking."""
    if app_state.X_train is None or app_state.y_train is None:
        # Run default preprocessing first if not yet done
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
