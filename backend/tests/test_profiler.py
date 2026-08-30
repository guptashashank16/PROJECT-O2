import pandas as pd
from app.data.profiler import DatasetProfiler


def test_dataset_profiler_basic():
    data = {
        "patient_id": ["P1", "P2", "P3", "P4", "P5", "P6"],
        "age": [45, 52, 38, 60, 49, 55],
        "sex": ["M", "F", "M", "F", "M", "F"],
        "blood_pressure": [120, 135, None, 140, 125, 130],
        "diagnosis": ["Malignant", "Benign", "Malignant", "Benign", "Benign", "Malignant"],
    }
    df = pd.DataFrame(data)
    profiler = DatasetProfiler(df, dataset_name="Test Clinic")
    profile = profiler.profile(target_column="diagnosis")

    assert profile.total_rows == 6
    assert profile.total_columns == 5
    assert profile.missing_values_total == 1
    assert "patient_id" in profile.suggested_identifiers
    assert profile.suggested_target == "diagnosis"
    assert profile.suggested_positive_class == "Malignant"

    # Verify column profile inferred types
    types = {c.name: c.inferred_type for c in profile.columns}
    assert types["patient_id"] == "identifier"
    assert types["age"] == "numerical"
    assert types["sex"] == "categorical"
    assert types["blood_pressure"] == "numerical"


def test_profiler_constant_column_detection():
    data = {
        "id": [1, 2, 3, 4],
        "constant_feature": [10.0, 10.0, 10.0, 10.0],
        "target": ["Yes", "No", "Yes", "No"],
    }
    df = pd.DataFrame(data)
    profiler = DatasetProfiler(df)
    profile = profiler.profile()

    assert "constant_feature" in profile.constant_columns
