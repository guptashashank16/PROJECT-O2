import io
import pandas as pd
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.data.profiler import DatasetProfiler
from app.data.sample_loader import get_available_samples, load_sample_dataset
from app.schemas import (
    DatasetConfigRequest,
    DatasetProfileResponse,
    SampleDatasetItem,
)
from app.state import app_state

router = APIRouter(prefix="/dataset", tags=["Dataset Management"])


@router.get("/samples", response_model=List[SampleDatasetItem])
async def list_sample_datasets():
    """Retrieve bundled clinical sample datasets."""
    return get_available_samples()


@router.post("/load-sample", response_model=DatasetProfileResponse)
async def load_sample(sample_id: str):
    """Load a bundled clinical dataset by ID and compute its statistical profile."""
    try:
        df, meta = load_sample_dataset(sample_id)
        app_state.reset_for_new_dataset(df, dataset_name=meta["name"])
        
        profiler = DatasetProfiler(df, dataset_name=meta["name"])
        profile_res = profiler.profile(target_column=meta["suggested_target"])
        app_state.dataset_profile = profile_res

        # Default configuration
        app_state.dataset_config = DatasetConfigRequest(
            target_column=profile_res.suggested_target or "",
            positive_class=profile_res.suggested_positive_class or "",
            identifier_columns=profile_res.suggested_identifiers,
            excluded_features=[],
            problem_type="binary_classification",
        )

        return profile_res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load sample dataset: {str(e)}")


@router.post("/upload", response_model=DatasetProfileResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a custom clinical CSV dataset, validate, and compute its profile."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV dataset is empty.")

        if len(df) < 15:
            raise HTTPException(status_code=400, detail="Dataset must contain at least 15 rows for train/test splitting.")

        app_state.reset_for_new_dataset(df, dataset_name=file.filename)
        profiler = DatasetProfiler(df, dataset_name=file.filename)
        profile_res = profiler.profile()
        app_state.dataset_profile = profile_res

        # Initialize default configuration
        app_state.dataset_config = DatasetConfigRequest(
            target_column=profile_res.suggested_target or "",
            positive_class=profile_res.suggested_positive_class or "",
            identifier_columns=profile_res.suggested_identifiers,
            excluded_features=[],
            problem_type="binary_classification",
        )

        return profile_res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing dataset: {str(e)}")


@router.get("/profile", response_model=DatasetProfileResponse)
async def get_current_profile(target_column: Optional[str] = None):
    """Retrieve or re-compute profile for current active dataset."""
    if app_state.raw_df is None:
        raise HTTPException(status_code=404, detail="No dataset currently loaded. Please upload or load a sample.")

    profiler = DatasetProfiler(app_state.raw_df, dataset_name=app_state.dataset_name)
    profile_res = profiler.profile(target_column=target_column)
    app_state.dataset_profile = profile_res
    return profile_res


@router.post("/configure", response_model=DatasetConfigRequest)
async def configure_dataset(config: DatasetConfigRequest):
    """Save user configuration for target column, positive class, and excluded identifiers."""
    if app_state.raw_df is None:
        raise HTTPException(status_code=404, detail="No active dataset loaded to configure.")

    if config.target_column not in app_state.raw_df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{config.target_column}' not found in dataset.")

    # Validate target has at least 2 classes
    unique_classes = app_state.raw_df[config.target_column].dropna().unique()
    if len(unique_classes) < 2:
        raise HTTPException(status_code=400, detail=f"Target column '{config.target_column}' must have at least 2 distinct classes.")

    app_state.dataset_config = config
    return config
