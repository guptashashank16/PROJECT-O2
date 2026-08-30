import numpy as np
from app.models.vqc import VariationalQuantumClassifier
from app.schemas import QuantumModelConfig


def test_vqc_circuit_and_training():
    config = QuantumModelConfig(
        n_qubits=4,
        feature_map="ZZFeatureMap",
        ansatz="RealAmplitudes",
        ansatz_layers=1,
        optimizer="COBYLA",
        max_iterations=8,
        fast_demo_mode=True,
    )

    vqc = VariationalQuantumClassifier(config=config, random_state=42)
    assert vqc.full_circuit is not None
    assert vqc.n_qubits == 4
    assert len(vqc.ansatz_circuit.parameters) > 0

    # Create synthetic quantum-ready data in [0, pi]
    np.random.seed(42)
    X = np.random.uniform(0, np.pi, size=(12, 4))
    y = np.array([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1])

    vqc.fit(X, y)
    assert vqc.is_fitted
    assert vqc.weights_ is not None
    assert vqc.training_time_seconds > 0

    # Test prediction
    preds = vqc.predict(X[:4])
    assert len(preds) == 4
    assert set(preds).issubset({0, 1})

    # Test probabilities
    probs = vqc.predict_proba(X[:4])
    assert probs.shape == (4, 2)
    assert np.all(probs >= 0.0) and np.all(probs <= 1.0)
    assert np.allclose(probs.sum(axis=1), 1.0)
