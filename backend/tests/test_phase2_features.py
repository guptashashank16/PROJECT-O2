import io
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.auth.rbac import UserRecord, UserRole, user_store
from app.auth.security import create_access_token, decode_access_token
from app.config import settings
from app.experiments.schemas import ExperimentCreateRequest, JobStatus
from app.experiments.service import experiment_service
from app.jobs.manager import job_manager
from app.main import app
from app.quantum.registry import QuantumModelRegistry

client = TestClient(app)


def get_auth_header(role: UserRole = UserRole.RESEARCHER) -> dict:
    username = "test_researcher" if role == UserRole.RESEARCHER else "test_viewer"
    token = create_access_token({"sub": username, "role": role.value})
    return {"Authorization": f"Bearer {token}"}


def test_jwt_secret_loaded_and_token_valid():
    token = create_access_token({"sub": "researcher", "role": "RESEARCHER"})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "researcher"
    assert payload["role"] == "RESEARCHER"


def test_quantum_model_registry_metadata():
    models = QuantumModelRegistry.list_all_models()
    assert len(models) >= 3
    
    vqc_meta = next(m for m in models if m.model_id == "vqc")
    assert vqc_meta.implemented is True
    assert vqc_meta.status == "ACTIVE_BENCHMARK"
    
    qsvm_meta = next(m for m in models if m.model_id == "qsvm")
    assert qsvm_meta.implemented is False
    assert qsvm_meta.status == "PLANNED_EXTENSION"


def test_experiment_service_crud_and_comparison():
    # 1. Create Experiment
    exp = experiment_service.create_experiment(
        ExperimentCreateRequest(
            experiment_name="Test Experiment Alpha",
            dataset_name="breast_cancer_wisconsin",
            description="Testing registry persistence",
        ),
        user_id="test_researcher",
    )
    assert exp.experiment_id.startswith("exp-")
    assert exp.dataset_rows > 0
    assert exp.status == JobStatus.CREATED

    # 2. Get Experiment
    retrieved = experiment_service.get_experiment(exp.experiment_id)
    assert retrieved is not None
    assert retrieved.experiment_name == "Test Experiment Alpha"

    # 3. List Experiments
    all_exps = experiment_service.list_experiments()
    assert len(all_exps) > 0
    assert any(e.experiment_id == exp.experiment_id for e in all_exps)

    # 4. Compare Experiments
    comp = experiment_service.compare_experiments([exp.experiment_id])
    assert len(comp.experiments) == 1
    assert comp.experiments[0].experiment_id == exp.experiment_id
    assert "neutral_empirical_notes" in comp.model_dump()


def test_job_manager_concurrency_protection():
    exp_id = "exp-test-concurrency"
    job_manager.start_job(exp_id, "job-1")
    
    assert job_manager.is_running(exp_id) is True
    status = job_manager.get_status(exp_id)
    assert status.is_training is True

    # Duplicate job start should raise HTTP 409
    with pytest.raises(Exception) as exc_info:
        job_manager.start_job(exp_id, "job-2")
    assert "409" in str(exc_info.value) or "already active" in str(exc_info.value)

    # Complete job
    job_manager.complete_job(exp_id, success=True)
    assert job_manager.is_running(exp_id) is False
    status_done = job_manager.get_status(exp_id)
    assert status_done.is_training is False


def test_rbac_endpoint_enforcement():
    viewer_headers = get_auth_header(UserRole.VIEWER)
    researcher_headers = get_auth_header(UserRole.RESEARCHER)

    # 1. Viewer cannot trigger training (requires model:train)
    train_payload = {
        "quantum_config": {
            "n_qubits": 4,
            "feature_map": "ZZFeatureMap",
            "ansatz": "RealAmplitudes",
            "ansatz_layers": 1,
            "optimizer": "COBYLA",
            "max_iterations": 10,
            "fast_demo_mode": True,
        },
        "classical_config": {
            "logistic_regression": True,
            "random_forest": False,
            "svm": False,
        }
    }
    res_viewer_train = client.post("/api/train", json=train_payload, headers=viewer_headers)
    assert res_viewer_train.status_code == 403

    # 2. Viewer cannot upload dataset (requires dataset:upload)
    csv_content = b"feature1,feature2,target\n1.0,2.0,1\n3.0,4.0,0\n" * 10
    files = {"file": ("test.csv", io.BytesIO(csv_content), "text/csv")}
    res_viewer_upload = client.post("/api/dataset/upload", files=files, headers=viewer_headers)
    assert res_viewer_upload.status_code == 403

    # 3. Viewer can view experiments and results (permitted read-only)
    res_viewer_list = client.get("/api/experiments", headers=viewer_headers)
    assert res_viewer_list.status_code == 200


