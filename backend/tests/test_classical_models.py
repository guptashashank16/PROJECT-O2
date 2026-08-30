import numpy as np
from app.models.classical import (
    LogisticRegressionDiseaseClassifier,
    RandomForestDiseaseClassifier,
    SVMDiseaseClassifier,
)


def test_classical_classifiers_fit_predict():
    np.random.seed(42)
    X = np.random.uniform(0, np.pi, size=(30, 4))
    y = (X[:, 0] + X[:, 1] > np.pi).astype(int)

    models = [
        LogisticRegressionDiseaseClassifier(random_state=42),
        RandomForestDiseaseClassifier(random_state=42),
        SVMDiseaseClassifier(random_state=42),
    ]

    for model in models:
        model.fit(X, y)
        assert model.is_fitted
        assert model.training_time_seconds >= 0.0

        preds = model.predict(X[:5])
        assert len(preds) == 5
        assert set(preds).issubset({0, 1})

        probs = model.predict_proba(X[:5])
        assert probs.shape == (5, 2)
        # Verify probability sum equals 1
        assert np.allclose(probs.sum(axis=1), 1.0)
