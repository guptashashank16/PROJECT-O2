import numpy as np
from app.evaluation.explainability import compute_model_explainability, compute_quantum_sensitivity
from app.models.classical import RandomForestDiseaseClassifier
from app.models.vqc import VariationalQuantumClassifier
from app.schemas import QuantumModelConfig


def test_classical_and_quantum_explainability():
    np.random.seed(42)
    X_train = np.random.uniform(0, np.pi, size=(20, 4))
    y_train = np.array([0, 1] * 10)
    X_test = np.random.uniform(0, np.pi, size=(8, 4))
    y_test = np.array([0, 1] * 4)

    # 1. Classical explainability
    rf = RandomForestDiseaseClassifier(random_state=42)
    rf.fit(X_train, y_train)
    expl_rf = compute_model_explainability(rf, X_test, y_test, ["F1", "F2", "F3", "F4"])
    assert len(expl_rf.features) == 4
    assert expl_rf.model_id == "random_forest"

    # 2. Quantum Feature Sensitivity
    vqc_config = QuantumModelConfig(
        n_qubits=4,
        ansatz_layers=1,
        max_iterations=5,
        fast_demo_mode=True,
    )
    vqc = VariationalQuantumClassifier(config=vqc_config, random_state=42)
    vqc.fit(X_train, y_train)

    pca_components = np.random.normal(0, 1, size=(4, 6))
    orig_names = ["Orig_1", "Orig_2", "Orig_3", "Orig_4", "Orig_5", "Orig_6"]

    expl_vqc = compute_quantum_sensitivity(
        vqc_model=vqc,
        X_test=X_test,
        feature_names=["PC_1", "PC_2", "PC_3", "PC_4"],
        pca_components=pca_components,
        original_feature_names=orig_names,
    )

    assert expl_vqc.model_id == "vqc"
    assert expl_vqc.quantum_sensitivity is not None
    assert len(expl_vqc.quantum_sensitivity.quantum_features) == 4
    assert len(expl_vqc.quantum_sensitivity.projected_original_features) == 6
