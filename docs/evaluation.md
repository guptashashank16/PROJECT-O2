# Medical Evaluation Methodology & Clinical Metrics

## 1. Metric Formulations

In biomedical disease detection research, accuracy alone is insufficient due to class imbalances and the high cost of false negatives. The platform calculates:

### 1.1 Sensitivity (Recall / True Positive Rate - TPR)
$$\text{Sensitivity} = \frac{TP}{TP + FN}$$
- **Research Significance**: Measures the proportion of actual diseased samples correctly identified. High sensitivity minimizes false negatives (missed detections).

### 1.2 Specificity (True Negative Rate - TNR)
$$\text{Specificity} = \frac{TN}{TN + FP}$$
- **Research Significance**: Measures the proportion of healthy/control samples correctly identified. High specificity minimizes false positives.

### 1.3 Precision (Positive Predictive Value - PPV)
$$\text{Precision} = \frac{TP}{TP + FP}$$
- **Research Significance**: Measures the probability that a positive prediction corresponds to a true positive.

### 1.4 F1-Score
$$\text{F1} = 2 \cdot \frac{\text{Precision} \cdot \text{Sensitivity}}{\text{Precision} + \text{Sensitivity}}$$
- Harmonic mean balancing precision and sensitivity.

### 1.5 Area Under the ROC Curve (ROC-AUC) & PR-AUC
- **ROC-AUC**: Measures discrimination capacity across all classification decision thresholds $\tau \in [0, 1]$.
- **PR-AUC**: Area under the Precision-Recall curve, essential for severely imbalanced tabular cohorts.

### 1.6 Brier Score (Calibration Metric)
$$\text{Brier} = \frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2$$
- Quantifies calibration error between predicted probability $p_i \in [0, 1]$ and binary outcome $y_i \in \{0, 1\}$. Lower values indicate better calibrated model probabilities.

---

## 2. Evaluation Modes & Validation Frameworks

### 2.1 Stratified 5-Fold Cross-Validation (CV)
- **Leakage Prevention**: All imputation (median/mode), scaling (StandardScaler), categorical encoding (One-Hot), ANOVA feature selection, and PCA dimensionality reduction are fitted strictly inside each fold's training split.
- **Aggregated Statistics**: Reports both the mean ($\mu$) and standard deviation ($\sigma$) across all 5 folds to capture performance stability across subsets.

### 2.2 Held-Out Test Evaluation
- When a held-out test split is configured (e.g., 20%), the dataset is partitioned once with stratification before CV or final model evaluation.
- Held-out test metrics provide an unbiased estimate of generalization to unseen tabular distributions.

### 2.3 Demo Mode vs. Research Mode
- **Fast Demo Mode**: Employs an optimized sub-sampled batch and concise optimizer iteration ceiling (15–25 iterations) for instant interactive exploration without sacrificing genuine quantum simulation.
- **Comprehensive Research Mode**: Evaluates on full dataset splits with higher optimization iterations (50–100 iterations) and 5-fold cross-validation for rigorous empirical benchmarking.

### 2.4 Simulation Paradigms
- **Ideal Statevector Simulation**: Evaluates the parameterized quantum circuit using exact statevector projection ($|\psi\rangle = W(\theta) U_\Phi(x)|0\rangle$), representing theoretical fault-tolerant quantum performance.
- **Noisy Aer Simulation**: Simulates NISQ device realities via Qiskit Aer, incorporating 1-qubit/2-qubit gate depolarizing noise and asymmetric measurement readout errors ($P(0|1), P(1|0)$).
- **Fallback Simulation**: If Qiskit Aer binary extensions are not installed in the execution environment, the simulator falls back to analytical density matrix / perturbed statevector simulation with an explicit provenance flag.

---

## 3. Advanced Diagnostic & Analytical Modules

### 3.1 What-If Sensitivity Analysis
- Allows researchers to vary individual patient feature values across a uniform grid while holding all other features fixed at their median or observed baseline.
- Tracks the continuous probability trajectory for VQC vs. classical models, identifying critical tipping points and boundary non-linearities.

### 3.2 Model Disagreement & Concordance Analysis
- Analyzes prediction agreement (Cohen's Kappa $\kappa$, pairwise consensus, and discordant sample masks) across VQC, Logistic Regression, Random Forest, and SVM.
- Isolates samples where quantum and classical models diverge, highlighting specific feature profiles where quantum decision boundaries differ from hyperplane or tree-partition baselines.

### 3.3 Zero-Division Safety
All metric calculators implement safe zero-division handlers (`zero_division=0` in scikit-learn and conditional guards) ensuring the platform never crashes or returns `NaN` when evaluating small test cohorts or zero-positive predictions.

---

## 4. Honest Benchmarking Guarantee
The platform does not bias benchmarks in favor of quantum computing. If Random Forest or Logistic Regression achieves superior ROC-AUC or calibration compared to VQC on a specific dataset, the benchmark table and evidence engine reflect the exact empirical findings without distortion.
