import time
from typing import List, Tuple
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    accuracy_score,
    auc,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

from app.models.base import BaseDiseaseClassifier
from app.schemas import (
    CalibrationPoint,
    ConfusionMatrixData,
    EvaluationMetrics,
    ModelEvaluationResult,
    PrPoint,
    RocPoint,
)


def evaluate_model(
    model: BaseDiseaseClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
    class_labels: List[str] | None = None,
    sample_names: List[str] | None = None,
) -> ModelEvaluationResult:
    """Compatibility wrapper used by the training pipeline.

    The training pipeline still invokes the legacy keyword ``sample_names`` while newer code
    passes ``class_labels``. Accept both to keep callers working across versions.
    """
    labels = class_labels or sample_names or ["0", "1"]
    return calculate_medical_metrics(model, X_test, y_test, labels)


def calculate_medical_metrics(
    model: BaseDiseaseClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
    class_labels: List[str],
) -> ModelEvaluationResult:
    """Evaluate a disease detection model and calculate clinical diagnostic metrics."""
    # Measure inference time over test set
    start_infer = time.perf_counter()
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    total_infer_time = time.perf_counter() - start_infer
    infer_time_ms = float(round((total_infer_time / max(1, len(X_test))) * 1000, 3))

    y_pos_prob = y_proba[:, 1]

    # 1. Confusion Matrix
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)

    # 2. Clinical Metrics with Zero-Division Protection
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    sensitivity = float(recall_score(y_test, y_pred, zero_division=0))  # TP / (TP + FN)
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    f1 = float(f1_score(y_test, y_pred, zero_division=0))

    # Brier Score
    brier = float(brier_score_loss(y_test, y_pos_prob))

    # 3. ROC-AUC and ROC Curve Points
    try:
        if len(np.unique(y_test)) > 1:
            roc_auc_val = float(roc_auc_score(y_test, y_pos_prob))
            fpr_arr, tpr_arr, thresh_arr = roc_curve(y_test, y_pos_prob)
            
            # Subsample ROC points if too dense
            max_points = 50
            if len(fpr_arr) > max_points:
                indices = np.linspace(0, len(fpr_arr) - 1, max_points, dtype=int)
                fpr_arr = fpr_arr[indices]
                tpr_arr = tpr_arr[indices]
                thresh_arr = thresh_arr[indices]

            roc_points = [
                RocPoint(
                    fpr=float(round(fpr, 4)),
                    tpr=float(round(tpr, 4)),
                    threshold=float(round(thresh, 4)) if not np.isinf(thresh) else 1.0,
                )
                for fpr, tpr, thresh in zip(fpr_arr, tpr_arr, thresh_arr)
            ]
        else:
            roc_auc_val = 0.5
            roc_points = [RocPoint(fpr=0.0, tpr=0.0, threshold=1.0), RocPoint(fpr=1.0, tpr=1.0, threshold=0.0)]
    except Exception:
        roc_auc_val = 0.5
        roc_points = [RocPoint(fpr=0.0, tpr=0.0, threshold=1.0), RocPoint(fpr=1.0, tpr=1.0, threshold=0.0)]

    # 4. Precision-Recall Curve & PR-AUC
    try:
        if len(np.unique(y_test)) > 1:
            p_arr, r_arr, pr_thresh = precision_recall_curve(y_test, y_pos_prob)
            pr_auc_val = float(auc(r_arr, p_arr))
            
            if len(p_arr) > 50:
                indices = np.linspace(0, len(p_arr) - 1, 50, dtype=int)
                p_arr = p_arr[indices]
                r_arr = r_arr[indices]
                pr_thresh = np.append(pr_thresh, 1.0)[indices]

            pr_points = [
                PrPoint(
                    precision=float(round(p, 4)),
                    recall=float(round(r, 4)),
                    threshold=float(round(t, 4)) if i < len(pr_thresh) else 1.0,
                )
                for i, (p, r, t) in enumerate(zip(p_arr, r_arr, pr_thresh))
            ]
        else:
            pr_auc_val = 0.5
            pr_points = [PrPoint(precision=1.0, recall=0.0, threshold=1.0)]
    except Exception:
        pr_auc_val = 0.5
        pr_points = []

    # 5. Probability Calibration Curve Points
    try:
        if len(np.unique(y_test)) > 1:
            prob_true, prob_pred = calibration_curve(y_test, y_pos_prob, n_bins=5, strategy="uniform")
            cal_points = [
                CalibrationPoint(
                    mean_predicted_value=float(round(pred, 4)),
                    fraction_of_positives=float(round(true_val, 4)),
                )
                for true_val, pred in zip(prob_true, prob_pred)
            ]
        else:
            cal_points = []
    except Exception:
        cal_points = []

    metrics = EvaluationMetrics(
        accuracy=float(round(acc, 4)),
        precision=float(round(prec, 4)),
        sensitivity=float(round(sensitivity, 4)),
        specificity=float(round(specificity, 4)),
        f1_score=float(round(f1, 4)),
        roc_auc=float(round(roc_auc_val, 4)),
        pr_auc=float(round(pr_auc_val, 4)),
        brier_score=float(round(brier, 4)),
        training_time_seconds=float(round(model.training_time_seconds, 3)),
        inference_time_ms=infer_time_ms,
    )

    cm_data = ConfusionMatrixData(
        true_positive=int(tp),
        false_positive=int(fp),
        true_negative=int(tn),
        false_negative=int(fn),
        labels=class_labels,
    )

    return ModelEvaluationResult(
        model_id=model.model_id,
        model_name=model.model_name,
        model_type=model.model_type,
        metrics=metrics,
        confusion_matrix=cm_data,
        roc_curve=roc_points,
        pr_curve=pr_points,
        calibration_curve=cal_points,
        parameters=model.get_params(),
    )
