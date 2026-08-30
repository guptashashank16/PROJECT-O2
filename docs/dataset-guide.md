# Clinical Dataset Guide & Benchmarking Datasets

## 1. Bundled Demonstration Datasets

The platform includes three curated clinical benchmark datasets located in `backend/samples/`:

| Dataset ID | Name | Rows | Features | Description | Target Column | Positive Class |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `breast_cancer_wisconsin` | Wisconsin Breast Cancer | 100 | 30 | Cell nucleus morphological features from FNA images. | `diagnosis` | `M` (Malignant) |
| `heart_disease_cleveland` | Cleveland Cardiovascular Disease | 80 | 14 | Mixed numerical/categorical resting ECG, blood chemistry, and exercise test results. | `heart_disease_risk` | `High Risk` |
| `diabetes_pima` | Pima Indians Diabetes | 80 | 9 | Diagnostic clinical indicators (glucose, insulin, BMI). | `diabetes_outcome` | `Positive` |

---

## 2. Uploading Custom Clinical Datasets

Researchers can upload any tabular CSV file via the web dashboard or REST API:

### Requirements:
1. **Format**: Standard comma-delimited `.csv`.
2. **Rows**: At least 15 rows (recommended $\ge 50$ for representative train/test evaluation).
3. **Target Variable**: Any column containing at least 2 distinct binary labels (e.g. `1/0`, `Disease/Healthy`, `M/B`, `Positive/Negative`).
4. **Column Names**: Standard alphanumeric headers.

### Automatic Processing:
- **Numerical Features**: Automatically detected, median-imputed, and standardized.
- **Categorical Features**: Automatically detected, mode-imputed, and one-hot encoded.
- **Identifier Columns**: Columns named `patient_id`, `id`, `case_id` or with 100% unique sequence keys are auto-flagged and excluded from training to prevent data leakage.
- **Constant Columns**: Features with zero variance are flagged and excluded.
