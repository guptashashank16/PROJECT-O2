import logging
import numpy as np
from typing import Any, Dict, Optional, Tuple

try:
    from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError
    AER_NOISE_AVAILABLE = True
except ImportError:
    AER_NOISE_AVAILABLE = False

logger = logging.getLogger("hybrid-quantum-medical-ai")


def build_qiskit_aer_noise_model(
    one_qubit_gate_error: float = 0.01,
    two_qubit_gate_error: float = 0.03,
    readout_error: float = 0.02,
) -> Tuple[Optional[Any], Dict[str, float]]:
    """Build a realistic Qiskit Aer NoiseModel simulating gate noise and readout errors."""
    metadata = {
        "one_qubit_gate_error": one_qubit_gate_error,
        "two_qubit_gate_error": two_qubit_gate_error,
        "readout_error": readout_error,
        "is_available": AER_NOISE_AVAILABLE,
    }

    if not AER_NOISE_AVAILABLE:
        logger.warning("qiskit_aer.noise is not available. Using mathematical noise perturbation fallback.")
        return None, metadata

    try:
        noise_model = NoiseModel()
        # 1-qubit gate error (ry, rz, h)
        err_1q = depolarizing_error(one_qubit_gate_error, 1)
        noise_model.add_all_qubit_quantum_error(err_1q, ["ry", "rz", "h", "u1", "u2", "u3"])

        # 2-qubit gate error (cx)
        err_2q = depolarizing_error(two_qubit_gate_error, 2)
        noise_model.add_all_qubit_quantum_error(err_2q, ["cx", "cz"])

        # Readout error
        p0to1 = readout_error
        p1to0 = readout_error
        r_error = ReadoutError([[1 - p0to1, p0to1], [p1to0, 1 - p1to0]])
        noise_model.add_all_qubit_readout_error(r_error)

        return noise_model, metadata
    except Exception as e:
        logger.error(f"Error initializing Qiskit Aer noise model: {e}")
        return None, metadata


def simulate_noisy_probabilities(
    ideal_probs: np.ndarray,
    noise_level: float = 0.05,
    random_seed: int = 42,
) -> np.ndarray:
    """Apply realistic noise perturbation to probability distributions for simulated noise stress testing."""
    rng = np.random.default_rng(random_seed)
    noisy = ideal_probs.copy()
    
    # Add zero-mean Gaussian noise scaled by noise_level
    noise = rng.normal(loc=0.0, scale=noise_level, size=ideal_probs.shape)
    noisy[:, 1] = np.clip(noisy[:, 1] + noise[:, 1], 0.01, 0.99)
    noisy[:, 0] = 1.0 - noisy[:, 1]
    return noisy
