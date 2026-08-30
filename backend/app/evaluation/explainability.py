from typing import List, Optional
import numpy as np
from sklearn.inspection import permutation_importance

from app.models.base import BaseDiseaseClassifier
from app.models.classical import (
    LogisticRegressionDiseaseClassifier,
    RandomForestDiseaseClassifier,
    SVMDiseaseClassifier,
)
from app.models.vqc import VariationalQuantumClassifier
from app.schemas import ExplainabilityFeature, ExplainabilityResult, QuantumSensitivityResult


def compute_model_explainability(
    model: BaseDiseaseClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: List[str],
    pca_components: Optional[np.ndarray] = None,
    original_feature_names: Optional[List[str]] = None,
) -> ExplainabilityResult:
    """Compute feature importance for classical models or Quantum Feature Sensitivity for VQC."""
    
    if isinstance(model, VariationalQuantumClassifier):
        return compute_quantum_sensitivity(
            vqc_model=model,
            X_test=X_test,
            feature_names=feature_names,
            pca_components=pca_components,
            original_feature_names=original_feature_names,
        )

    # Classical Models
    features: List[ExplainabilityFeature] = []
    
    if isinstance(model, RandomForestDiseaseClassifier):
        importances = model.model.feature_importances_
        raw_scores = importances[:len(feature_names)]
    elif isinstance(model, LogisticRegressionDiseaseClassifier):
        # Coefficients magnitude
        raw_scores = np.abs(model.model.coef_[0][:len(feature_names)])
    else:
        # SVM or Permutation Importance fallback
        perm_res = permutation_importance(
            model.model,
            X_test,
            y_test,
            n_repeats=5,
            random_state=42,
            scoring="roc_auc",
        )
        raw_scores = np.maximum(0, perm_res.importances_mean[:len(feature_names)])

    total_score = np.sum(raw_scores)
    if total_score > 0:
        rel_pct = (raw_scores / total_score) * 100.0
    else:
        rel_pct = np.ones_like(raw_scores) * (100.0 / max(1, len(raw_scores)))

    for i, name in enumerate(feature_names):
        score = float(raw_scores[i]) if i < len(raw_scores) else 0.0
        pct = float(round(rel_pct[i], 2)) if i < len(rel_pct) else 0.0
        features.append(
            ExplainabilityFeature(
                feature_name=f"PC {i+1} ({name})" if name.startswith("PC") else name,
                importance_score=float(round(score, 4)),
                relative_percentage=pct,
                direction="positive" if score > 0 else "neutral",
            )
        )

    # Sort descending by importance
    features.sort(key=lambda x: x.importance_score, reverse=True)

    return ExplainabilityResult(
        model_id=model.model_id,
        model_name=model.model_name,
        model_type=model.model_type,
        features=features,
        quantum_sensitivity=None,
        interpretation_note=f"Computed using {'tree Gini impurity' if isinstance(model, RandomForestDiseaseClassifier) else 'feature permutation importance / model weights'} on held-out test split.",
    )


def compute_quantum_sensitivity(
    vqc_model: VariationalQuantumClassifier,
    X_test: np.ndarray,
    feature_names: List[str],
    pca_components: Optional[np.ndarray] = None,
    original_feature_names: Optional[List[str]] = None,
    delta: float = 0.05,
) -> ExplainabilityResult:
    """Quantum Model Feature Sensitivity Analysis via systematic parameter-input perturbation."""
    n_features = X_test.shape[1]
    # Sample up to 25 test points for efficient sensitivity evaluation
    sample_indices = np.linspace(0, len(X_test) - 1, min(len(X_test), 25), dtype=int)
    X_sample = X_test[sample_indices]

    sensitivities = np.zeros(n_features, dtype=np.float64)

    for j in range(n_features):
        X_plus = X_sample.copy()
        X_minus = X_sample.copy()

        # Perturb j-th quantum feature
        X_plus[:, j] = np.clip(X_plus[:, j] + delta, 0.0, np.pi)
        X_minus[:, j] = np.clip(X_minus[:, j] - delta, 0.0, np.pi)

        p_plus = vqc_model.predict_proba(X_plus)[:, 1]
        p_minus = vqc_model.predict_proba(X_minus)[:, 1]

        # Empirical finite difference gradient
        grad = np.abs(p_plus - p_minus) / (2.0 * delta)
        sensitivities[j] = float(np.mean(grad))

    total_sens = np.sum(sensitivities)
    if total_sens > 0:
        rel_sens = (sensitivities / total_sens) * 100.0
    else:
        rel_sens = np.ones_like(sensitivities) * (100.0 / max(1, n_features))

    q_features: List[ExplainabilityFeature] = []
    for j in range(n_features):
        name = feature_names[j] if j < len(feature_names) else f"Quantum Feature {j+1}"
        q_features.append(
            ExplainabilityFeature(
                feature_name=f"Qubit {j} (PC {j+1})",
                importance_score=float(round(sensitivities[j], 4)),
                relative_percentage=float(round(rel_sens[j], 2)),
                direction="positive",
            )
        )
    q_features.sort(key=lambda x: x.importance_score, reverse=True)

    # Back-project quantum sensitivity through PCA loadings to original clinical features
    projected_features: List[ExplainabilityFeature] = []
    if pca_components is not None and original_feature_names is not None:
        # pca_components shape: (n_quantum_features, n_original_features)
        # weights = sensitivities @ |components|
        loadings = np.abs(pca_components[:n_features, :len(original_feature_names)])
        clinical_importances = sensitivities @ loadings
        total_clin = np.sum(clinical_importances)
        clin_rel = (clinical_importances / total_clin * 100.0) if total_clin > 0 else np.zeros_like(clinical_importances)

        for k, col_name in enumerate(original_feature_names):
            if k < len(clinical_importances):
                projected_features.append(
                    ExplainabilityFeature(
                        feature_name=col_name,
                        importance_score=float(round(clinical_importances[k], 4)),
                        relative_percentage=float(round(clin_rel[k], 2)),
                        direction="positive",
                    )
                )
        projected_features.sort(key=lambda x: x.importance_score, reverse=True)

    q_sensitivity_result = QuantumSensitivityResult(
        quantum_features=q_features,
        projected_original_features=projected_features,
        perturbation_delta=delta,
        methodology="Perturbation-based finite difference sensitivity analysis on the parameterized quantum circuit (PQC).",
    )

    return ExplainabilityResult(
        model_id=vqc_model.model_id,
        model_name=vqc_model.model_name,
        model_type=vqc_model.model_type,
        features=q_features,
        quantum_sensitivity=q_sensitivity_result,
        interpretation_note="Quantum Model Feature Sensitivity measures the rate of change in VQC output expectation values with respect to small perturbations in each quantum-encoded feature.",
    )
