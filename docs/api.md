# REST API Reference: Q-CARE Platform

The backend exposes a REST API powered by FastAPI with interactive Swagger UI available at `http://localhost:8000/docs`.

---

## Complete Endpoints Overview

### 1. Health & Configuration
- `GET /api/health`: Health status, backend version (`1.2.0`), simulator type.
- `GET /api/config`: Default hyperparameters, demo mode status, qubit count, allowed CORS origins.

### 2. Authentication & RBAC
- `POST /api/auth/login`: Authenticate user session and issue JWT bearer token.
- `POST /api/auth/register`: Public self-registration (defaults to `VIEWER` role).
- `GET /api/auth/me`: Retrieve currently authenticated user profile and permissions.
- `GET /api/auth/users`: List registered platform users (Requires `users:manage`).
- `PUT /api/auth/users/{username}/role`: Update user role (Requires `users:manage`).

### 3. Experiment Registry & Orchestration
- `GET /api/experiments`: List all registered research experiments and their best observed metrics.
- `POST /api/experiments`: Create an isolated research experiment container.
- `GET /api/experiments/{id}`: Retrieve detailed metadata, configurations, and results for an experiment.
- `DELETE /api/experiments/{id}`: Delete an experiment and its persistent artifacts.
- `GET /api/experiments/active`: Retrieve the currently active experiment session.
- `POST /api/experiments/active/{id}`: Set active experiment session.
- `GET /api/experiments/{id}/status`: Poll real-time execution stage, percentage, and fold progress.
- `GET /api/experiments/{id}/results`: Retrieve benchmark summary and metrics for an experiment.
- `GET /api/experiments/{id}/report`: Retrieve structured Quantum Utility Report for an experiment.
- `GET /api/experiments/{id}/resource-profile`: Retrieve empirical computational resource metrics.
- `POST /api/experiments/compare`: Side-by-side empirical comparison across multiple experiments.

### 4. Quantum Architecture Catalog & Hardware Runtime
- `GET /api/quantum/models`: Discover implemented and planned quantum classifier models from the research registry.
- `GET /api/quantum/backends`: List available local statevector/noisy simulators and cloud-hosted IBM Quantum QPUs.
- `POST /api/quantum/validate-ibm-token`: Authenticate an IBM Quantum API key and discover accessible QPUs.
- `POST /api/quantum/export-qasm`: Generate and export compliant OpenQASM 3.0 code for a given VQC configuration.
- `GET /api/quantum/experiments/{id}/qasm`: Export OpenQASM 3.0 circuit code for a trained experiment.

### 5. Dataset Management
- `GET /api/dataset/samples`: List bundled sample clinical benchmark datasets.
- `POST /api/dataset/load-sample?sample_id={id}`: Load a bundled dataset by ID and profile.
- `POST /api/dataset/upload`: Upload a custom clinical CSV file with size/row limits and validation.
- `GET /api/dataset/profile`: Retrieve statistical profile, missing value counts, and class balance.
- `POST /api/dataset/configure`: Configure target column, positive class label, and excluded identifiers.

### 6. Preprocessing & Training
- `POST /api/preprocess`: Execute leakage-free train/test split, imputation, scaling, feature selection, and PCA.
- `POST /api/train`: Trigger background training of classical baseline models and VQC (concurrency protected).
- `GET /api/training/status`: Poll real-time progress, active step, and loss trajectory.

### 7. Benchmarking, Evidence & Explainability
- `GET /api/results`: Full comparative benchmark summary across all models (Accuracy, Sensitivity, Specificity, F1, ROC-AUC, PR-AUC, Brier).
- `GET /api/results/{model_id}`: Detailed evaluation metrics, confusion matrix, and ROC curve coordinates for a specific model.
- `GET /api/explainability/{model_id}`: Feature importance for classical models or Quantum Feature Sensitivity for VQC.

### 8. Patient Inference & Research Sensitivity Labs
- `POST /api/predict`: Real-time diagnostic risk prediction for a single patient dictionary.
- `POST /api/whatif` / `POST /api/whatif/analyze`: Run what-if feature perturbation sensitivity analysis across models.
- `GET /api/disagreement` / `GET /api/disagreement/analysis`: Identify held-out test samples where model predictions diverge.

### 9. Scientific Utility Reporting
- `GET /api/report/utility` / `GET /api/report/quantum-utility`: Synthesize structured Quantum Utility Report.
- `GET /api/report/utility/export/json` / `GET /api/report/export-json`: Export report as JSON.
- `GET /api/report/utility/export/csv` / `GET /api/report/export-csv`: Export report metrics as CSV.
- `GET /api/experiment/metadata` / `GET /api/report/experiment-metadata`: Full experiment provenance audit.
