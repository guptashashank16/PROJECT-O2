import numpy as np
import pytest
from app.quantum.noisy_simulator import build_qiskit_aer_noise_model, simulate_noisy_probabilities


def test_noisy_simulation_probabilities():
    ideal_probs = np.array([
        [0.85, 0.15],
        [0.10, 0.90],
        [0.40, 0.60],
    ])
    
    noisy_probs = simulate_noisy_probabilities(ideal_probs, noise_level=0.05, random_seed=42)
    assert noisy_probs.shape == ideal_probs.shape
    # Check probabilities sum to 1.0 per row
    for row in noisy_probs:
        assert abs(row[0] + row[1] - 1.0) < 1e-5


def test_aer_noise_model_builder():
    noise_model, metadata = build_qiskit_aer_noise_model()
    assert isinstance(metadata, dict)
    assert "one_qubit_gate_error" in metadata
