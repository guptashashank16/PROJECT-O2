# Hybrid Quantum-Classical Clinical Disease Detection Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-teal.svg)](https://fastapi.tiangolo.com/)
[![Qiskit](https://img.shields.io/badge/Qiskit-1.0%2B-6929C4.svg)](https://www.ibm.com/quantum/qiskit)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-style research prototype for benchmarking **Variational Quantum Classifiers (VQC)** against standard classical machine learning models (Logistic Regression, Random Forest, SVM) on clinical and biomedical tabular datasets.

---

## 1. Executive Summary

### 1.1 The Problem
Early and accurate detection of complex diseases (such as breast malignancies, cardiovascular dysfunction, and metabolic disorders) requires identifying subtle non-linear multi-feature interactions in high-dimensional biomedical tabular data. While deep classical ensembles excel at pattern recognition, near-term quantum algorithms offer alternative representation spaces via quantum entanglement and Hilbert space state embeddings.

### 1.2 The Solution
This platform implements a generic, dataset-agnostic pipeline combining leakage-free classical preprocessing with genuine parameterized quantum circuit simulation. It directly benchmarks whether a Variational Quantum Classifier (VQC) provides competitive diagnostic utility against conventional baselines under clinical evaluation metrics (Sensitivity, Specificity, ROC-AUC, F1-Score).

---

## 2. System Architecture
```mermaid
flowchart TD

    A["Raw Clinical Dataset CSV"] --> B["Dataset Profiler & Ingestion"]
    B --> C["User Configuration: Target, Positive class, Identifiers"]
    C --> D["Stratified Train/Test Split"]

    subgraph PreprocessingPipeline["Leakage-Free Preprocessing Pipeline - Fitted on Train Only"]
        D --> E["Missing Value Imputation"]
        E --> F["Categorical One-Hot Encoding"]
        F --> G["StandardScaler / MinMaxScaler"]
        G --> H["ANOVA F-test Feature Selection"]
        H --> I["PCA Dimensionality Reduction to N Qubits"]
        I --> J["Quantum Angle Normalization [0, pi]"]
    end

    J --> K["Processed Training Split"]
    J --> L["Processed Test Split"]

    subgraph ClassicalBaselines["Classical Model Zoo"]
        K --> M1["Logistic Regression"]
        K --> M2["Random Forest"]
        K --> M3["Support Vector Machine"]
    end

    subgraph QuantumPipeline["Variational Quantum Classifier"]
        K --> Q1["Feature Map: ZZFeatureMap"]
        Q1 --> Q2["Variational Ansatz: RealAmplitudes"]
        Q2 --> Q3["Statevector Simulation and Z Measurement"]
        Q3 --> Q4["Loss Calculation and Classical Optimizer: COBYLA"]
        Q4 -->|Parameter Update| Q2
    end

    L --> EV["Medical Evaluation Engine"]

    M1 --> EV
    M2 --> EV
    M3 --> EV
    Q3 --> EV

    EV --> RES["Benchmark Summary: Sensitivity, Specificity, AUC, ROC, F1-Score, Confusion Matrix"]
    EV --> EXP["Explainability: Permutation Importance and Quantum Sensitivity Analysis"]

    NP["New Patient Observation"] --> INF["Inference Engine"]
    INF --> PREP["Preprocessing Pipeline - Reused Fitted Transformers"]
    PREP --> PRED["Dynamic Patient Prediction and Risk Stratification"]

 ---   

## 3. Key Platform Features

- **True Dataset Generalization**: Not hard-coded for one dataset. Works seamlessly with any tabular binary classification dataset (e.g. Wisconsin Breast Cancer, Cleveland Heart Disease, Pima Diabetes, Liver Disease).
- **Strict Data Leakage Prevention**: Split-first pipeline ensures imputation, one-hot encoding, scaling, ANOVA feature selection, and PCA are fitted strictly on the training partition.
- **Genuine Quantum Simulation**: Real Variational Quantum Classifier (VQC) implemented using Qiskit 1.0 Statevector simulation with parameterized circuits and classical optimizers. Zero fake results.
- **Fast Demo Mode (`FAST_DEMO_MODE=True`)**: Configurable concise batch and iteration ceilings to execute real quantum simulations in under 10 seconds for live demonstrations.
- **Comprehensive Medical Metrics**: Accuracy, Precision, Sensitivity/Recall ($TP / (TP+FN)$), Specificity ($TN / (TN+FP)$), F1-Score, and ROC-AUC with zero-division safety.
- **Quantum Feature Sensitivity Analysis**: Evaluates finite-difference output gradient shifts under systematic quantum feature perturbations and projects sensitivities back to original clinical features.
- **Dynamic Patient Prediction**: Generates real-time patient inference forms dynamically tailored to active dataset column schemas.

---

## 4. Technology Stack

- **Backend**: Python 3.10+, FastAPI, Pydantic v2, Scikit-Learn, Qiskit 1.0, NumPy, SciPy, Pandas.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons.
- **API & Docs**: OpenAPI 3.0, Swagger UI active at `http://localhost:8000/docs`.

---

## 5. Getting Started & Installation

### Option A: Native Setup (Recommended)

#### 1. Clone the repository:
```bash
git clone https://github.com/your-username/hybrid-quantum-medical-ai.git
cd hybrid-quantum-medical-ai
```

---

#### 2. Windows Setup:
```powershell
# Run the automated setup script
powershell .\scripts\setup.ps1

# Start backend (Terminal 1)
powershell .\scripts\run-backend.ps1

# Start frontend (Terminal 2)
powershell .\scripts\run-frontend.ps1
```

#### 3. Linux / macOS Setup:
```bash
# Run the automated setup script
chmod +x scripts/*.sh
./scripts/setup.sh

# Start backend (Terminal 1)
./scripts/run-backend.sh

# Start frontend (Terminal 2)
./scripts/run-frontend.sh
```

### Option B: Docker Compose Setup
```bash
docker-compose up --build
```

Access the web platform at:
- **Web Dashboard**: `http://localhost:5173`
- **FastAPI Swagger API**: `http://localhost:8000/docs`

---

## 6. Demonstration Workflow

1. **Open Dashboard**: Navigate to `http://localhost:5173`.
2. **Select Dataset**: Choose a bundled benchmark sample (e.g. *Breast Cancer Wisconsin*, *Cleveland Heart Disease*, *Pima Diabetes*) or upload a custom CSV.
3. **Inspect Profile**: Review row counts, column types, missing values, and class balance distributions.
4. **Configure Target**: Select target column, positive diagnostic class label, and identifier columns.
5. **Run Preprocessing**: View the step-by-step pipeline, ANOVA feature selection, and PCA variance ratios.
6. **Train Models**: Execute simultaneous training of Logistic Regression, Random Forest, SVM, and VQC.
7. **Inspect Benchmarks**: Compare medical diagnostic metrics (Sensitivity, Specificity, AUC) across models.
8. **Analyze ROC & Confusion Matrices**: Inspect model discrimination curves and false negative/positive rates.
9. **Explore Explainability**: Review classical permutation importances and Quantum Feature Sensitivity perturbation rankings.
10. **Predict New Patient**: Pre-fill sample values or enter custom clinical features in the dynamic patient lab to generate real-time risk predictions.

---

## 7. Judge & Technical Q&A Reference

### Why Quantum Machine Learning?
QML investigates whether quantum Hilbert space state embeddings and entanglement can construct expressive decision surfaces for complex biological data that are non-trivial to capture with linear or low-degree classical kernels.

### Why VQC (Variational Quantum Classifier)?
VQC is an ideal near-term quantum algorithm for NISQ devices. It parameterizes shallow quantum circuits and uses classical optimization loops to update gate angles, minimizing circuit depth while maintaining trainability.

### Why Classical Preprocessing & PCA?
Near-term quantum simulators and physical quantum hardware have practical qubit limits (typically 4–8 qubits for fast local execution). PCA dimensionality reduction linearly compresses the feature space to $N$ orthogonal principal components before quantum angle encoding.

### How are Clinical Features Encoded into Qubits?
Continuous PCA components are bounded to $[0, \pi]$ and bound to $R_z$ rotations in a `ZZFeatureMap` or $R_y$ rotations in `AngleEncoding`. Two-qubit entangling gates ($R_{zz}$) generate non-local quantum correlations across feature pairs.

### How Do You Prevent Data Leakage?
The dataset is split first into train and held-out test splits. Imputers, scalers, encoders, ANOVA selectors, and PCA matrices are fitted **exclusively on the training split** and applied identically to test data and inference requests.

### What Happens If VQC Performs Worse Than Classical ML?
The platform reports results honestly. If Random Forest or Logistic Regression achieves superior sensitivity or AUC, the dashboard displays that exact empirical result. The platform is a scientific benchmarking system, not marketing for quantum supremacy.

### How Is Explainability Handled for Quantum Models?
Standard tree SHAP is mathematically invalid for parameterized quantum circuits. The platform implements **Quantum Model Feature Sensitivity Analysis**, measuring empirical output shifts $\Delta \hat{y}$ under systematic feature perturbations ($\pm \delta$), then projects sensitivities back through PCA loadings.

---

## 8. Medical & Research Disclaimer

> **IMPORTANT**: This prototype is developed for research, experimental benchmarking, and educational purposes only. It is **not** a clinically validated diagnostic tool and must not be used as a substitute for professional medical advice, clinical diagnosis, or patient care decisions.

---

## 9. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
