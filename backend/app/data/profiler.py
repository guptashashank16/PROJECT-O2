import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional
from app.schemas import ColumnProfile, DatasetProfileResponse, TargetClassDistribution


class DatasetProfiler:
    """Automated inspection and statistical profiling of clinical tabular datasets."""

    IDENTIFIER_KEYWORDS = {
        "id", "patient_id", "patientid", "record_id", "case_id", "subject_id",
        "mrn", "hospital_id", "sample_id", "patient", "index", "unnamed: 0"
    }
    
    TARGET_KEYWORDS = {
        "target", "diagnosis", "outcome", "class", "label", "disease", "status",
        "heart_disease_risk", "diabetes_outcome", "recurrence", "condition", "risk"
    }

    def __init__(self, df: pd.DataFrame, dataset_name: str = "Uploaded Dataset"):
        self.df = df.copy()
        self.dataset_name = dataset_name

    def profile(self, target_column: Optional[str] = None) -> DatasetProfileResponse:
        total_rows = len(self.df)
        total_columns = len(self.df.columns)
        duplicate_rows = int(self.df.duplicated().sum())
        missing_values_total = int(self.df.isna().sum().sum())

        column_profiles: List[ColumnProfile] = []
        constant_columns: List[str] = []
        suggested_identifiers: List[str] = []
        candidate_targets: List[str] = []

        for col_name in self.df.columns:
            series = self.df[col_name]
            unique_count = int(series.nunique(dropna=True))
            missing_count = int(series.isna().sum())
            missing_percentage = float(round((missing_count / total_rows) * 100, 2)) if total_rows > 0 else 0.0

            # Determine Column Type
            is_const = unique_count <= 1
            if is_const:
                constant_columns.append(col_name)

            col_lower = str(col_name).lower().strip()
            
            # Identifier Detection Heuristics
            is_id_keyword = col_lower in self.IDENTIFIER_KEYWORDS or col_lower.endswith("_id") or col_lower.startswith("id_")
            is_high_unique_seq = (
                unique_count == total_rows
                and pd.api.types.is_string_dtype(series)
                and not pd.api.types.is_numeric_dtype(series)
            )
            is_candidate_identifier = (is_id_keyword or is_high_unique_seq) and not is_const

            if is_candidate_identifier:
                suggested_identifiers.append(col_name)

            # Target Detection Heuristics
            is_target_keyword = col_lower in self.TARGET_KEYWORDS
            is_binary = unique_count == 2
            is_candidate_target = (is_target_keyword or (is_binary and not is_candidate_identifier)) and not is_const

            if is_candidate_target:
                candidate_targets.append(col_name)

            # Inferred Type
            if is_const:
                inferred_type = "constant"
            elif is_candidate_identifier:
                inferred_type = "identifier"
            elif pd.api.types.is_numeric_dtype(series):
                inferred_type = "numerical"
            else:
                inferred_type = "categorical"

            # Numerical statistics
            min_val = None
            max_val = None
            mean_val = None
            median_val = None
            categories = None

            if pd.api.types.is_numeric_dtype(series) and unique_count > 0:
                valid_series = series.dropna()
                if len(valid_series) > 0:
                    min_val = float(valid_series.min())
                    max_val = float(valid_series.max())
                    mean_val = float(round(valid_series.mean(), 4))
                    median_val = float(round(valid_series.median(), 4))
            else:
                # Top distinct categories
                categories = [str(val) for val in series.dropna().unique()[:20]]

            # Sample non-null values
            sample_vals = [
                float(v) if isinstance(v, (np.floating, float)) else (int(v) if isinstance(v, (np.integer, int)) else str(v))
                for v in series.dropna().head(5).tolist()
            ]

            column_profiles.append(
                ColumnProfile(
                    name=str(col_name),
                    dtype=str(series.dtype),
                    inferred_type=inferred_type,
                    missing_count=missing_count,
                    missing_percentage=missing_percentage,
                    unique_count=unique_count,
                    sample_values=sample_vals,
                    is_candidate_target=is_candidate_target,
                    is_candidate_identifier=is_candidate_identifier,
                    min_value=min_val,
                    max_value=max_val,
                    mean_value=mean_val,
                    median_value=median_val,
                    categories=categories,
                )
            )

        numerical_count = sum(1 for c in column_profiles if c.inferred_type == "numerical")
        categorical_count = sum(1 for c in column_profiles if c.inferred_type in ("categorical", "constant"))

        # Determine suggested target
        suggested_target_col = target_column
        if not suggested_target_col:
            # Prioritize target keyword matches first
            keyword_matches = [c for c in candidate_targets if str(c).lower().strip() in self.TARGET_KEYWORDS]
            if keyword_matches:
                suggested_target_col = keyword_matches[0]
            elif candidate_targets:
                suggested_target_col = candidate_targets[-1]
            elif len(self.df.columns) > 0:
                suggested_target_col = self.df.columns[-1]

        # Target distribution
        target_dist: Optional[List[TargetClassDistribution]] = None
        suggested_positive_class: Optional[str] = None

        if suggested_target_col and suggested_target_col in self.df.columns:
            target_series = self.df[suggested_target_col].dropna()
            val_counts = target_series.value_counts()
            
            target_dist = []
            for label, count in val_counts.items():
                pct = float(round((count / len(target_series)) * 100, 2)) if len(target_series) > 0 else 0.0
                target_dist.append(
                    TargetClassDistribution(
                        class_label=str(label),
                        count=int(count),
                        percentage=pct
                    )
                )

            # Heuristic for positive class (e.g., "1", "M", "malignant", "positive", "high risk", "yes", "true")
            pos_keywords = {"1", "m", "malignant", "positive", "high risk", "yes", "true", "diseased", "abnormal"}
            for item in target_dist:
                if str(item.class_label).strip().lower() in pos_keywords:
                    suggested_positive_class = item.class_label
                    break
            if not suggested_positive_class and len(target_dist) > 0:
                # Default to minority class or second class
                suggested_positive_class = str(target_dist[-1].class_label)

        # Generate JSON-safe preview rows
        preview_df = self.df.head(5).replace({np.nan: None})
        preview_rows = preview_df.to_dict(orient="records")

        return DatasetProfileResponse(
            dataset_name=self.dataset_name,
            total_rows=total_rows,
            total_columns=total_columns,
            numerical_count=numerical_count,
            categorical_count=categorical_count,
            missing_values_total=missing_values_total,
            duplicate_rows=duplicate_rows,
            constant_columns=constant_columns,
            columns=column_profiles,
            suggested_target=suggested_target_col,
            suggested_positive_class=suggested_positive_class,
            suggested_identifiers=suggested_identifiers,
            target_distribution=target_dist,
            preview_rows=preview_rows,
        )
