import numpy as np
from app.evaluation.metrics import calculate_medical_metrics
from app.models.classical import LogisticRegressionDiseaseClassifier


def test_calculate_medical_metrics():
    np.random.seed(42)
    X_train = np.random.uniform(0, np.pi, size=(30, 4))
    y_train = np.array([0, 1] * 15)

    X_test = np.random.uniform(0, np.pi, size=(10, 4))
    y_test = np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])

    model = LogisticRegressionDiseaseClassifier(random_state=42)
    model.fit(X_train, y_train)

    result = calculate_medical_metrics(model, X_test, y_test, ["Healthy", "Diseased"])

    assert result.model_id == "logistic_regression"
    assert 0.0 <= result.metrics.accuracy <= 1.0
    assert 0.0 <= result.metrics.sensitivity <= 1.0
    assert 0.0 <= result.metrics.specificity <= 1.0
    assert 0.0 <= result.metrics.roc_auc <= 1.0
    assert result.confusion_matrix.true_positive >= 0
    assert len(result.roc_curve) > 0
