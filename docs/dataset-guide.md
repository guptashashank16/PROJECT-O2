# Clinical Dataset Guide & Benchmarking Datasets

## 1. Bundled Demonstration Datasets

The platform includes three curated clinical benchmark datasets located in `backend/samples/`.

> **Dataset sizes reflect the ACTUAL bundled files.** Do not rely on external references for row counts without verifying the bundled file.

| Dataset ID | Name | Rows (bundled) | Features | Description | Target Column | Positive Class |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `breast_cancer_wisconsin` | Wisconsin Breast Cancer (Diagnostic) — Demonstration Subset | **138** | 31 | Cell nucleus morphological features from FNA images. Demonstration subset of the full WDBC dataset (UCI Repository: 569 samples). | `diagnosis` | `M` (Malignant) |
| `heart_disease_cleveland` | Cleveland Cardiovascular Disease Risk | 80 | 14 | Mixed numerical/categorical resting ECG, blood chemistry, and exercise test results. | `heart_disease_risk` | `High Risk` |
| `diabetes_pima` | Pima Indians Diabetes Diagnostic | 80 | 9 | Diagnostic clinical indicators (glucose, insulin, BMI). | `diabetes_outcome` | `Positive` |

### ⚠️ Important Dataset Disclaimer

The bundled `breast_cancer_wisconsin.csv` contains **138 samples** — a curated demonstration subset of the full Wisconsin Diagnostic Breast Cancer (WDBC) dataset originally published by the UCI Machine Learning Repository (Dua & Graff, 2019), which contains 569 samples.

**All benchmark metrics produced by this platform reflect the 138-sample bundled subset**, not the 569-sample full dataset. Results from the full 569-sample dataset may differ. The UI and API report the actual bundled row count dynamically.

If you wish to use the full WDBC dataset, download it from:
- UCI ML Repository: https://archive.ics.uci.edu/ml/datasets/Breast+Cancer+Wisconsin+(Diagnostic)
- sklearn: `sklearn.datasets.load_breast_cancer()`

Then upload via the Dataset Upload panel.

---

## 2. Uploading Custom Clinical Datasets

Researchers can upload any tabular CSV file via the web dashboard or REST API:

### Requirements:
1. **Format**: Standard comma-delimited `.csv`.
2. **Rows**: At least 15 rows (recommended ≥ 50 for representative train/test evaluation).
3. **Target Variable**: Any column containing at least 2 distinct binary labels (e.g. `1/0`, `Disease/Healthy`, `M/B`, `Positive/Negative`).
4. **Column Names**: Standard alphanumeric headers.

### Automatic Processing:
- **Numerical Features**: Automatically detected, median-imputed, and standardized.
- **Categorical Features**: Automatically detected, mode-imputed, and one-hot encoded.
- **Identifier Columns**: Columns named `patient_id`, `id`, `case_id` or with 100% unique sequence keys are auto-flagged and excluded from training to prevent data leakage.
- **Constant Columns**: Features with zero variance are flagged and excluded.

---

## 3. Dataset Attribution

| Dataset | Original Source | License |
| :--- | :--- | :--- |
| Wisconsin Breast Cancer (WDBC) | W.N. Street, W.H. Wolberg, O.L. Mangasarian (1993). UCI ML Repository. | Public domain (research use) |
| Cleveland Heart Disease | Hungarian Institute of Cardiology; UCI ML Repository. | Public domain (research use) |
| Pima Indians Diabetes | National Institute of Diabetes and Digestive and Kidney Diseases; Kaggle. | Public domain (research use) |
