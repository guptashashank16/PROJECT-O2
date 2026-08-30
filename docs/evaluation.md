# Medical Evaluation Methodology & Clinical Metrics

## 1. Metric Formulations

In clinical disease detection, accuracy alone is insufficient due to class imbalances and the high cost of false negatives. The platform calculates:

### 1.1 Sensitivity (Recall / True Positive Rate - TPR)
$$\text{Sensitivity} = \frac{TP}{TP + FN}$$
- **Clinical Significance**: Measures the proportion of actual diseased patients correctly identified. A high sensitivity minimizes false negatives (missed diagnoses).

### 1.2 Specificity (True Negative Rate - TNR)
$$\text{Specificity} = \frac{TN}{TN + FP}$$
- **Clinical Significance**: Measures the proportion of healthy individuals correctly identified. A high specificity minimizes false positives (unnecessary biopsies or interventions).

### 1.3 Precision (Positive Predictive Value - PPV)
$$\text{Precision} = \frac{TP}{TP + FP}$$
- **Clinical Significance**: When the model predicts a disease is present, precision measures the probability that the diagnosis is correct.

### 1.4 F1-Score
$$\text{F1} = 2 \cdot \frac{\text{Precision} \cdot \text{Sensitivity}}{\text{Precision} + \text{Sensitivity}}$$
- Harmonic mean balancing precision and sensitivity.

### 1.5 Area Under the ROC Curve (ROC-AUC)
Measures discrimination capacity across all classification decision thresholds $\tau \in [0, 1]$.

---

## 2. Zero-Division Safety
All metric calculators implement safe zero-division handlers (`zero_division=0` in scikit-learn and conditional guards) ensuring the platform never crashes or returns `NaN` when evaluating small test cohorts or zero-positive predictions.

---

## 3. Honest Benchmarking Guarantee
The platform does not bias benchmarks in favor of quantum computing. If Random Forest or Logistic Regression achieves superior accuracy or ROC-AUC compared to VQC on a specific dataset, the benchmark table and radar charts reflect the exact empirical results.
