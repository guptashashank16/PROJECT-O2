# Quantum Evidence Engine Documentation

The **Quantum Evidence Engine** synthesizes empirical data across 5 dimensions to produce a transparent verdict on clinical quantum utility.

## 5 Evaluation Dimensions

1. **Performance**: Measures ROC-AUC margin ($\Delta = \text{AUC}_{\text{VQC}} - \text{AUC}_{\text{Best Classical}}$).
2. **Generalization**: Evaluates 5-fold cross-validation standard deviation ($\text{SD}_{\text{VQC}}$ vs $\text{SD}_{\text{Classical}}$).
3. **Calibration**: Compares Brier Scores ($\text{Brier} = \frac{1}{N} \sum (p_i - y_i)^2$).
4. **Noise Robustness**: Measures accuracy retention of VQC under simulated Qiskit Aer gate and readout noise.
5. **Resource Cost**: Tracks qubit count, circuit depth, and inference latency overhead ratio.

## Transparent Verdict Decision Rules

- **`QUANTUM_PREFERRED`**: Triggered when VQC ROC-AUC advantage $\ge +0.03$, cross-validation variance is stable ($\text{SD} \le \text{SD}_{\text{Classical}} + 0.02$), and noisy simulation retention $\ge 85\%$.
- **`QUANTUM_COMPETITIVE`**: Triggered when VQC ROC-AUC is within parity threshold ($-0.04 \le \Delta < +0.03$) and noise retention is confirmed.
- **`CLASSICAL_PREFERRED`**: Triggered when classical baselines outperform VQC ($\Delta < -0.04$) or VQC exhibits high fold-to-fold variance with higher resource cost.
- **`INSUFFICIENT_EVIDENCE`**: Triggered when sample size is too small ($N < 30$) or cross-validation metric margins are inconclusive.
