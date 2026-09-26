"""
Quantum Noise Simulation Module
================================
Provides real Qiskit Aer noise-model execution for VQC noisy benchmarking.

Execution modes (in priority order):
  1. AER_EXECUTION  — Circuit sampled under a full Qiskit Aer NoiseModel
                       (depolarizing gate errors + readout errors).
  2. FALLBACK_SIMULATION — Mathematical Gaussian perturbation of ideal
                       probabilities, used ONLY when qiskit_aer is not
                       installed or circuit transpilation fails.
                       Clearly labelled; never called "Aer execution".

The old `simulate_noisy_probabilities` helper is retained for unit-testing
but is NOT used as the primary noisy benchmark.
"""
import logging
from typing import Any, Dict, Optional, Tuple

import numpy as np

logger = logging.getLogger("hybrid-quantum-medical-ai")

# ---------------------------------------------------------------------------
# Optional Qiskit Aer imports
# ---------------------------------------------------------------------------
try:
    from qiskit_aer import AerSimulator  # type: ignore
    from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError  # type: ignore
    AER_AVAILABLE = True
except ImportError:
    AER_AVAILABLE = False

try:
    from qiskit import transpile, QuantumCircuit  # type: ignore
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False


# ---------------------------------------------------------------------------
# 1. Build the Qiskit Aer noise model
# ---------------------------------------------------------------------------

def build_qiskit_aer_noise_model(
    one_qubit_gate_error: float = 0.01,
    two_qubit_gate_error: float = 0.03,
    readout_error: float = 0.02,
) -> Tuple[Optional[Any], Dict[str, Any]]:
    """
    Build a Qiskit Aer NoiseModel with:
      - 1-qubit depolarizing error on all single-qubit gates
      - 2-qubit depolarizing error on cx / cz
      - symmetric readout error on all qubits

    Returns
    -------
    noise_model : NoiseModel | None
        None if Aer is unavailable or construction fails.
    metadata : dict
        Noise parameters and availability flags.
    """
    metadata: Dict[str, Any] = {
        "one_qubit_gate_error": one_qubit_gate_error,
        "two_qubit_gate_error": two_qubit_gate_error,
        "readout_error": readout_error,
        "aer_available": AER_AVAILABLE,
        "execution_mode": "UNAVAILABLE",
    }

    if not AER_AVAILABLE:
        logger.warning(
            "qiskit_aer is not installed. Noisy benchmark will use FALLBACK_SIMULATION."
        )
        return None, metadata

    try:
        noise_model = NoiseModel()

        # 1-qubit depolarizing error
        err_1q = depolarizing_error(one_qubit_gate_error, 1)
        noise_model.add_all_qubit_quantum_error(
            err_1q, ["ry", "rz", "h", "u1", "u2", "u3", "x", "y", "z", "s", "t"]
        )

        # 2-qubit depolarizing error
        err_2q = depolarizing_error(two_qubit_gate_error, 2)
        noise_model.add_all_qubit_quantum_error(err_2q, ["cx", "cz", "ecr"])

        # Symmetric readout error  (p0→1 = p1→0 = readout_error)
        p0to1 = readout_error
        p1to0 = readout_error
        r_error = ReadoutError([[1 - p0to1, p0to1], [p1to0, 1 - p1to0]])
        noise_model.add_all_qubit_readout_error(r_error)

        metadata["execution_mode"] = "AER_EXECUTION"
        return noise_model, metadata

    except Exception as exc:
        logger.error("Failed to build Qiskit Aer NoiseModel: %s", exc)
        metadata["execution_mode"] = "FALLBACK_SIMULATION"
        metadata["error"] = str(exc)
        return None, metadata


# ---------------------------------------------------------------------------
# 2. Execute VQC under a noise model to get per-sample probabilities
# ---------------------------------------------------------------------------

