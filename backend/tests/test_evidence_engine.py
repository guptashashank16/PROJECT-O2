import pytest
from app.evidence.evidence_engine import QuantumEvidenceEngine


def test_quantum_evidence_engine_verdicts():
    # 1. Test QUANTUM_PREFERRED
    v_pref = QuantumEvidenceEngine.evaluate(
        vqc_metrics={"roc_auc": 0.96, "brier_score": 0.05, "inference_time_ms": 12.0},
        best_classical_metrics={"roc_auc": 0.90, "brier_score": 0.06, "inference_time_ms": 1.0},
        vqc_std={"roc_auc": 0.02},
        classical_std={"roc_auc": 0.02},
        noisy_vqc_metrics={"roc_auc": 0.92},
        quantum_resources={"n_qubits": 6, "circuit_depth": 2, "inference_time_ms": 12.0},
        sample_size=569,
    )
    assert v_pref.verdict == "QUANTUM_PREFERRED"

    # 2. Test QUANTUM_COMPETITIVE
    v_comp = QuantumEvidenceEngine.evaluate(
        vqc_metrics={"roc_auc": 0.92, "brier_score": 0.08, "inference_time_ms": 15.0},
        best_classical_metrics={"roc_auc": 0.93, "brier_score": 0.07, "inference_time_ms": 1.0},
        vqc_std={"roc_auc": 0.02},
        classical_std={"roc_auc": 0.02},
        noisy_vqc_metrics={"roc_auc": 0.90},
        quantum_resources={"n_qubits": 6, "circuit_depth": 2, "inference_time_ms": 15.0},
        sample_size=569,
    )
    assert v_comp.verdict == "QUANTUM_COMPETITIVE"

    # 3. Test CLASSICAL_PREFERRED
    v_class = QuantumEvidenceEngine.evaluate(
        vqc_metrics={"roc_auc": 0.70, "brier_score": 0.20, "inference_time_ms": 25.0},
        best_classical_metrics={"roc_auc": 0.94, "brier_score": 0.05, "inference_time_ms": 1.0},
        vqc_std={"roc_auc": 0.08},
        classical_std={"roc_auc": 0.01},
        noisy_vqc_metrics={"roc_auc": 0.60},
        quantum_resources={"n_qubits": 6, "circuit_depth": 2, "inference_time_ms": 25.0},
        sample_size=569,
    )
    assert v_class.verdict == "CLASSICAL_PREFERRED"

    # 4. Test INSUFFICIENT_EVIDENCE
    v_insuf = QuantumEvidenceEngine.evaluate(
        vqc_metrics={"roc_auc": 0.80},
        best_classical_metrics={"roc_auc": 0.80},
        vqc_std={"roc_auc": 0.10},
        classical_std={"roc_auc": 0.10},
        sample_size=15,  # Tiny sample count
    )
    assert v_insuf.verdict == "INSUFFICIENT_EVIDENCE"
