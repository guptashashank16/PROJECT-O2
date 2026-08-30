from typing import Any, Dict, List
import numpy as np
from fastapi import APIRouter, HTTPException

from app.schemas import (
    PatientFeatureAttribution,
    PatientPredictionRequest,
    PatientPredictionResponse,
)
from app.state import app_state

router = APIRouter(tags=["Patient Inference"])


@router.post("/predict", response_model=PatientPredictionResponse)
async def predict_new_patient(request: PatientPredictionRequest):
    """Run real-time inference for a new patient observation using the selected model."""
    if app_state.preprocessor is None or not app_state.preprocessor.column_transformer:
        raise HTTPException(status_code=400, detail="Preprocessing pipeline is not fitted. Please train models first.")

    model_id = request.model_id
    if model_id not in app_state.models:
        # Fallback to first available model
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

        # Generate feature attributions
        attributions: List[PatientFeatureAttribution] = []
        selected_names = app_state.preprocessor.selected_feature_names_
        raw_encoded = transformed["encoded"][0]

        # Top 5 most prominent features
        for i, feat_name in enumerate(selected_names[:6]):
            val = request.features.get(feat_name, "N/A")
            # Calculate standard deviation shift or normalized impact
            feat_score = float(round(float(raw_encoded[i]) if i < len(raw_encoded) else 0.0, 3))
            attributions.append(
                PatientFeatureAttribution(
                    feature_name=feat_name,
                    input_value=val,
                    attribution_score=feat_score,
                    description=f"Standardized normalized value: {feat_score:+.2f}",
                )
            )

        q_state = [float(round(v, 4)) for v in quantum_ready_vec[0].tolist()]

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
            feature_attributions=attributions,
            patient_id=str(request.features.get("patient_id") or request.features.get("id") or "New Patient"),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction pipeline failed: {str(e)}")