def simulate_noisy_vqc_circuit(
    vqc_model: Any,
    X_test: np.ndarray,
    noise_model: Optional[Any] = None,
    n_shots: int = 4096,
    noise_metadata: Optional[Dict[str, Any]] = None,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Compatibility wrapper expected by training and benchmarking code."""
    return execute_vqc_under_noise_model(
        vqc_model=vqc_model,
        X_test=X_test,
        noise_model=noise_model,
        n_shots=n_shots,
        noise_metadata=noise_metadata,
    )


def execute_vqc_under_noise_model(
    vqc_model: Any,  # VariationalQuantumClassifier (avoid circular import)
    X_test: np.ndarray,
    noise_model: Optional[Any],
    n_shots: int = 4096,
    noise_metadata: Optional[Dict[str, Any]] = None,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Execute the trained VQC circuit under a Qiskit Aer noise model for every
    sample in X_test and return shot-sampled probability arrays.

    Returns
    -------
    noisy_probs : np.ndarray, shape (N, 2)
        [[P(neg), P(pos)], ...] estimated from noisy shot counts.
    execution_report : dict
        Execution mode, shot count, and noise parameters actually used.
    """
    report = dict(noise_metadata or {})
    report["n_shots"] = n_shots

    # -----------------------------------------------------------------------
    # If Aer is available AND noise_model is built → real circuit execution
    # -----------------------------------------------------------------------
    if AER_AVAILABLE and QISKIT_AVAILABLE and noise_model is not None:
        try:
            return _run_aer_noisy(vqc_model, X_test, noise_model, n_shots, report)
        except Exception as exc:
            logger.error("Aer noisy execution failed: %s — falling back.", exc)
            report["aer_error"] = str(exc)
            report["execution_mode"] = "FALLBACK_SIMULATION"

    # -----------------------------------------------------------------------
    # Fallback: mathematical perturbation of ideal probabilities
    # -----------------------------------------------------------------------
    report["execution_mode"] = "FALLBACK_SIMULATION"
    report["fallback_reason"] = (
        "qiskit_aer unavailable or circuit execution failed."
        " Using mathematical Gaussian perturbation of ideal probabilities."
        " This is NOT equivalent to real hardware noise."
    )
    ideal_probs = vqc_model.predict_proba(X_test)
    fallback_probs = simulate_noisy_probabilities(ideal_probs, noise_level=0.06, random_seed=42)
    return fallback_probs, report


def _run_aer_noisy(
    vqc_model: Any,
    X_test: np.ndarray,
    noise_model: Any,
    n_shots: int,
    report: Dict[str, Any],
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Internal helper: transpile each test circuit, run under Aer with noise_model,
    convert shot counts to per-sample probability estimates.

    The probability of the positive class is derived from the Z0 measurement
    convention used by VariationalQuantumClassifier.predict_proba:
      P(pos) = sigmoid(scale * <Z0> + bias)
    where <Z0> is estimated from shot counts as (count_0 - count_1) / n_shots.
    """
    from qiskit import transpile  # type: ignore

    backend = AerSimulator(noise_model=noise_model)
    n_qubits = vqc_model.n_qubits
    scale = vqc_model.scale_
    bias = vqc_model.bias_
    weights = vqc_model.weights_
    full_circuit = vqc_model.full_circuit
    feature_map_circuit = vqc_model.feature_map_circuit
    ansatz_circuit = vqc_model.ansatz_circuit

    noisy_probs = np.zeros((len(X_test), 2), dtype=np.float64)

    for i, x_sample in enumerate(X_test):
        # Bind parameters
        param_dict = {}
        for p, val in zip(feature_map_circuit.parameters, x_sample):
            param_dict[p] = float(val)
        for p, val in zip(ansatz_circuit.parameters, weights):
            param_dict[p] = float(val)

        bound_circuit = full_circuit.assign_parameters(param_dict)

        # Add measurement to all qubits
        meas_circuit = bound_circuit.copy()
        meas_circuit.measure_all()

        # Transpile to Aer basis
        transpiled = transpile(meas_circuit, backend=backend, optimization_level=0)
        job = backend.run(transpiled, shots=n_shots)
        counts = job.result().get_counts()

        # Estimate <Z0> from counts (qubit 0 is LSB in Qiskit bitstring)
        total = sum(counts.values())
        z0_expectation = 0.0
        for bitstring, count in counts.items():
            # Qiskit bitstrings are big-endian: rightmost char = qubit 0
            q0_bit = int(bitstring[-1])
            sign = 1.0 if q0_bit == 0 else -1.0
            z0_expectation += sign * count / total

        logit = float(np.clip(scale * z0_expectation + bias, -15.0, 15.0))
        p_pos = 1.0 / (1.0 + np.exp(-logit))
        noisy_probs[i, 1] = p_pos
        noisy_probs[i, 0] = 1.0 - p_pos

    report["execution_mode"] = "AER_EXECUTION"
    report["n_samples_executed"] = len(X_test)
    return noisy_probs, report


# ---------------------------------------------------------------------------
# 3. Legacy mathematical perturbation helper (for unit tests / comparison only)
#    MUST NOT be used as the primary noise benchmark.
# ---------------------------------------------------------------------------

def simulate_noisy_probabilities(
    ideal_probs: np.ndarray,
    noise_level: float = 0.05,
    random_seed: int = 42,
) -> np.ndarray:
    """
    FALLBACK / TESTING ONLY.

    Apply zero-mean Gaussian perturbation to ideal probability distributions.
    This does NOT model gate-level or readout errors and MUST NOT be reported
    as an Aer-simulated result.  Used only when qiskit_aer is unavailable.
    """
    rng = np.random.default_rng(random_seed)
    noisy = ideal_probs.copy()
    noise = rng.normal(loc=0.0, scale=noise_level, size=ideal_probs.shape)
    noisy[:, 1] = np.clip(noisy[:, 1] + noise[:, 1], 0.01, 0.99)
    noisy[:, 0] = 1.0 - noisy[:, 1]
    return noisy
