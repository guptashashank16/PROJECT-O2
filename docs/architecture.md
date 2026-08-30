# System Architecture: Hybrid Quantum-Classical Disease Detection Platform

## 1. Overview

The **Hybrid Quantum-Classical Disease Detection Platform** (`hybrid-quantum-medical-ai`) provides a dataset-agnostic, scientifically rigorous benchmarking environment for evaluating Parameterized Quantum Circuits (specifically Variational Quantum Classifiers — VQC) against standard classical machine learning baselines (Logistic Regression, Random Forest, Support Vector Machines) on tabular clinical and biomedical datasets.

```mermaid
flowchart TD
    A[Raw Clinical Dataset CSV] --> B[Dataset Profiler & Ingestion]
    B --> C[User Configuration: Target, Positive Class, Identifiers]
    C --> D[Stratified Train/Test Split S=42]
    
    subgraph PreprocessingPipeline [Leakage-Free Preprocessing Pipeline (Fitted on Train Only)]
        D --> E[Missing Value Imputation]
        E --> F[Categorical One-Hot Encoding]
        F --> G[StandardScaler / MinMaxScaler]
        G --> H[ANOVA F-test Feature Selection]
        H --> I[PCA Dimensionality Reduction to N Qubits]
        I --> J[Quantum Angle Normalization [0, π]]
    end
    
    J --> K[Processed Training Split]
    J --> L[Processed Test Split]
    
    subgraph ClassicalBaselines [Classical Model Zoo]
        K --> M1[Logistic Regression]
        K --> M2[Random Forest]
        K --> M3[Support Vector Machine]
    end
    
    subgraph QuantumPipeline [Variational Quantum Classifier]
        K --> Q1[Feature Map: ZZFeatureMap]
        Q1 --> Q2[Variational Ansatz: RealAmplitudes]
        Q2 --> Q3[Statevector Simulation & <Z0> Measurement]
        Q3 --> Q4[Loss Calculation & Classical Optimizer: COBYLA]
        Q4 -.->|Parameter Update ↺| Q2
    end
    
    L --> EV[Medical Evaluation Engine]
    M1 --> EV
    M2 --> EV
    M3 --> EV
    Q3 --> EV
    
    EV --> RES[Benchmark Summary: Sensitivity, Specificity, AUC, ROC, Confusion Matrix]
    EV --> EXP[Explainability: Permutation Importance & Quantum Sensitivity Analysis]
    
    NP[New Patient Observation] --> INF[Inference Engine]
    PreprocessingPipeline -.->|Reuse Fitted Transformers| INF
    INF --> PRED[Dynamic Patient Prediction & Risk Stratification]
```

---

## 2. Core Architectural Pillars

### 2.1 Dataset Agnosticism
The platform does not hard-code features for specific diseases (e.g. Wisconsin Breast Cancer). Any clinical binary classification dataset can be uploaded. The engine dynamically detects column types, handles missing values, identifies potential identifier columns (e.g. `patient_id`), and generates dynamic patient prediction forms tailored to the active schema.

### 2.2 Strict Data Leakage Prevention
In biomedical machine learning, data leakage leads to falsely inflated performance metrics. To prevent this:
1. The dataset is partitioned into training and held-out test splits **first**.
2. All preprocessing transformers (`SimpleImputer`, `OneHotEncoder`, `StandardScaler`, `SelectKBest`, `PCA`, and quantum normalizers) are **fitted strictly on the training partition**.
3. The held-out test partition and single new patient inference requests are transformed using these pre-fitted parameters without refitting.

### 2.3 Genuine Quantum Execution
The platform does not fake or hard-code quantum benchmark results. Variational Quantum Circuits are simulated using Qiskit 1.0 Statevector simulators. In `FAST_DEMO_MODE`, concise batch optimization budgets are used to guarantee sub-10-second end-to-end training while maintaining mathematical fidelity.

### 2.4 Unified Model Interface
All models implement a common abstract class `BaseDiseaseClassifier`:
- `fit(X, y)`
- `predict(X)`
- `predict_proba(X)`
- `get_params()`
- `save(path)` / `load(path)`
