from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth.rbac import UserRecord, require_permission
from app.experiments.schemas import (
    ExperimentComparisonResponse,
    ExperimentCreateRequest,
    ExperimentDetail,
    ExperimentSummary,
    ResourceProfile,
)
from app.experiments.service import experiment_service
from app.jobs.manager import job_manager
from app.quantum.registry import QuantumModelMetadata, QuantumModelRegistry
from app.schemas import BenchmarkSummary, QuantumUtilityReport, TrainingStatusResponse

router = APIRouter(tags=["Experiment Registry & Orchestration"])


class ExperimentComparePayload(BaseModel):
    experiment_ids: List[str]


@router.get("/experiments", response_model=List[ExperimentSummary])
async def list_experiments(
    user: UserRecord = Depends(require_permission("experiment:view")),
):
    """List all registered research experiments."""
    return experiment_service.list_experiments()


@router.post("/experiments", response_model=ExperimentDetail, status_code=status.HTTP_201_CREATED)
async def create_experiment(
    req: ExperimentCreateRequest,
    user: UserRecord = Depends(require_permission("experiment:create")),
):
    """Create a new isolated research experiment."""
    return experiment_service.create_experiment(req, user_id=user.username)


@router.get("/experiments/active", response_model=ExperimentDetail)
async def get_active_experiment(
    user: UserRecord = Depends(require_permission("experiment:view")),
):
    """Retrieve the currently active experiment session."""
    exp = experiment_service.get_active_experiment()
    if not exp:
        raise HTTPException(status_code=404, detail="No active experiment found.")
    return exp


@router.post("/experiments/active/{experiment_id}", response_model=ExperimentDetail)
async def set_active_experiment(
    experiment_id: str,
    user: UserRecord = Depends(require_permission("experiment:view")),
):
    """Set the active experiment session by ID."""
    exp = experiment_service.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    experiment_service.repo.set_active_id(experiment_id)
    return exp


@router.get("/experiments/{experiment_id}", response_model=ExperimentDetail)
async def get_experiment(
    experiment_id: str,
    user: UserRecord = Depends(require_permission("experiment:view")),
):
    """Retrieve complete metadata, results, and configuration for an experiment."""
    exp = experiment_service.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return exp


@router.delete("/experiments/{experiment_id}")
async def delete_experiment(
    experiment_id: str,
    user: UserRecord = Depends(require_permission("experiment:create")),
):
    """Delete an experiment and its artifacts."""
    deleted = experiment_service.delete_experiment(experiment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found.")
    return {"status": "success", "message": f"Experiment '{experiment_id}' deleted."}


@router.get("/experiments/{experiment_id}/status", response_model=TrainingStatusResponse)
async def get_experiment_job_status(
    experiment_id: str,
    user: UserRecord = Depends(require_permission("experiment:view")),
):
    """Retrieve real-time execution stage and progress for an experiment."""
    return job_manager.get_status(experiment_id)


@router.get("/experiments/{experiment_id}/results", response_model=BenchmarkSummary)
async def get_experiment_results(
    experiment_id: str,
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Retrieve benchmark summary and metrics for an experiment."""
    exp = experiment_service.get_experiment(experiment_id)
    if not exp or not exp.benchmark_summary:
        raise HTTPException(status_code=404, detail=f"Benchmark results for experiment '{experiment_id}' are not ready.")
    return exp.benchmark_summary


@router.get("/experiments/{experiment_id}/report", response_model=QuantumUtilityReport)
async def get_experiment_report(
    experiment_id: str,
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Retrieve quantum utility report for an experiment."""
    exp = experiment_service.get_experiment(experiment_id)
    if not exp or not exp.utility_report:
        raise HTTPException(status_code=404, detail=f"Utility report for experiment '{experiment_id}' is not ready.")
    return exp.utility_report


@router.get("/experiments/{experiment_id}/resource-profile", response_model=ResourceProfile)
async def get_experiment_resource_profile(
    experiment_id: str,
    user: UserRecord = Depends(require_permission("experiment:view")),
):
    """Retrieve computational resource profile for an experiment."""
    exp = experiment_service.get_experiment(experiment_id)
    if not exp or not exp.resource_profile:
        raise HTTPException(status_code=404, detail=f"Resource profile for experiment '{experiment_id}' is not ready.")
    return exp.resource_profile


@router.post("/experiments/compare", response_model=ExperimentComparisonResponse)
async def compare_experiments(
    payload: ExperimentComparePayload,
    user: UserRecord = Depends(require_permission("experiment:view")),
):
    """Empirical side-by-side comparison across multiple experiments."""
    try:
        return experiment_service.compare_experiments(payload.experiment_ids)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to compare experiments: {str(e)}")


@router.get("/quantum/models", response_model=List[QuantumModelMetadata], tags=["Quantum Architecture"])
async def list_quantum_models():
    """Discover available and planned quantum classifier models from the research registry."""
    return QuantumModelRegistry.list_all_models()
