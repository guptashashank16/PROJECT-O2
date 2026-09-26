"""
What-If Analysis Router — Q-CARE Platform
==========================================
Allows a researcher to perturb one or more input features and observe how
model output probabilities change across all trained models.

DISCLAIMER: This is a sensitivity/what-if experiment showing how model
outputs respond to feature perturbations. It is NOT causal medical inference.
"""
from typing import Any, Dict, List
import numpy as np
from fastapi import APIRouter, Depends, HTTPException

from app.auth.rbac import UserRecord, require_permission
from app.schemas import (
    WhatIfFeatureChange,
    WhatIfModelResult,
    WhatIfRequest,
    WhatIfResponse,
    WhatIfSingleResult,
)
from app.state import app_state

router = APIRouter(tags=["What-If Analysis"])


def _apply_change(
    features: Dict[str, Any],
    change: WhatIfFeatureChange,
) -> Dict[str, Any]:
    """Return a copy of features with the specified change applied."""
    modified = dict(features)
    current = modified.get(change.feature_name)
    if current is None:
        return modified

    try:
        current_float = float(current)
    except (ValueError, TypeError):
        return modified

    if change.delta_type == "percentage":
        modified[change.feature_name] = current_float * (1.0 + change.delta_value / 100.0)
    else:
        modified[change.feature_name] = current_float + change.delta_value

    return modified


def _predict_for_features(features: Dict[str, Any], model_id: str) -> float:
    """Return P(positive) for a given feature dict and model."""
    transformed = app_state.preprocessor.transform_single(features)
    quantum_ready_vec = transformed["quantum_ready"]
    probs = app_state.models[model_id].predict_proba(quantum_ready_vec)[0]
    return float(probs[1])


@router.post("/whatif", response_model=WhatIfResponse)
@router.post("/whatif/analyze", response_model=WhatIfResponse)
async def run_whatif_analysis(
    request: WhatIfRequest,
    user: UserRecord = Depends(require_permission("prediction:run")),
):
    """
    Run a what-if sensitivity experiment.

    For each specified feature change, compute the baseline and modified
    predicted probability across all requested models.

    This is a sensitivity experiment, NOT causal inference.
    """
    if app_state.preprocessor is None or not app_state.models:
        raise HTTPException(
            status_code=400,
            detail="Models not yet trained. Please run training first.",
        )

    available_models = [m for m in request.model_ids if m in app_state.models]
    if not available_models:
        available_models = list(app_state.models.keys())
    if not available_models:
        raise HTTPException(status_code=400, detail="None of the requested models are trained.")

    baseline_probs: Dict[str, float] = {}
    for model_id in available_models:
        try:
            baseline_probs[model_id] = _predict_for_features(request.base_features, model_id)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Baseline prediction failed for {model_id}: {str(e)}",
            )

    changes: List[WhatIfFeatureChange] = list(request.feature_changes or [])
    if request.perturbations:
        for p in request.perturbations:
            orig_val = float(request.base_features.get(p.feature_name, 0.0))
            new_val = float(p.new_value)
            changes.append(
                WhatIfFeatureChange(
                    feature_name=p.feature_name,
                    delta_type="absolute",
                    delta_value=round(new_val - orig_val, 4),
                )
            )

    results: List[WhatIfSingleResult] = []
    all_modified_features: Dict[str, Any] = dict(request.base_features)

    for change in changes:
        modified_features = _apply_change(request.base_features, change)
        all_modified_features[change.feature_name] = modified_features.get(change.feature_name)

        model_results: List[WhatIfModelResult] = []
        for model_id in available_models:
            try:
                mod_prob = _predict_for_features(modified_features, model_id)
                base_prob = baseline_probs[model_id]
                delta = mod_prob - base_prob
                direction = (
                    "increased" if delta > 1e-4
                    else "decreased" if delta < -1e-4
                    else "unchanged"
                )
                model_results.append(
                    WhatIfModelResult(
                        model_id=model_id,
                        model_name=getattr(app_state.models[model_id], "model_name", model_id),
                        baseline_probability=round(base_prob, 4),
                        modified_probability=round(mod_prob, 4),
                        delta=round(delta, 4),
                        direction=direction,
                    )
                )
            except Exception as e:
                model_results.append(
                    WhatIfModelResult(
                        model_id=model_id,
                        model_name=model_id,
                        baseline_probability=round(baseline_probs.get(model_id, 0.0), 4),
                        modified_probability=0.0,
                        delta=0.0,
                        direction="error",
                    )
                )

        results.append(
            WhatIfSingleResult(
                feature_changed=change.feature_name,
                delta_type=change.delta_type,
                delta_value=change.delta_value,
                model_results=model_results,
            )
        )

    # Cross-model summary for all perturbed features applied together
    models_summary: Dict[str, Any] = {}
    for model_id in available_models:
        try:
            base_p = baseline_probs.get(model_id, 0.5)
            mod_p = _predict_for_features(all_modified_features, model_id)
            delta_p = mod_p - base_p
            m_name = getattr(app_state.models[model_id], "model_name", model_id)
            models_summary[model_id] = {
                "model_id": model_id,
                "model_name": m_name,
                "base_probability_positive": round(base_p, 4),
                "perturbed_probability_positive": round(mod_p, 4),
                "delta_probability": round(delta_p, 4),
                "label_changed": (base_p >= 0.5) != (mod_p >= 0.5),
            }
        except Exception:
            pass

    return WhatIfResponse(
        baseline_features=request.base_features,
        modified_features=all_modified_features,
        results=results,
        models=models_summary,
    )
