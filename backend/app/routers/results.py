from fastapi import APIRouter, HTTPException

from app.schemas import (
    BenchmarkSummary,
    ExplainabilityResult,
    ModelEvaluationResult,
)
from app.state import app_state

router = APIRouter(tags=["Benchmark Results & Explainability"])


@router.get("/results", response_model=BenchmarkSummary)
async def get_benchmark_summary():
    """Retrieve full comparative benchmark results across all trained models."""
    if app_state.benchmark_summary is None:
        raise HTTPException(
            status_code=404,
            detail="No benchmark results available. Please train models first.",
        )
    return app_state.benchmark_summary


@router.get("/results/{model_id}", response_model=ModelEvaluationResult)
async def get_model_result(model_id: str):
    """Retrieve detailed metrics, confusion matrix, and ROC points for a specific model."""
    if model_id not in app_state.evaluation_results:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' results not found.",
        )
    return app_state.evaluation_results[model_id]


@router.get("/explainability/{model_id}", response_model=ExplainabilityResult)
async def get_model_explainability(model_id: str):
    """Retrieve feature attribution or Quantum Feature Sensitivity for a specific model."""
    if model_id not in app_state.explainability_cache:
        raise HTTPException(
            status_code=404,
            detail=f"Explainability data for model '{model_id}' not found.",
        )
    return app_state.explainability_cache[model_id]
