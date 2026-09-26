import io
import os
import re
import pandas as pd
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth.rbac import UserRecord, require_permission
from app.config import settings
from app.data.profiler import DatasetProfiler
from app.data.sample_loader import get_available_samples, load_sample_dataset
from app.experiments.schemas import ExperimentCreateRequest
from app.experiments.service import experiment_service
from app.schemas import (
    DatasetConfigRequest,
    DatasetProfileResponse,
    SampleDatasetItem,
)
from app.state import app_state

router = APIRouter(prefix="/dataset", tags=["Dataset Management"])


def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filename to prevent directory traversal and special character attacks."""
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
    if not clean.lower().endswith(".csv"):
        clean += ".csv"
    return clean[:100]


@router.get("/samples", response_model=List[SampleDatasetItem])
async def list_sample_datasets():
    """Retrieve bundled clinical sample datasets."""
    return get_available_samples()


@router.post("/load-sample", response_model=DatasetProfileResponse)
async def load_sample(
    sample_id: str,
    user: UserRecord = Depends(require_permission("dataset:configure")),
):
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

        # Create/sync active experiment in repository
        experiment_service.create_experiment(
            ExperimentCreateRequest(
                experiment_name=f"Benchmark ({meta['name']})",
                dataset_name=meta["name"],
                description=f"Loaded from bundled sample {sample_id}",
                dataset_config=app_state.dataset_config,
            ),
            df=df,
            user_id=user.username,
        )

        return profile_res
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load sample dataset: {str(e)}")


@router.post("/upload", response_model=DatasetProfileResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    user: UserRecord = Depends(require_permission("dataset:upload")),
):
    """Upload a custom biomedical CSV dataset with security validation and statistical profiling."""
    clean_name = sanitize_filename(file.filename or "uploaded_dataset.csv")

    if not clean_name.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only standard comma-separated tabular (.csv) files are permitted.",
        )

    # 1. File Size Enforcement
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    try:
        contents = await file.read(max_bytes + 1)
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Upload exceeds maximum allowable file size limit ({settings.MAX_UPLOAD_SIZE_MB} MB).",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read upload stream: {str(e)}")

    # 2. Parse & Content Validation
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed CSV file. Could not parse rows and headers: {str(e)}",
        )

    if df.empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded CSV dataset contains 0 rows.")

    if len(df) < 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dataset has {len(df)} rows. A minimum of 15 rows is required for 5-fold cross-validation.",
        )

    if len(df) > settings.MAX_UPLOAD_ROWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dataset has {len(df)} rows, exceeding safety limit of {settings.MAX_UPLOAD_ROWS} rows for quantum simulation.",
        )

    if len(df.columns) > settings.MAX_UPLOAD_COLUMNS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dataset has {len(df.columns)} columns, exceeding maximum limit of {settings.MAX_UPLOAD_COLUMNS} features.",
        )

    # 3. Update active state and experiment repository
    app_state.reset_for_new_dataset(df, dataset_name=clean_name)
    profiler = DatasetProfiler(df, dataset_name=clean_name)
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

    experiment_service.create_experiment(
        ExperimentCreateRequest(
            experiment_name=f"Custom Upload ({clean_name})",
            dataset_name=clean_name,
            description="User uploaded biomedical dataset",
            dataset_config=app_state.dataset_config,
        ),
        df=df,
        user_id=user.username,
    )

    return profile_res


@router.get("/profile", response_model=DatasetProfileResponse)
async def get_current_profile(
    target_column: Optional[str] = None,
    user: UserRecord = Depends(require_permission("dataset:view")),
):
    """Retrieve or re-compute profile for current active dataset."""
    if app_state.raw_df is None:
        raise HTTPException(status_code=404, detail="No dataset currently loaded. Please upload or load a sample.")

    profiler = DatasetProfiler(app_state.raw_df, dataset_name=app_state.dataset_name)
    profile_res = profiler.profile(target_column=target_column)
    app_state.dataset_profile = profile_res
    return profile_res


@router.post("/configure", response_model=DatasetConfigRequest)
async def configure_dataset(
    config: DatasetConfigRequest,
    user: UserRecord = Depends(require_permission("dataset:configure")),
):
    """Save user configuration for target column, positive class, and excluded identifiers."""
    if app_state.raw_df is None:
        raise HTTPException(status_code=404, detail="No active dataset loaded to configure.")

    if config.target_column not in app_state.raw_df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{config.target_column}' not found in dataset.")

    # Validate target has at least 2 classes
    unique_classes = app_state.raw_df[config.target_column].dropna().unique()
    if len(unique_classes) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{config.target_column}' must have at least 2 distinct classes.",
        )

    app_state.dataset_config = config
    
    # Sync with active experiment if exists
    active_exp = experiment_service.get_active_experiment()
    if active_exp:
        active_exp.dataset_config = config
        active_exp.target_column = config.target_column
        active_exp.positive_class = config.positive_class
        experiment_service.repo.save(active_exp)

    return config
