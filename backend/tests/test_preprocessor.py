import numpy as np
import pandas as pd
from app.data.preprocessor import ClinicalPreprocessor
from app.schemas import DatasetConfigRequest, PreprocessingRequest


def test_preprocessor_pipeline_and_leakage_prevention():
    np.random.seed(42)
    n_samples = 40
    data = {
        "case_id": [f"ID_{i}" for i in range(n_samples)],
        "age": np.random.randint(20, 80, size=n_samples),
        "cholesterol": np.random.normal(200, 30, size=n_samples),
        "smoker": np.random.choice(["Yes", "No", None], size=n_samples),
        "stage": np.random.choice(["Stage I", "Stage II", "Stage III"], size=n_samples),
        "outcome": np.random.choice(["Diseased", "Healthy"], size=n_samples),
    }
    # Introduce random missing values in numerical column
    data["cholesterol"][5] = np.nan
    data["cholesterol"][12] = np.nan

    df = pd.DataFrame(data)

    config = DatasetConfigRequest(
        target_column="outcome",
        positive_class="Diseased",
        identifier_columns=["case_id"],
    )
    params = PreprocessingRequest(
        test_split_ratio=0.25,
        n_quantum_features=4,
        scaler_type="standard",
    )

    preprocessor = ClinicalPreprocessor(config, params, random_state=42)
    X_train, X_test, y_train, y_test, summary = preprocessor.fit_and_split(df)

    assert len(X_train) == 30
    assert len(X_test) == 10
    assert X_train.shape[1] == 4
    assert X_test.shape[1] == 4
    assert not np.isnan(X_train).any()
    assert not np.isnan(X_test).any()

    # Verify bounded range [0, pi] for quantum circuits
    assert np.all(X_train >= -1e-5) and np.all(X_train <= np.pi + 1e-5)
    assert np.all(X_test >= -1e-5) and np.all(X_test <= np.pi + 1e-5)

    # Test single patient inference transform
    sample_patient = {
        "age": 45,
        "cholesterol": 220.0,
        "smoker": "Yes",
        "stage": "Stage II",
    }
    transformed = preprocessor.transform_single(sample_patient)
    assert "quantum_ready" in transformed
    assert transformed["quantum_ready"].shape == (1, 4)
