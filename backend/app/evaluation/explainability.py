"""
Model Explainability Module — Q-CARE Platform
==============================================
Provides model-specific explanation methods.  Each method is clearly labelled
and described; no implied equivalence between methods for different model types.

Method mapping:
  Logistic Regression  → coefficient-magnitude (linear weight interpretation)
  Random Forest        → impurity-based (Gini/entropy) feature importance
  SVM                  → permutation importance (model-agnostic, via sklearn)
  VQC                  → finite-difference quantum feature sensitivity (PQC)

NOTE: These are NOT mathematically equivalent and should not be compared
directly.  See `method_description` in each result for the exact computation.
"""
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


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def compute_model_explainability(
    model: BaseDiseaseClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: List[str],
    pca_components: Optional[np.ndarray] = None,
    original_feature_names: Optional[List[str]] = None,
) -> ExplainabilityResult:
    """
    Dispatch to the correct explanation method for each model type.

    Returns an ExplainabilityResult with:
      - method_name        : short human-readable label for the UI
      - method_description : paragraph explaining exactly what was computed
      - features           : list of ExplainabilityFeature sorted by importance
    """
    if isinstance(model, VariationalQuantumClassifier):
        return _compute_quantum_sensitivity(
            vqc_model=model,
            X_test=X_test,
            feature_names=feature_names,
            pca_components=pca_components,
            original_feature_names=original_feature_names,
        )

    if isinstance(model, RandomForestDiseaseClassifier):
        return _compute_random_forest_importance(model, feature_names)

    if isinstance(model, LogisticRegressionDiseaseClassifier):
        return _compute_logistic_regression_coefficients(model, feature_names)

    # SVM or any other model → permutation importance
    return _compute_permutation_importance(model, X_test, y_test, feature_names)


def compute_quantum_sensitivity(
    model: VariationalQuantumClassifier,
    X_test: np.ndarray,
    feature_names: List[str],
    pca_components: Optional[np.ndarray] = None,
    original_feature_names: Optional[List[str]] = None,
) -> ExplainabilityResult:
    """Compatibility entry point expected by the training router."""
    return _compute_quantum_sensitivity(
        vqc_model=model,
        X_test=X_test,
        feature_names=feature_names,
        pca_components=pca_components,
        original_feature_names=original_feature_names,
    )


# ---------------------------------------------------------------------------
# Classical: Logistic Regression — coefficient magnitudes
# ---------------------------------------------------------------------------

def _compute_logistic_regression_coefficients(
    model: LogisticRegressionDiseaseClassifier,
    feature_names: List[str],
) -> ExplainabilityResult:
    """
    Coefficient-based feature interpretation for Logistic Regression.

    Each coefficient represents the log-odds change per unit change in the
    (standardized) feature.  Absolute magnitude indicates relative influence
    on the decision boundary in the linear model.

    This is a LINEAR model interpretation and does NOT generalise to
    non-linear models.
    """
    raw_coefs = model.model.coef_[0]
    scores = np.abs(raw_coefs[: len(feature_names)])
    directions = ["positive" if c > 0 else "negative" for c in raw_coefs[: len(feature_names)]]

    features = _build_feature_list(feature_names, scores, directions)

    return ExplainabilityResult(
        model_id=model.model_id,
        model_name=model.model_name,
        model_type=model.model_type,
        method_name="Coefficient Magnitude (Linear Weights)",
        method_description=(
            "Logistic Regression coefficients represent the log-odds change per unit "
            "increase in each standardized input feature.  The absolute magnitude "
            "indicates relative influence on the linear decision boundary. "
            "Sign (positive/negative) indicates direction of association. "
            "This interpretation applies only to the fitted linear model."
        ),
        features=features,
        quantum_sensitivity=None,
        interpretation_note=(
            "Values are absolute coefficient magnitudes from the fitted Logistic Regression "
            "model on the PCA-compressed held-out feature space. "
            "They reflect the model's internal weighting, not causal clinical importance."
        ),
    )


# ---------------------------------------------------------------------------
# Classical: Random Forest — Gini impurity importance
# ---------------------------------------------------------------------------

