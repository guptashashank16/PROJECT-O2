import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.state import app_state
from app.data.preprocessor import ClinicalPreprocessor
from app.models.classical import LogisticRegressionDiseaseClassifier, RandomForestDiseaseClassifier
from app.models.vqc import VariationalQuantumClassifier
from app.schemas import DatasetConfigRequest, PreprocessingRequest, QuantumModelConfig, WhatIfRequest

client = TestClient(app)


def setup_sample_trained_state():
    np.random.seed(42)
    df = pd.DataFrame({
        "id": [f"ID_{i}" for i in range(40)],
        "radius_mean": np.random.uniform(10, 25, 40),
        "texture_mean": np.random.uniform(10, 30, 40),
        "perimeter_mean": np.random.uniform(60, 150, 40),
        "area_mean": np.random.uniform(300, 1500, 40),
        "diagnosis": ["M" if i % 2 == 0 else "B" for i in range(40)],
    })
    
    app_state.raw_dataset = df.copy()
    app_state.dataset_name = "test_breast_cancer"
    app_state.config = DatasetConfigRequest(
        target_column="diagnosis",
        positive_class="M",
        identifier_columns=["id"],
    )
    app_state.preprocessing_params = PreprocessingRequest(
        n_quantum_features=4,
        test_split_ratio=0.25,
    )
    
    prep = ClinicalPreprocessor(app_state.config, app_state.preprocessing_params)
    X_train, X_test, y_train, y_test, summary = prep.fit_and_split(df)
    
    app_state.preprocessor = prep
    app_state.X_train = X_train
    app_state.X_test = X_test
    app_state.y_train = y_train
    app_state.y_test = y_test
    app_state.preprocessing_summary = summary
    
    # Train LR and RF models
    lr = LogisticRegressionDiseaseClassifier()
    lr.fit(X_train, y_train)
    
    rf = RandomForestDiseaseClassifier(random_state=42)
    rf.fit(X_train, y_train)
    
    app_state.trained_models = {
        "logistic_regression": lr,
        "random_forest": rf,
    }


def test_whatif_endpoint():
    setup_sample_trained_state()
    
    base_features = {
        "radius_mean": 15.0,
        "texture_mean": 20.0,
        "perimeter_mean": 95.0,
        "area_mean": 650.0,
    }
    
    payload = {
        "base_features": base_features,
        "perturbations": [
            {"feature_name": "radius_mean", "new_value": 22.0},
            {"feature_name": "area_mean", "new_value": 1200.0},
        ]
    }
    
    res = client.post("/api/whatif/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert "logistic_regression" in data["models"]
    assert "random_forest" in data["models"]
    assert "disclaimer" in data
    assert "observational" in data["disclaimer"].lower() or "not a causal" in data["disclaimer"].lower()


def test_disagreement_endpoint():
    setup_sample_trained_state()
    
    res = client.get("/api/disagreement/analysis")
    assert res.status_code == 200
    data = res.json()
    assert "total_test_samples" in data
    assert data["total_test_samples"] == len(app_state.X_test)
    assert "disagreement_rate" in data
    assert "samples" in data
    assert len(data["samples"]) == len(app_state.X_test)
    assert "disclaimer" in data


def test_utility_report_endpoints():
    setup_sample_trained_state()
    
    # JSON report
    res = client.get("/api/report/quantum-utility")
    assert res.status_code == 200
    report = res.json()
    assert "platform_version" in report
    assert "dataset_name" in report
    assert "benchmark_verdict" in report
    assert "methodological_disclaimers" in report
    assert len(report["methodological_disclaimers"]) > 0
    
    # CSV export
    csv_res = client.get("/api/report/export-csv")
    assert csv_res.status_code == 200
    assert csv_res.headers["content-type"].startswith("text/csv")
    content = csv_res.text
    assert "Model ID" in content
    assert "Accuracy" in content
    
    # Experiment metadata
    meta_res = client.get("/api/report/experiment-metadata")
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert "evaluation_framework" in meta
    assert "stratified_5_fold_cv" in meta["evaluation_framework"]
