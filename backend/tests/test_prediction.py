import pandas as pd
from app.data.preprocessor import ClinicalPreprocessor
from app.models.classical import LogisticRegressionDiseaseClassifier
from app.schemas import DatasetConfigRequest, PreprocessingRequest


def test_patient_prediction_flow():
    df = pd.DataFrame({
        "patient_id": [f"P_{i}" for i in range(25)],
        "glucose": [80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 95, 105, 115, 125, 135, 145, 155, 165, 175, 185, 195, 85],
        "bmi": [22.0, 24.5, 26.0, 28.5, 30.0, 32.5, 35.0, 37.5, 40.0, 42.5, 45.0, 23.0, 25.0, 27.0, 29.0, 31.0, 33.0, 35.0, 37.0, 39.0, 41.0, 43.0, 24.0, 28.0, 32.0],
        "outcome": ["Positive" if i % 2 == 0 else "Negative" for i in range(25)],
    })

    config = DatasetConfigRequest(
        target_column="outcome",
        positive_class="Positive",
        identifier_columns=["patient_id"],
    )
    params = PreprocessingRequest(n_quantum_features=4)

    preprocessor = ClinicalPreprocessor(config, params)
    X_train, X_test, y_train, y_test, summary = preprocessor.fit_and_split(df)

    model = LogisticRegressionDiseaseClassifier()
    model.fit(X_train, y_train)

    # Transform single patient observation
    patient = {"glucose": 145, "bmi": 33.5}
    trans = preprocessor.transform_single(patient)
    quantum_vec = trans["quantum_ready"]

    probs = model.predict_proba(quantum_vec)[0]
    assert len(probs) == 2
    assert 0.0 <= probs[0] <= 1.0
    assert 0.0 <= probs[1] <= 1.0