def _compute_random_forest_importance(
    model: RandomForestDiseaseClassifier,
    feature_names: List[str],
) -> ExplainabilityResult:
    """
    Gini (impurity-based) feature importance from the fitted Random Forest.

    Each score is the mean decrease in impurity across all trees, normalized
    to sum to 1.  This is a TRAINING-DATA measure and may over-weight
    high-cardinality features.
    """
    importances = model.model.feature_importances_
    scores = importances[: len(feature_names)]
    features = _build_feature_list(feature_names, scores)

    return ExplainabilityResult(
        model_id=model.model_id,
        model_name=model.model_name,
        model_type=model.model_type,
        method_name="Gini Impurity Feature Importance",
        method_description=(
            "Random Forest impurity-based feature importance measures the mean "
            "decrease in Gini impurity weighted by the fraction of samples reaching "
            "each split node, averaged across all trees in the ensemble. "
            "Scores are normalized to sum to 1.0. "
            "This is a training-data measure and may over-weight high-cardinality "
            "or correlated features."
        ),
        features=features,
        quantum_sensitivity=None,
        interpretation_note=(
            "Impurity-based importance is computed from the fitted Random Forest "
            "on the PCA-compressed training data. "
            "It reflects tree-split utility, not causal clinical relevance."
        ),
    )


# ---------------------------------------------------------------------------
# Classical: SVM — permutation importance
# ---------------------------------------------------------------------------

def _compute_permutation_importance(
    model: BaseDiseaseClassifier,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: List[str],
) -> ExplainabilityResult:
    """
    Model-agnostic permutation importance evaluated on the held-out test set.

    For each feature, column values are randomly shuffled and the ROC-AUC drop
    is measured over 5 repetitions.  A larger drop indicates higher importance
    for the model's predictions.
    """
    perm_res = permutation_importance(
        model.model,
        X_test,
        y_test,
        n_repeats=5,
        random_state=42,
        scoring="roc_auc",
    )
    scores = np.maximum(0, perm_res.importances_mean[: len(feature_names)])
    features = _build_feature_list(feature_names, scores)

    return ExplainabilityResult(
        model_id=model.model_id,
        model_name=model.model_name,
        model_type=model.model_type,
        method_name="Permutation Importance (ROC-AUC Drop)",
        method_description=(
            "Permutation importance is a model-agnostic method that measures the "
            "mean ROC-AUC decrease when each feature's values are randomly permuted "
            "across the held-out test set (5 repetitions, random seed 42). "
            "A larger drop indicates that the model relies more heavily on that "
            "feature for discrimination. "
            "Negative values are clipped to zero."
        ),
        features=features,
        quantum_sensitivity=None,
        interpretation_note=(
            "Permutation importance is evaluated on the held-out test split. "
            "It reflects the model's dependence on each feature but is not a "
            "causal attribution."
        ),
    )


# ---------------------------------------------------------------------------
# Quantum: VQC — finite-difference feature sensitivity
# ---------------------------------------------------------------------------

