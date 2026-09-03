import time
from typing import Any, Callable, Dict, List, Optional
import numpy as np
from scipy.optimize import minimize

try:
    from qiskit import QuantumCircuit
    from qiskit.circuit import ParameterVector
    from qiskit.circuit.library import EfficientSU2, RealAmplitudes, ZZFeatureMap
    from qiskit.quantum_info import Statevector
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False

from app.models.base import BaseDiseaseClassifier
from app.schemas import QuantumModelConfig


class VariationalQuantumClassifier(BaseDiseaseClassifier):
    """Variational Quantum Classifier (VQC) using parameterized quantum circuits."""

    def __init__(self, config: Optional[QuantumModelConfig] = None, random_state: int = 42):
        super().__init__(
            model_id="vqc",
            model_name="Variational Quantum Classifier (VQC)",
            model_type="quantum",
        )
        self.config = config or QuantumModelConfig()
        self.random_state = random_state
        
        self.n_qubits = self.config.n_qubits
        self.feature_map_type = self.config.feature_map
        self.ansatz_type = self.config.ansatz
        self.ansatz_layers = self.config.ansatz_layers
        self.optimizer_name = self.config.optimizer
        self.max_iterations = self.config.max_iterations
        self.fast_demo_mode = self.config.fast_demo_mode

        # Circuit objects
        self.feature_map_circuit: Optional[QuantumCircuit] = None
        self.ansatz_circuit: Optional[QuantumCircuit] = None
        self.full_circuit: Optional[QuantumCircuit] = None
        
        self.feature_params: Optional[ParameterVector] = None
        self.ansatz_params: Optional[ParameterVector] = None
        
        # Learned variational weights
        self.weights_: Optional[np.ndarray] = None
        self.bias_: float = 0.0
        self.scale_: float = 2.0
        self.cost_history_: List[float] = []

        self._build_circuits()

    def _build_circuits(self) -> None:
        """Construct the feature map and variational ansatz circuits."""
        if not QISKIT_AVAILABLE:
            raise RuntimeError("Qiskit is required to build and simulate quantum circuits.")

        self.feature_params = ParameterVector("x", self.n_qubits)
        
        # 1. Feature Map
        if self.feature_map_type == "ZZFeatureMap":
            # ZZFeatureMap with linear entanglement for shallow depth
            self.feature_map_circuit = ZZFeatureMap(
                feature_dimension=self.n_qubits,
                reps=1,
                entanglement="linear",
                parameter_prefix="x",
            )
        else:
            # Angle Encoding (Ry rotations)
            qc_fm = QuantumCircuit(self.n_qubits)
            for i in range(self.n_qubits):
                qc_fm.ry(self.feature_params[i], i)
            self.feature_map_circuit = qc_fm

        # 2. Variational Ansatz
        if self.ansatz_type == "EfficientSU2":
            self.ansatz_circuit = EfficientSU2(
                num_qubits=self.n_qubits,
                reps=self.ansatz_layers,
                entanglement="linear",
                parameter_prefix="θ",
            )
        else:
            # RealAmplitudes default
            self.ansatz_circuit = RealAmplitudes(
                num_qubits=self.n_qubits,
                reps=self.ansatz_layers,
                entanglement="linear",
                parameter_prefix="θ",
            )

        self.ansatz_params = self.ansatz_circuit.parameters
        
        # 3. Composite full circuit
        self.full_circuit = QuantumCircuit(self.n_qubits)
        self.full_circuit.compose(self.feature_map_circuit, inplace=True)
        self.full_circuit.compose(self.ansatz_circuit, inplace=True)

    def _compute_single_expectation(self, x_sample: np.ndarray, weights: np.ndarray) -> float:
        """Evaluate the expectation value <Z_0> for a single input vector and weight configuration."""
        # Bind feature parameters and variational weights
        param_dict = {}
        # Feature parameters binding
        for p, val in zip(self.feature_map_circuit.parameters, x_sample):
            param_dict[p] = float(val)
        # Ansatz parameters binding
        for p, val in zip(self.ansatz_circuit.parameters, weights):
            param_dict[p] = float(val)

        bound_circuit = self.full_circuit.assign_parameters(param_dict)
        statevector = Statevector.from_instruction(bound_circuit)
        
        # Compute expectation value of Pauli-Z on qubit 0
        probs = statevector.probabilities()
        # Sum probabilities for states where qubit 0 is |0> minus where qubit 0 is |1>
        num_states = len(probs)
        z0_expectation = 0.0
        for idx in range(num_states):
            # In Qiskit, qubit 0 is the least significant bit
            qubit_0_bit = idx & 1
            sign = 1.0 if qubit_0_bit == 0 else -1.0
            z0_expectation += sign * probs[idx]

        return float(z0_expectation)

    def _evaluate_batch_expectations(self, X: np.ndarray, weights: np.ndarray) -> np.ndarray:
        """Compute quantum expectation values over a batch of input samples."""
        expectations = np.zeros(len(X), dtype=np.float64)
        for i in range(len(X)):
            expectations[i] = self._compute_single_expectation(X[i], weights)
        return expectations

    def _cost_function(
        self,
        theta_and_bias: np.ndarray,
        X: np.ndarray,
        y: np.ndarray,
        callback: Optional[Callable[[float], None]] = None,
    ) -> float:
        """Binary cross-entropy loss with L2 parameter regularization."""
        weights = theta_and_bias[:-1]
        bias = theta_and_bias[-1]

        expectations = self._evaluate_batch_expectations(X, weights)
        # Scaled logit: z = scale * expectation + bias
        logits = self.scale_ * expectations + bias
        # Sigmoid activation: p = 1 / (1 + exp(-z))
        clipped_logits = np.clip(logits, -15.0, 15.0)
        p_pos = 1.0 / (1.0 + np.exp(-clipped_logits))

        # Binary cross entropy with numerical stability epsilon
        eps = 1e-7
        bce = -np.mean(y * np.log(p_pos + eps) + (1.0 - y) * np.log(1.0 - p_pos + eps))
        # Mild L2 regularization
        l2_reg = 0.001 * np.sum(weights ** 2)
        total_loss = float(bce + l2_reg)

        self.cost_history_.append(total_loss)
        if callback:
            callback(total_loss)

        return total_loss

    def fit(self, X: np.ndarray, y: np.ndarray, progress_callback: Optional[Callable[[int, float], None]] = None) -> "VariationalQuantumClassifier":
        """Train the variational parameters using the selected classical optimizer."""
        if not QISKIT_AVAILABLE:
            raise RuntimeError("Qiskit is required for VQC training.")

        start_time = time.perf_counter()
        rng = np.random.default_rng(self.random_state)
        
        n_params = len(self.ansatz_circuit.parameters)
        # Small uniform initialization around 0
        init_weights = rng.uniform(-np.pi / 4, np.pi / 4, size=n_params)
        init_bias = 0.0
        init_theta_and_bias = np.append(init_weights, init_bias)

        # In Fast Demo Mode, sub-sample training data if large to ensure sub-10s turnaround
        max_samples = 30 if self.fast_demo_mode else 100
        if len(X) > max_samples:
            indices = rng.choice(len(X), size=max_samples, replace=False)
            X_train_opt = X[indices]
            y_train_opt = y[indices]
        else:
            X_train_opt = X
            y_train_opt = y

        max_iter = self.max_iterations
        if self.fast_demo_mode:
            max_iter = min(self.max_iterations, 20)

        opt_method = self.optimizer_name.upper()

        def step_tracker(loss_val: float):
            if progress_callback:
                curr_iter = len(self.cost_history_)
                pct = min(99, int((curr_iter / max_iter) * 100))
                progress_callback(pct, loss_val)

        if opt_method == "SPSA":
            # Genuine SPSA optimizer implementation
            a = 0.2
            c = 0.1
            A = max_iter * 0.1
            alpha = 0.602
            gamma = 0.101
            theta = init_theta_and_bias.copy()

            for k in range(1, max_iter + 1):
                ak = a / ((k + A) ** alpha)
                ck = c / (k ** gamma)
                delta = rng.choice([-1.0, 1.0], size=len(theta))
                
                theta_plus = theta + ck * delta
                theta_minor = theta - ck * delta

                loss_plus = self._cost_function(theta_plus, X_train_opt, y_train_opt, step_tracker)
                loss_minor = self._cost_function(theta_minor, X_train_opt, y_train_opt, None)

                ghat = (loss_plus - loss_minor) / (2.0 * ck * delta)
                theta = theta - ak * ghat

            self.weights_ = theta[:-1]
            self.bias_ = float(theta[-1])
        else:
            if opt_method not in ["COBYLA", "SLSQP", "BFGS"]:
                opt_method = "COBYLA"

            opt_options = {"maxiter": max_iter}
            if opt_method == "COBYLA":
                opt_options["rhobeg"] = 0.5

            res = minimize(
                fun=self._cost_function,
                x0=init_theta_and_bias,
                args=(X_train_opt, y_train_opt, step_tracker),
                method=opt_method,
                options=opt_options,
            )
            self.weights_ = res.x[:-1]
            self.bias_ = float(res.x[-1])

        self.training_time_seconds = float(time.perf_counter() - start_time)
        self.is_fitted = True


        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return [P(Negative), P(Positive)] for input feature matrix X."""
        if not self.is_fitted or self.weights_ is None:
            raise RuntimeError(f"{self.model_name} is not fitted.")

        expectations = self._evaluate_batch_expectations(X, self.weights_)
        logits = self.scale_ * expectations + self.bias_
        clipped_logits = np.clip(logits, -15.0, 15.0)
        p_pos = 1.0 / (1.0 + np.exp(-clipped_logits))
        p_neg = 1.0 - p_pos

        return np.column_stack([p_neg, p_pos])

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return binary prediction labels (0 or 1) based on 0.5 probability threshold."""
        proba = self.predict_proba(X)
        return (proba[:, 1] >= 0.5).astype(int)

    def get_params(self) -> Dict[str, Any]:
        return {
            "n_qubits": self.n_qubits,
            "feature_map": self.feature_map_type,
            "ansatz": self.ansatz_type,
            "ansatz_layers": self.ansatz_layers,
            "optimizer": self.optimizer_name,
            "max_iterations": self.max_iterations,
            "fast_demo_mode": self.fast_demo_mode,
            "variational_parameter_count": len(self.ansatz_circuit.parameters) if self.ansatz_circuit else 0,
            "final_loss": float(self.cost_history_[-1]) if self.cost_history_ else None,
        }

    def get_config(self) -> Dict[str, Any]:
        return self.get_params()

    def get_metrics(self) -> Dict[str, Any]:
        return {"cost_history": self.cost_history_, "training_time_seconds": self.training_time_seconds}


# Register model with QuantumModelRegistry
try:
    from app.quantum.registry import QuantumModelRegistry
    QuantumModelRegistry.register("vqc", VariationalQuantumClassifier)
except Exception:
    pass