def test_data_upload_hardening():
    researcher_headers = get_auth_header(UserRole.RESEARCHER)

    # 1. Reject non-CSV files
    txt_file = {"file": ("malicious.exe", io.BytesIO(b"binary content"), "application/octet-stream")}
    res_non_csv = client.post("/api/dataset/upload", files=txt_file, headers=researcher_headers)
    assert res_non_csv.status_code == 400

    # 2. Reject empty CSV
    empty_file = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    res_empty = client.post("/api/dataset/upload", files=empty_file, headers=researcher_headers)
    assert res_empty.status_code == 400

    # 3. Reject tiny CSV (<15 rows)
    tiny_content = b"a,b,diagnosis\n1,2,M\n3,4,B\n"
    tiny_file = {"file": ("tiny.csv", io.BytesIO(tiny_content), "text/csv")}
    res_tiny = client.post("/api/dataset/upload", files=tiny_file, headers=researcher_headers)
    assert res_tiny.status_code == 400
    assert "minimum of 15 rows" in res_tiny.json()["detail"]


def test_experiments_api_endpoints():
    researcher_headers = get_auth_header(UserRole.RESEARCHER)

    # List experiments
    res = client.get("/api/experiments", headers=researcher_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

    first_id = data[0]["experiment_id"]

    # Get experiment detail
    res_detail = client.get(f"/api/experiments/{first_id}", headers=researcher_headers)
    assert res_detail.status_code == 200
    exp_data = res_detail.json()
    assert exp_data["experiment_id"] == first_id

    # Quantum model catalog
    res_models = client.get("/api/quantum/models")
    assert res_models.status_code == 200
    models = res_models.json()
    assert any(m["model_id"] == "vqc" for m in models)


def test_quantum_backends_and_qasm_export():
    researcher_headers = get_auth_header(UserRole.RESEARCHER)

    # 1. List quantum execution targets
    res_backends = client.get("/api/quantum/backends")
    assert res_backends.status_code == 200
    backends = res_backends.json()
    assert len(backends) >= 4
    backend_ids = [b["backend_id"] for b in backends]
    assert "local_statevector" in backend_ids
    assert "local_aer_noisy" in backend_ids
    assert "ibm_runtime_simulator" in backend_ids

    # 2. OpenQASM 3.0 export
    qasm_payload = {
        "n_qubits": 4,
        "feature_map": "ZZFeatureMap",
        "ansatz": "RealAmplitudes",
        "ansatz_layers": 2,
    }
    res_qasm = client.post("/api/quantum/export-qasm", json=qasm_payload, headers=researcher_headers)
    assert res_qasm.status_code == 200
    qasm_data = res_qasm.json()
    assert qasm_data["qasm_version"] == "OpenQASM 3.0"
    assert qasm_data["n_qubits"] == 4
    assert "OPENQASM 3.0" in qasm_data["qasm_code"]
    assert "qubit[4]" in qasm_data["qasm_code"] or "qreg" in qasm_data["qasm_code"] or "h q" in qasm_data["qasm_code"]

    # 3. IBM token validation format checks
    res_token_empty = client.post("/api/quantum/validate-ibm-token", json={"token": ""}, headers=researcher_headers)
    assert res_token_empty.status_code == 200
    assert res_token_empty.json()["valid"] is False

    res_token_valid = client.post("/api/quantum/validate-ibm-token", json={"token": "a" * 64}, headers=researcher_headers)
    assert res_token_valid.status_code == 200
    assert res_token_valid.json()["valid"] is True
