from pathlib import Path
from typing import Any, Dict, List, Tuple
import pandas as pd
from app.config import settings
from app.schemas import SampleDatasetItem


SAMPLE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "breast_cancer_wisconsin": {
        "id": "breast_cancer_wisconsin",
        "name": "Breast Cancer Wisconsin (Diagnostic)",
        "filename": "breast_cancer_wisconsin.csv",
        "description": "Continuous cell nucleus morphology features computed from digitized FNA images for breast mass classification.",
        "suggested_target": "diagnosis",
        "suggested_positive_class": "M",
        "suggested_identifiers": ["id"],
    },
    "heart_disease_cleveland": {
        "id": "heart_disease_cleveland",
        "name": "Cleveland Cardiovascular Disease Risk",
        "filename": "heart_disease_cleveland.csv",
        "description": "Mixed clinical patient demographics, resting ECG, blood chemistry, and exercise test results.",
        "suggested_target": "heart_disease_risk",
        "suggested_positive_class": "High Risk",
        "suggested_identifiers": ["patient_id"],
    },
    "diabetes_pima": {
        "id": "diabetes_pima",
        "name": "Pima Indians Diabetes Diagnostic",
        "filename": "diabetes_pima.csv",
        "description": "Clinical diagnostic measurements for diabetes risk assessment including glucose, BMI, and insulin levels.",
        "suggested_target": "diabetes_outcome",
        "suggested_positive_class": "Positive",
        "suggested_identifiers": ["patient_id"],
    },
}


def get_available_samples() -> List[SampleDatasetItem]:
    """Retrieve metadata of all available sample datasets."""
    samples = []
    for sample_id, meta in SAMPLE_REGISTRY.items():
        file_path = settings.SAMPLES_DIR / meta["filename"]
        if file_path.exists():
            df = pd.read_csv(file_path)
            samples.append(
                SampleDatasetItem(
                    id=sample_id,
                    name=meta["name"],
                    description=meta["description"],
                    rows=len(df),
                    columns=len(df.columns),
                    suggested_target=meta["suggested_target"],
                    suggested_positive_class=meta["suggested_positive_class"],
                )
            )
    return samples


def load_sample_dataset(sample_id: str) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Load a sample dataset by ID."""
    if sample_id not in SAMPLE_REGISTRY:
        raise ValueError(f"Sample dataset '{sample_id}' not found.")
    
    meta = SAMPLE_REGISTRY[sample_id]
    file_path = settings.SAMPLES_DIR / meta["filename"]
    if not file_path.exists():
        raise FileNotFoundError(f"Sample file {meta['filename']} does not exist.")
        
    df = pd.read_csv(file_path)
    return df, meta
