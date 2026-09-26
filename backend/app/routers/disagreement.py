"""
Model Disagreement Analysis Router — Q-CARE Platform
======================================================
For each held-out test sample, compares predicted probabilities between all
trained models and identifies cases where quantum and classical predictions
diverge substantially.

DISCLAIMER: Disagreement between models does NOT constitute evidence of
quantum advantage. It shows where decision boundaries differ.
"""
from typing import Dict, List, Optional
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.rbac import UserRecord, require_permission
from app.schemas import (
    DisagreementAnalysisResponse,
    DisagreementSample,
)
from app.state import app_state

router = APIRouter(tags=["Model Disagreement Analysis"])


@router.get("/disagreement", response_model=DisagreementAnalysisResponse)
@router.get("/disagreement/analysis", response_model=DisagreementAnalysisResponse)
async def run_disagreement_analysis(
    threshold: float = Query(0.15, ge=0.01, le=0.99, description="Minimum pairwise probability difference to flag as disagreement"),
    max_samples: int = Query(200, ge=1, le=500, description="Maximum number of samples to return"),
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """
    Identify test samples where model predicted probabilities diverge substantially.

    Compares P(positive) across all trained models for every held-out test sample.
    Samples are flagged when any pairwise |P_i(+) - P_j(+)| >= threshold.

    This analysis shows WHERE decision boundaries differ, NOT which model is correct.
    """
    if app_state.X_test is None or not app_state.models:
        raise HTTPException(
            status_code=400,
            detail="No trained models or test data available. Please run training first.",
        )

    X_test = app_state.X_test
    y_test = app_state.y_test
    n_samples = len(X_test)

    model_ids = list(app_state.models.keys())

    prob_matrix: Dict[str, np.ndarray] = {}
    for model_id in model_ids:
        model = app_state.models[model_id]
        try:
            proba = model.predict_proba(X_test)[:, 1]
            prob_matrix[model_id] = proba
        except Exception:
            continue

    if not prob_matrix:
        raise HTTPException(status_code=500, detail="All models failed to produce probabilities.")

    available_ids = list(prob_matrix.keys())
    quantum_ids = [m for m in available_ids if app_state.models[m].model_type == "quantum"]
    classical_ids = [m for m in available_ids if app_state.models[m].model_type == "classical"]

    disagreeing_samples: List[DisagreementSample] = []
    total_disagreements = 0

    for i in range(n_samples):
        probs_i = {mid: float(round(prob_matrix[mid][i], 4)) for mid in available_ids}
        preds_i = {mid: int(prob_matrix[mid][i] >= 0.5) for mid in available_ids}

        prob_vals = list(probs_i.values())
        if len(prob_vals) > 1:
            max_disagreement = float(
                max(
                    abs(prob_vals[a] - prob_vals[b])
                    for a in range(len(prob_vals))
                    for b in range(a + 1, len(prob_vals))
                )
            )
        else:
            max_disagreement = 0.0

        is_qc_disagreement = False
        if quantum_ids and classical_ids:
            for qid in quantum_ids:
                for cid in classical_ids:
                    if abs(prob_matrix[qid][i] - prob_matrix[cid][i]) >= threshold:
                        is_qc_disagreement = True
                        break

        if max_disagreement >= threshold:
            total_disagreements += 1
            if len(disagreeing_samples) < max_samples:
                true_lbl = int(y_test[i]) if y_test is not None and i < len(y_test) else None
                disagreeing_samples.append(
                    DisagreementSample(
                        sample_index=i,
                        true_label=true_lbl,
                        model_probabilities=probs_i,
                        model_predictions=preds_i,
                        max_disagreement=round(max_disagreement, 4),
                        is_quantum_classical_disagreement=is_qc_disagreement,
                    )
                )

    disagreeing_samples.sort(key=lambda x: x.max_disagreement, reverse=True)

    qc_disagreement_count = sum(1 for s in disagreeing_samples if s.is_quantum_classical_disagreement)
    avg_disagreement = float(np.mean([s.max_disagreement for s in disagreeing_samples])) if disagreeing_samples else 0.0

    summary_stats: Dict[str, object] = {
        "total_test_samples": n_samples,
        "models_compared": available_ids,
        "quantum_models": quantum_ids,
        "classical_models": classical_ids,
        "disagreement_threshold": threshold,
        "total_disagreements": total_disagreements,
        "quantum_classical_disagreements": qc_disagreement_count,
        "average_disagreement_magnitude": round(avg_disagreement, 4),
    }

    return DisagreementAnalysisResponse(
        total_samples=n_samples,
        disagreement_threshold=threshold,
        disagreeing_samples=disagreeing_samples,
        disagreement_count=total_disagreements,
        disagreement_rate=round(total_disagreements / max(1, n_samples), 4),
        summary_stats=summary_stats,
    )
