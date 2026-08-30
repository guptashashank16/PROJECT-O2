from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_api_list_samples_and_load():
    # 1. List samples
    samples_res = client.get("/api/dataset/samples")
    assert samples_res.status_code == 200
    samples = samples_res.json()
    assert len(samples) > 0

    # 2. Load breast cancer sample
    load_res = client.post("/api/dataset/load-sample?sample_id=breast_cancer_wisconsin")
    assert load_res.status_code == 200
    profile = load_res.json()
    assert profile["total_rows"] > 0
    assert profile["suggested_target"] == "diagnosis"

    # 3. Configure dataset
    config_payload = {
        "target_column": "diagnosis",
        "positive_class": "M",
        "identifier_columns": ["id"],
        "excluded_features": [],
        "problem_type": "binary_classification",
    }
    config_res = client.post("/api/dataset/configure", json=config_payload)
    assert config_res.status_code == 200

    # 4. Preprocess
    prep_res = client.post("/api/preprocess", json={"test_split_ratio": 0.2, "n_quantum_features": 4})
    assert prep_res.status_code == 200
    prep_data = prep_res.json()
    assert prep_data["quantum_feature_count"] == 4
    assert len(prep_data["pipeline_steps"]) == 4

    # 5. Status check
    status_res = client.get("/api/training/status")
    assert status_res.status_code == 200
