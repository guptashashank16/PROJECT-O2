import time
from typing import List, Tuple
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score, roc_curve

from app.models.base import BaseDiseaseClassifier
from app.schemas import ConfusionMatrixData, EvaluationMetrics, ModelEvaluationResult, RocPoint


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
    
    # Specificity = TN / (TN + FP)
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    f1 = float(f1_score(y_test, y_pred, zero_division=0))

    # 3. ROC-AUC and ROC Curve Points
    try:
        if len(np.unique(y_test)) > 1:
            auc = float(roc_auc_score(y_test, y_pos_prob))
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
            auc = 0.5
            roc_points = [
                RocPoint(fpr=0.0, tpr=0.0, threshold=1.0),
                RocPoint(fpr=1.0, tpr=1.0, threshold=0.0),
            ]
    except Exception:
        auc = 0.5
        roc_points = [
            RocPoint(fpr=0.0, tpr=0.0, threshold=1.0),
            RocPoint(fpr=1.0, tpr=1.0, threshold=0.0),
        ]

    metrics = EvaluationMetrics(
        accuracy=float(round(acc, 4)),
        precision=float(round(prec, 4)),
        sensitivity=float(round(sensitivity, 4)),
        specificity=float(round(specificity, 4)),
        f1_score=float(round(f1, 4)),
        roc_auc=float(round(auc, 4)),
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
        parameters=model.get_params(),
    )