def _compute_quantum_sensitivity(
    vqc_model: VariationalQuantumClassifier,
    X_test: np.ndarray,
    feature_names: List[str],
    pca_components: Optional[np.ndarray] = None,
    original_feature_names: Optional[List[str]] = None,
    delta: float = 0.05,
) -> ExplainabilityResult:
    """
    Finite-difference quantum feature sensitivity for VQC.

    For each quantum-encoded feature (PCA component), we measure:
      sensitivity_j = mean_i  |P(+|x_i + δ·e_j) − P(+|x_i − δ·e_j)| / (2δ)

    where P(+|x) is the VQC positive-class probability, δ is the perturbation
    step, and the average is over a subsample of test points.

    This is a CIRCUIT SENSITIVITY measure, not a SHAP value or gradient
    attribution.  It reflects how much the circuit output changes with small
    input perturbations, not the causal contribution of the original feature.
    """
    n_features = X_test.shape[1]
    # Sample up to 25 test points for efficient sensitivity evaluation
    sample_indices = np.linspace(0, len(X_test) - 1, min(len(X_test), 25), dtype=int)
    X_sample = X_test[sample_indices]

    sensitivities = np.zeros(n_features, dtype=np.float64)

    for j in range(n_features):
        X_plus = X_sample.copy()
        X_minus = X_sample.copy()
        X_plus[:, j] = np.clip(X_plus[:, j] + delta, 0.0, np.pi)
        X_minus[:, j] = np.clip(X_minus[:, j] - delta, 0.0, np.pi)

        p_plus = vqc_model.predict_proba(X_plus)[:, 1]
        p_minus = vqc_model.predict_proba(X_minus)[:, 1]
        grad = np.abs(p_plus - p_minus) / (2.0 * delta)
        sensitivities[j] = float(np.mean(grad))

    total_sens = np.sum(sensitivities)
    rel_sens = (
        (sensitivities / total_sens) * 100.0 if total_sens > 0
        else np.ones_like(sensitivities) * (100.0 / max(1, n_features))
    )

    q_features: List[ExplainabilityFeature] = [
        ExplainabilityFeature(
            feature_name=f"Qubit {j} ({feature_names[j] if j < len(feature_names) else f'Q{j}'})",
            importance_score=float(round(sensitivities[j], 4)),
            relative_percentage=float(round(rel_sens[j], 2)),
            direction="positive",
        )
        for j in range(n_features)
    ]
    q_features.sort(key=lambda x: x.importance_score, reverse=True)

    # Back-project through PCA loadings to original feature space
    projected_features: List[ExplainabilityFeature] = []
    if pca_components is not None and original_feature_names is not None:
        loadings = np.abs(pca_components[:n_features, : len(original_feature_names)])
        clinical_importances = sensitivities @ loadings
        total_clin = np.sum(clinical_importances)
        clin_rel = (
            (clinical_importances / total_clin) * 100.0 if total_clin > 0
            else np.zeros_like(clinical_importances)
        )
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
        methodology=(
            f"Finite-difference sensitivity: sensitivity_j = mean_i |P(+|x+δej) − P(+|x−δej)| / 2δ "
            f"(δ={delta}, {len(X_sample)} test samples). "
            "Back-projection to original features uses |PCA loading| weighted sum."
        ),
    )

    return ExplainabilityResult(
        model_id=vqc_model.model_id,
        model_name=vqc_model.model_name,
        model_type=vqc_model.model_type,
        method_name="Finite-Difference Quantum Feature Sensitivity",
        method_description=(
            "Measures the average rate of change in VQC positive-class probability "
            f"with respect to ±{delta}-step perturbations in each quantum-encoded feature "
            "(PCA component).  This is a local sensitivity measure, NOT a SHAP value, "
            "NOT a gradient, and NOT a causal attribution. "
            "Higher sensitivity means the circuit output is more responsive to changes "
            "in that encoded dimension."
        ),
        features=q_features,
        quantum_sensitivity=q_sensitivity_result,
        interpretation_note=(
            "Quantum Feature Sensitivity is computed via finite-difference perturbation "
            "of the parameterized quantum circuit inputs.  It reflects circuit-output "
            "sensitivity, not causal clinical feature importance."
        ),
    )


# ---------------------------------------------------------------------------
# Utility: build a sorted ExplainabilityFeature list
# ---------------------------------------------------------------------------

def _build_feature_list(
    feature_names: List[str],
    scores: np.ndarray,
    directions: Optional[List[str]] = None,
) -> List[ExplainabilityFeature]:
    total = np.sum(scores)
    rel_pct = (scores / total * 100.0) if total > 0 else np.ones_like(scores) * (100.0 / max(1, len(scores)))

    features = []
    for i, name in enumerate(feature_names):
        score = float(scores[i]) if i < len(scores) else 0.0
        pct = float(round(rel_pct[i], 2)) if i < len(rel_pct) else 0.0
        direction = directions[i] if directions and i < len(directions) else ("positive" if score > 0 else "neutral")
        features.append(
            ExplainabilityFeature(
                feature_name=name,
                importance_score=float(round(score, 4)),
                relative_percentage=pct,
                direction=direction,
            )
        )

    features.sort(key=lambda x: x.importance_score, reverse=True)
    return features
