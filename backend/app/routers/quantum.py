from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.rbac import require_permission
from app.auth.security import get_current_user
from app.experiments.service import get_experiment_service
from app.quantum.backends import (
    IBMTokenValidationRequest,
    IBMTokenValidationResponse,
    QASMExportRequest,
    QASMExportResponse,
    QuantumBackendInfo,
    QuantumBackendManager,
)
from app.quantum.registry import QuantumModelMetadata, QuantumModelRegistry
from app.schemas import User

router = APIRouter(prefix="/quantum", tags=["quantum"])


@router.get("/models", response_model=List[QuantumModelMetadata])
async def list_quantum_models():
    """Discover registered quantum machine learning models and their research status."""
    return QuantumModelRegistry.list_all_models()


@router.get("/backends", response_model=List[QuantumBackendInfo])
async def list_quantum_backends():
    """List available local simulators and cloud-hosted quantum hardware backends."""
    return QuantumBackendManager.get_standard_backends()


@router.post(
    "/validate-ibm-token",
    response_model=IBMTokenValidationResponse,
    dependencies=[Depends(require_permission("model:configure"))],
)
async def validate_ibm_quantum_token(
    request: IBMTokenValidationRequest,
    current_user: User = Depends(get_current_user),
):
    """Validate an IBM Quantum API token and discover accessible QPUs in the IBM Quantum fleet."""
    return QuantumBackendManager.validate_ibm_token(token=request.token, instance=request.instance)


@router.post(
    "/export-qasm",
    response_model=QASMExportResponse,
    dependencies=[Depends(require_permission("evidence:view"))],
)
async def export_circuit_qasm(
    request: QASMExportRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate and export OpenQASM 3.0 code for a given VQC configuration."""
    try:
        return QuantumBackendManager.generate_qasm3_circuit(
            n_qubits=request.n_qubits,
            feature_map=request.feature_map,
            ansatz=request.ansatz,
            ansatz_layers=request.ansatz_layers,
            weights=request.weights,
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate OpenQASM 3.0 export: {str(err)}",
        )


@router.get(
    "/experiments/{experiment_id}/qasm",
    response_model=QASMExportResponse,
    dependencies=[Depends(require_permission("evidence:view"))],
)
async def export_experiment_qasm(
    experiment_id: str,
    current_user: User = Depends(get_current_user),
):
    """Export OpenQASM 3.0 circuit code for a trained experiment's quantum model."""
    exp_service = get_experiment_service()
    exp = exp_service.get_experiment(experiment_id)
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experiment '{experiment_id}' not found.",
        )

    q_conf = exp.quantum_config
    n_qubits = q_conf.get("n_qubits", 4)
    feature_map = q_conf.get("feature_map", "ZZFeatureMap")
    ansatz = q_conf.get("ansatz", "RealAmplitudes")
    ansatz_layers = q_conf.get("ansatz_layers", 2)

    return QuantumBackendManager.generate_qasm3_circuit(
        n_qubits=n_qubits,
        feature_map=feature_map,
        ansatz=ansatz,
        ansatz_layers=ansatz_layers,
    )
