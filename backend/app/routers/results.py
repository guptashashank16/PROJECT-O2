from fastapi import APIRouter, Depends, HTTPException

from app.auth.rbac import UserRecord, require_permission
from app.experiments.service import experiment_service
from app.schemas import (
    BenchmarkSummary,
    ExplainabilityResult,
    ModelEvaluationResult,
)
from app.state import app_state

router = APIRouter(tags=["Benchmark Results & Explainability"])


@router.get("/results", response_model=BenchmarkSummary)
async def get_benchmark_summary(
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Retrieve full comparative benchmark results across all trained models."""
    if app_state.benchmark_summary is not None:
        return app_state.benchmark_summary
    
    active_exp = experiment_service.get_active_experiment()
    if active_exp and active_exp.benchmark_summary is not None:
        return active_exp.benchmark_summary

    raise HTTPException(
        status_code=404,
        detail="No benchmark results available. Please train models first.",
    )


@router.get("/results/{model_id}", response_model=ModelEvaluationResult)
async def get_model_result(
    model_id: str,
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Retrieve detailed metrics, confusion matrix, and ROC points for a specific model."""
    if model_id in app_state.evaluation_results:
        return app_state.evaluation_results[model_id]

    active_exp = experiment_service.get_active_experiment()
    if active_exp and active_exp.benchmark_summary and model_id in active_exp.benchmark_summary.results:
        return active_exp.benchmark_summary.results[model_id]

    raise HTTPException(
        status_code=404,
        detail=f"Model '{model_id}' results not found.",
    )


@router.get("/explainability/{model_id}", response_model=ExplainabilityResult)
async def get_model_explainability(
    model_id: str,
    user: UserRecord = Depends(require_permission("explainability:view")),
):
    """Retrieve feature attribution or Quantum Feature Sensitivity for a specific model."""
    if model_id in app_state.explainability_cache:
        return app_state.explainability_cache[model_id]

    active_exp = experiment_service.get_active_experiment()
    if active_exp and model_id in active_exp.explainability:
        return active_exp.explainability[model_id]

    raise HTTPException(
        status_code=404,
        detail=f"Explainability data for model '{model_id}' not found.",
    )
