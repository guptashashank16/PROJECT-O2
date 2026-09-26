# Quantum Evidence Engine Documentation

The **Quantum Evidence Engine** synthesizes empirical data across 5 dimensions to produce a transparent, observational verdict on comparative quantum utility.

> **Methodological Note**: This engine produces **observational** conclusions based on benchmark runs across 5-fold cross-validation and held-out test splits. It does **not** assert formal statistical significance without hypothesis testing, and reports standard deviation and bootstrap confidence intervals.

---

## 5 Evaluation Dimensions

1. **Performance**: Measures ROC-AUC margin ($\Delta = \text{AUC}_{\text{VQC}} - \text{AUC}_{\text{Best Classical}}$) on the held-out test cohort.
2. **Generalization & Stability**: Evaluates fold-by-fold standard deviation across 5 stratified cross-validation folds ($\text{SD}_{\text{VQC}}$ vs $\text{SD}_{\text{Classical}}$).
3. **Probability Calibration**: Compares Brier Scores ($\text{Brier} = \frac{1}{N} \sum (p_i - y_i)^2$) to assess diagnostic probability reliability.
4. **Noise Robustness**: Measures ROC-AUC performance retention of VQC under simulated Qiskit Aer depolarizing gate error ($1\%$ 1q, $3\%$ 2q) and readout error ($2\%$).
5. **Computational Resource Cost**: Tracks qubit count ($N$), circuit depth ($L$), variational parameter count ($\theta$), optimization iterations, and CPU inference latency overhead ratio.

---

## Transparent Verdict Decision Rules

- **`QUANTUM_PREFERRED`**: Triggered when VQC ROC-AUC advantage $\ge +0.03$, cross-validation variance is stable ($\text{SD}_{\text{VQC}} \le \text{SD}_{\text{Classical}} + 0.02$), and noisy simulation retention $\ge 85\%$.
- **`QUANTUM_COMPETITIVE`**: Triggered when VQC ROC-AUC is within parity threshold ($-0.04 \le \Delta < +0.03$) and noise retention is confirmed.
- **`CLASSICAL_PREFERRED`**: Triggered when classical baselines outperform VQC ($\Delta < -0.04$) or VQC exhibits high fold-to-fold variance with higher resource cost.
- **`INSUFFICIENT_EVIDENCE`**: Triggered when sample size is too small ($N < 30$) or cross-validation metric margins are inconclusive.

---

## Research Reporting Standards
- All metrics are reported as $\text{Mean} \pm \text{SD}$ across folds.
- Noisy benchmarking explicitly indicates whether execution ran via `Qiskit Aer Circuit Simulation` or `Analytical Mathematical Fallback`.
- Conclusions are framed as empirical comparative findings for the specific dataset and random seed.
