# REST API Reference: Hybrid Quantum Medical AI

The backend exposes a REST API powered by FastAPI with interactive Swagger UI available at:
```text
http://localhost:8000/docs
```

---

## Endpoints Overview

### 1. Health & Config
- `GET /api/health`: Health status, backend version, simulator type.
- `GET /api/config`: Default hyperparameters, demo mode status, qubit count.

### 2. Dataset Management
- `GET /api/dataset/samples`: List all bundled sample clinical datasets.
- `POST /api/dataset/load-sample?sample_id={id}`: Load a sample dataset by ID and compute its statistical profile.
- `POST /api/dataset/upload`: Upload a custom clinical CSV file (multipart/form-data).
- `GET /api/dataset/profile`: Retrieve statistical profile, missing value counts, and class balance.
- `POST /api/dataset/configure`: Configure target column, positive class label, and excluded identifier columns.

### 3. Preprocessing & Training
- `POST /api/preprocess`: Execute leakage-free train/test split, imputation, scaling, feature selection, and PCA.
- `POST /api/train`: Trigger background training of classical baseline models and VQC.
- `GET /api/training/status`: Poll real-time progress, active step, and loss trajectory.

### 4. Benchmarking & Explainability
- `GET /api/results`: Full comparative benchmark summary across all models (Accuracy, Sensitivity, Specificity, F1, AUC).
- `GET /api/results/{model_id}`: Detailed evaluation metrics, confusion matrix, and ROC curve coordinates for a specific model.
- `GET /api/explainability/{model_id}`: Permutation importance for classical models or Quantum Feature Sensitivity for VQC.

### 5. Patient Inference
- `POST /api/predict`: Real-time diagnostic risk prediction for a single patient dictionary.
