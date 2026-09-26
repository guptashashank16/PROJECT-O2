"""
Patient Inference Router — Q-CARE Platform
==========================================
Provides real-time inference for a single patient observation through
the fitted preprocessing + PCA + model pipeline.

IMPORTANT: Feature Values displayed are TRANSFORMED MODEL INPUTS,
NOT attribution scores or causal contributions.
"""
from typing import Any, Dict, List
import numpy as np
from fastapi import APIRouter, Depends, HTTPException

from app.auth.rbac import UserRecord, require_permission
from app.schemas import (
    PatientFeatureValue,
    PatientPredictionRequest,
    PatientPredictionResponse,
)
from app.security.audit import audit_logger
from app.state import app_state

router = APIRouter(tags=["Patient Inference"])


@router.post("/predict", response_model=PatientPredictionResponse)
async def predict_new_patient(
    request: PatientPredictionRequest,
    user: UserRecord = Depends(require_permission("prediction:run")),
):
    """
    Run real-time inference for a new patient observation using the selected model.

    The feature_values field contains TRANSFORMED/NORMALIZED model inputs,
    NOT attribution scores.
    """
    if app_state.preprocessor is None or not app_state.preprocessor.column_transformer:
        raise HTTPException(
            status_code=400,
            detail="Preprocessing pipeline is not fitted. Please train models first.",
        )

    model_id = request.model_id
    if model_id not in app_state.models:
        if not app_state.models:
            raise HTTPException(status_code=400, detail="No trained models available for inference.")
        model_id = list(app_state.models.keys())[0]

    model = app_state.models[model_id]

    try:
        # Pass raw patient input through fitted preprocessing + PCA pipeline
        transformed = app_state.preprocessor.transform_single(request.features)
        quantum_ready_vec = transformed["quantum_ready"]

        # Run inference
        probs = model.predict_proba(quantum_ready_vec)[0]
        p_neg = float(round(probs[0], 4))
        p_pos = float(round(probs[1], 4))

        predicted_idx = 1 if p_pos >= 0.5 else 0
        predicted_class_label = (
            app_state.preprocessor.positive_class_label
            if predicted_idx == 1
            else app_state.preprocessor.negative_class_label
        )

        # Risk Stratification
        if p_pos >= 0.70:
            risk_level = "High Risk"
        elif p_pos >= 0.35:
            risk_level = "Moderate Risk"
        else:
            risk_level = "Low Risk"

        confidence = float(round(max(p_pos, p_neg) * 100, 1))

        # ---------------------------------------------------------------
        # Feature Values — TRANSFORMED MODEL INPUTS, not attributions
        # ---------------------------------------------------------------
        feature_values: List[PatientFeatureValue] = []
        selected_names = app_state.preprocessor.selected_feature_names_
        raw_encoded = transformed["encoded"][0]

        for i, feat_name in enumerate(selected_names[:6]):
            raw_val = request.features.get(feat_name, "N/A")
            transformed_val = float(raw_encoded[i]) if i < len(raw_encoded) else 0.0
            feature_values.append(
                PatientFeatureValue(
                    feature_name=feat_name,
                    raw_input_value=raw_val,
                    raw_value=raw_val,
                    transformed_value=round(transformed_val, 3),
                    description=(
                        f"Standardized model input value: {transformed_val:+.3f} "
                        "(mean-centred, unit-variance after preprocessing). "
                        "This is NOT an attribution score."
                    ),
                )
            )

        q_state = [float(round(v, 4)) for v in quantum_ready_vec[0].tolist()]

        audit_logger.log(
            user.username, user.role.value, "PREDICT", "SUCCESS",
            f"Inference with {model.model_id}: {risk_level} ({p_pos:.2f})",
        )

        return PatientPredictionResponse(
            model_id=model.model_id,
            model_name=model.model_name,
            model_type=model.model_type,
            predicted_class=str(predicted_idx),
            predicted_label=predicted_class_label,
            probability_positive=p_pos,
            probability_negative=p_neg,
            risk_level=risk_level,
            confidence=confidence,
            quantum_features_state=q_state,
            feature_values=feature_values,
            feature_attributions=[],
            patient_id=str(
                request.features.get("patient_id")
                or request.features.get("id")
                or "New Patient"
            ),
        )

    except Exception as e:
        audit_logger.log(user.username, user.role.value, "PREDICT", "FAILED", str(e))
        raise HTTPException(status_code=400, detail=f"Prediction pipeline failed: {str(e)}")
