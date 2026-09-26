# System Architecture: Q-CARE Research & Benchmarking Platform

## 1. Overview & Research Scope (SIH26139)

The **Q-CARE Platform** (`hybrid-quantum-medical-ai`) provides a dataset-agnostic, scientifically rigorous benchmarking environment for evaluating Parameterized Quantum Circuits (specifically Variational Quantum Classifiers — VQC) against standard classical machine learning baselines (Logistic Regression, Random Forest, Support Vector Machines) on tabular clinical and biomedical datasets.

> **Core Research Philosophy**: "Do not assume quantum is better. Measure, benchmark, record uncertainty."
> This platform is a research benchmarking and evaluation tool, **not** a clinical diagnostic or medical referral product.

```mermaid
flowchart TD
    A["Raw Biomedical Dataset CSV"] --> B["Dataset Profiler & Ingestion"]
    B --> C["User Configuration: Target, Positive Class, Identifiers"]
    C --> EXP["Experiment Registry & Isolation (ExperimentService)"]
    EXP --> D["Stratified 5-Fold Split S=42"]

    subgraph PreprocessingPipeline ["Leakage-Free Preprocessing Pipeline (Fitted on Train Folds Only)"]
        D --> E["Missing Value Imputation"]
        E --> F["Categorical One-Hot Encoding"]
        F --> G["StandardScaler / MinMaxScaler"]
        G --> H["ANOVA F-test Feature Selection"]
        H --> I["PCA Dimensionality Reduction to N Qubits"]
        I --> J["Quantum Angle Normalization [0, pi]"]
    end

    J --> K["Processed Training Folds"]
    J --> L["Processed Held-Out Test Fold"]

    subgraph JobManager ["Training Job Queue & Stage Manager"]
        JM1["QUEUED"] --> JM2["PREPROCESSING"]
        JM2 --> JM3["CLASSICAL_TRAINING"]
        JM3 --> JM4["QUANTUM_TRAINING"]
        JM4 --> JM5["CROSS_VALIDATION"]
        JM5 --> JM6["NOISE_EVALUATION"]
        JM6 --> JM7["EXPLAINABILITY"]
        JM7 --> JM8["REPORT_GENERATION"]
        JM8 --> JM9["COMPLETED"]
    end

    subgraph ClassicalBaselines ["Classical Model Zoo"]
        K --> M1["Logistic Regression (L2 Regularized)"]
        K --> M2["Random Forest (100 Decision Trees)"]
        K --> M3["Support Vector Machine (RBF Platt Calibrated)"]
    end

    subgraph QuantumPipeline ["Variational Quantum Classifier (VQC)"]
        K --> Q1["Feature Map: ZZFeatureMap / AngleEncoding"]
        Q1 --> Q2["Variational Ansatz: RealAmplitudes / EfficientSU2"]
        Q2 --> Q3["Statevector Simulation & Pauli Z Observables"]
        Q3 --> Q4["Classical Optimizer: COBYLA / SLSQP / SPSA"]
        Q4 -.->|Parameter Update theta| Q2
    end

    L --> EV["5-Fold Cross-Validation & Held-Out Test Evaluator"]
    M1 --> EV
    M2 --> EV
    M3 --> EV
    Q3 --> EV

    EV --> NOISE["Qiskit Aer Depolarizing & Readout Noise Stress Test"]
    EV --> RES["Benchmark Metrics: ROC-AUC, PR-AUC, Sensitivity, Specificity, Brier Score, CV SD"]
    EV --> EXP_ANALYSIS["Explainability: Quantum Sensitivity Analysis vs. Tree/Linear Importances"]
    EV --> DISAGREE["Model Disagreement Lab: Held-Out Cohort Boundary Divergences"]
    EV --> EVID["5-Dimensional Quantum Evidence Engine Verdict"]
    EV --> UTIL_REP["Exportable Quantum Utility Report (JSON / CSV)"]
    EV --> RES_PROF["Computational Resource & Scalability Profile"]
```

---

## 2. Core Architectural Pillars

### 2.1 Experiment Registry & Session Isolation
- Experiments are encapsulated in `ExperimentDetail` entities stored in `backend/artifacts/experiments/{experiment_id}.json`.
- Each experiment maintains isolated configurations, dataset fingerprints, preprocessed matrices, model instances, and benchmark results.
- `ExperimentService` enables researchers to create, switch, delete, and empirically compare multi-experiment runs side-by-side (`/api/experiments/compare`).

### 2.2 Training Job Queue & Concurrency Protection
- Training is managed by `JobManager` with explicit stage progression (`QUEUED` -> `PREPROCESSING` -> `CLASSICAL_TRAINING` -> `QUANTUM_TRAINING` -> `CROSS_VALIDATION` -> `NOISE_EVALUATION` -> `EXPLAINABILITY` -> `REPORT_GENERATION` -> `COMPLETED`).
- Concurrent or duplicate training submissions on an active experiment are prevented with HTTP 409 Conflict protection.

### 2.3 Strict Data Leakage Prevention
- Transformers (`SimpleImputer`, `OneHotEncoder`, `StandardScaler`, `SelectKBest`, `PCA`, and quantum normalizers) are **fitted strictly within training folds**.
- Held-out test folds and single new patient inference requests are transformed using these pre-fitted parameters without refitting.

### 2.4 Real Qiskit Aer Depolarizing Noise Benchmarking
- The platform tests VQC statevectors against actual Qiskit Aer noise models simulating:
  - 1-qubit gate depolarizing error ($1\%$)
  - 2-qubit gate depolarizing error ($3\%$)
  - Readout measurement error ($2\%$)
- If Aer is unavailable in lightweight runtime environments, an analytical mathematical fallback is executed and clearly labeled.

### 2.5 Security, Dynamic Secrets & RBAC
- `JWT_SECRET_KEY` is dynamically loaded from environment variables (or generated securely in dev) rather than hardcoded in source.
- CORS is restricted to configurable origins (`settings.ALLOWED_ORIGINS`).
- Role-Based Access Control (`RESEARCHER`, `VIEWER`) is enforced directly on API endpoints with Bearer tokens.
- No privileged credentials or passwords appear in frontend bundles.

### 2.6 Medical Research Disclaimer
This software is intended strictly for academic and experimental machine learning benchmarking under SIH26139. It is **not** a certified medical device and must **never** be used as the sole basis for clinical diagnosis, treatment planning, or hospital referral workflows.
