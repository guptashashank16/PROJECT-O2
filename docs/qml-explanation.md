# Quantum Machine Learning Methodology: Variational Quantum Classifier (VQC)

## 1. Mathematical Formulation

The Variational Quantum Classifier (VQC) is a hybrid quantum-classical algorithm that leverages Parameterized Quantum Circuits (PQCs) to perform supervised classification on biomedical tabular features.

```text
Classical Clinical Features x ∈ [0, π]^N
              ↓
  Quantum Feature Encoding U_Φ(x)
              ↓
  Parameterized Ansatz Circuit W(θ)
              ↓
  Quantum State Preparation |ψ(x, θ)⟩ = W(θ) U_Φ(x) |0...0⟩
              ↓
  Observable Measurement ⟨Z_0⟩ = ⟨ψ| Z_0 |ψ⟩
              ↓
  Logit Projection z = scale · ⟨Z_0⟩ + bias
              ↓
  Class Probability p(y=1|x) = σ(z) = 1 / (1 + e^-z)
              ↓
  Classical Optimizer Update (COBYLA / SLSQP / SPSA) ↺
```

---

## 2. Circuit Components

### 2.1 Feature Maps ($U_\Phi(\mathbf{x})$)
The platform maps classical continuous clinical features $\mathbf{x} \in \mathbb{R}^N$ into quantum Hilbert space:

1. **`ZZFeatureMap`**:
   - First applies Hadamard gates to create a uniform superposition: $H^{\otimes N}|0\rangle$.
   - Applies single-qubit phase rotations: $R_z(2 x_i) = \exp(-i x_i Z_i)$.
   - Applies two-qubit entangling phase gates between adjacent qubits:
     $$R_{zz}(2(\pi - x_i)(\pi - x_j)) = \exp(-i (\pi - x_i)(\pi - x_j) Z_i Z_j)$$
   - Creates non-linear quantum correlations that cannot be efficiently simulated classically for large qubit counts.

2. **`AngleEncoding`**:
   - Applies direct $R_y(x_i)$ rotations to each qubit $i \in \{0, \dots, N-1\}$ without inter-qubit entanglement.

### 2.2 Variational Ansatzes ($W(\boldsymbol{\theta})$)
1. **`RealAmplitudes`**:
   - Parameterized single-qubit $R_y(\theta_k)$ rotations interleaved with linear CNOT entanglement gates across $L$ layers.
   - Preserves real state amplitudes for efficient simulation.
   - Total parameter count: $N \cdot (L + 1)$.

2. **`EfficientSU2`**:
   - Single-qubit $R_y$ and $R_z$ rotations followed by linear entanglement layers.
   - Total parameter count: $2N \cdot (L + 1)$.

---

## 3. Loss Function & Optimization

The model optimizes binary cross-entropy loss with an L2 weight regularization term:

$$\mathcal{L}(\boldsymbol{\theta}, \text{bias}) = -\frac{1}{M} \sum_{i=1}^M \left[ y_i \ln(p_i + \epsilon) + (1-y_i) \ln(1 - p_i + \epsilon) \right] + \lambda \|\boldsymbol{\theta}\|_2^2$$

- **Optimizers**: `COBYLA` (Constrained Optimization BY Linear Approximations), `SLSQP`, or `SPSA` (Simultaneous Perturbation Stochastic Approximation).
- **Batching**: Supports full-batch and mini-batch stochastic updates.

---

## 4. Simulation Engines & Provenance

The platform explicitly tags and tracks simulation engine provenance:

1. **Ideal Statevector Engine (`StatevectorSampler`)**:
   - Uses exact statevector linear algebra ($2^N$ complex vector).
   - Provides an upper bound on ideal algorithmic performance without noise or shot fluctuations.

2. **Noisy Aer Simulation Engine (`AerNoiseModel`)**:
   - Incorporates realistic NISQ device noise models via Qiskit Aer.
   - Configurable 1-qubit gate error (depolarizing probability $p_1$), 2-qubit CNOT gate error ($p_2$), and measurement readout flip probabilities ($P(0|1), P(1|0)$).

3. **Fallback Simulation Engine**:
   - In environments where compiled C++ Qiskit Aer binaries are unavailable, the platform automatically switches to an analytical noisy perturbation engine and reports this fallback status transparently in the Experiment Registry and Report.

---

## 5. Computational Resource & Scalability Profiling

For each quantum experiment, the platform records:
- **Qubit Count ($N$)**: Directly equals the reduced feature dimension ($N \le 16$).
- **Circuit Depth ($D$)**: Evaluated using Qiskit circuit transpile DAG analysis.
- **Variational Parameter Count ($|\theta|$)**: Exact number of trainable rotation angles.
- **Optimization Iterations & Circuit Evaluations**: Measured number of forward passes through the simulator.
- **Simulation Time & Latency**: Measured runtime in seconds.

> **Research Note on Scalability**: Observed execution times on 4–12 qubits simulated on classical CPUs demonstrate polynomial simulation scaling ($O(M \cdot K \cdot 2^N)$). True quantum advantage on fault-tolerant hardware remains a future research horizon.

---

## 6. Quantum Model Feature Sensitivity Analysis

To explain VQC predictions without invalid classical assumptions, the platform implements **Perturbation-Based Quantum Feature Sensitivity**:

1. For each quantum-encoded input feature $j \in \{0, \dots, N-1\}$:
   $$\mathbf{x}^+ = \mathbf{x} + \delta \mathbf{e}_j, \quad \mathbf{x}^- = \mathbf{x} - \delta \mathbf{e}_j \quad (\delta = 0.05)$$
2. Compute the finite-difference output probability shift:
   $$S_j = \frac{1}{M} \sum_{i=1}^M \frac{|p(\mathbf{x}_i^+) - p(\mathbf{x}_i^-)|}{2 \delta}$$
3. Project quantum feature sensitivities back into the original clinical feature space using the PCA component loading matrix $\mathbf{V}$:
   $$\mathbf{S}_{\text{clinical}} = \mathbf{S}_{\text{quantum}} \cdot |\mathbf{V}|$$

