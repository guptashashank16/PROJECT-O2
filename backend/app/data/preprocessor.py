import numpy as np
import pandas as pd
from typing import Any, Dict, List, Optional, Tuple
from sklearn.compose import ColumnTransformer
from sklearn.decomposition import PCA
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder, StandardScaler

from app.schemas import (
    DatasetConfigRequest,
    FeaturePipelineStep,
    PreprocessingRequest,
    PreprocessingSummary,
)


class ClinicalPreprocessor:
    """Dataset-agnostic, leakage-free clinical data preprocessing pipeline."""

    def __init__(
        self,
        config: DatasetConfigRequest,
        params: PreprocessingRequest,
        random_state: int = 42,
    ):
        self.config = config
        self.params = params
        self.random_state = random_state

        # Fitted pipeline components
        self.column_transformer: Optional[ColumnTransformer] = None
        self.feature_selector: Optional[SelectKBest] = None
        self.pca: Optional[PCA] = None
        self.quantum_scaler: Optional[MinMaxScaler] = None

        # Schema metadata
        self.numerical_cols: List[str] = []
        self.categorical_cols: List[str] = []
        self.feature_names_in_: List[str] = []
        self.encoded_feature_names_: List[str] = []
        self.selected_feature_names_: List[str] = []
        self.class_labels_: List[str] = []
        self.positive_class_label: str = config.positive_class
        self.negative_class_label: str = ""

        # Transformation step audit
        self.pipeline_steps: List[FeaturePipelineStep] = []

    def _determine_column_types(self, df: pd.DataFrame) -> Tuple[List[str], List[str]]:
        excluded = set(self.config.identifier_columns + self.config.excluded_features + [self.config.target_column])
        feature_cols = [c for c in df.columns if c not in excluded]

        num_cols = []
        cat_cols = []
        for col in feature_cols:
            if pd.api.types.is_numeric_dtype(df[col]):
                num_cols.append(col)
            else:
                cat_cols.append(col)

        return num_cols, cat_cols

    def fit_and_split(
        self, df: pd.DataFrame
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, PreprocessingSummary]:
        """Split raw data into train and test partitions, then fit all transformations exclusively on train."""
        if self.config.target_column not in df.columns:
            raise ValueError(f"Target column '{self.config.target_column}' not present in dataset.")

        # Clean target and separate features
        valid_mask = df[self.config.target_column].notna()
        clean_df = df[valid_mask].copy()

        # Identify numerical and categorical features
        self.numerical_cols, self.categorical_cols = self._determine_column_types(clean_df)
        self.feature_names_in_ = self.numerical_cols + self.categorical_cols

        if not self.feature_names_in_:
            raise ValueError("No valid feature columns found after excluding identifiers and target.")

        # Binary label encoding: 1 for positive class, 0 for negative
        target_series = clean_df[self.config.target_column].astype(str).str.strip()
        unique_classes = target_series.unique().tolist()

        pos_label = str(self.config.positive_class).strip()
        if pos_label not in unique_classes:
            pos_label = unique_classes[0]
            self.positive_class_label = pos_label

        neg_candidates = [c for c in unique_classes if c != pos_label]
        self.negative_class_label = neg_candidates[0] if neg_candidates else "Negative"
        self.class_labels_ = [self.negative_class_label, self.positive_class_label]

        y_all = (target_series == pos_label).astype(int).values
        X_raw_df = clean_df[self.feature_names_in_]

        # Stratified train/test split to prevent leakage
        try:
            X_train_df, X_test_df, y_train, y_test = train_test_split(
                X_raw_df,
                y_all,
                test_size=self.params.test_split_ratio,
                random_state=self.random_state,
                stratify=y_all,
            )
        except ValueError:
            # Fallback if class distribution is too small for stratified split
            X_train_df, X_test_df, y_train, y_test = train_test_split(
                X_raw_df,
                y_all,
                test_size=self.params.test_split_ratio,
                random_state=self.random_state,
            )

        # 1. Build & Fit ColumnTransformer (Imputation + Scaling + OneHotEncoding)
        transformers = []
        if self.numerical_cols:
            num_scaler = StandardScaler() if self.params.scaler_type == "standard" else MinMaxScaler()
            num_pipe = Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", num_scaler),
                ]
            )
            transformers.append(("num", num_pipe, self.numerical_cols))

        if self.categorical_cols:
            cat_pipe = Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="most_frequent")),
                    ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                ]
            )
            transformers.append(("cat", cat_pipe, self.categorical_cols))

        self.column_transformer = ColumnTransformer(transformers=transformers, remainder="drop")
        X_train_enc = self.column_transformer.fit_transform(X_train_df)
        X_test_enc = self.column_transformer.transform(X_test_df)

        # Retrieve encoded feature names
        encoded_names = []
        if self.numerical_cols:
            encoded_names.extend(self.numerical_cols)
        if self.categorical_cols:
            cat_encoder = self.column_transformer.named_transformers_["cat"].named_steps["encoder"]
            cat_feature_names = cat_encoder.get_feature_names_out(self.categorical_cols)
            encoded_names.extend(cat_feature_names.tolist())
        self.encoded_feature_names_ = encoded_names

        raw_dim = len(self.feature_names_in_)
        enc_dim = X_train_enc.shape[1]

        self.pipeline_steps = [
            FeaturePipelineStep(
                step_name="Data Cleaning & Imputation",
                description="Median imputation for numerical features; mode imputation for categorical features.",
                input_dimension=raw_dim,
                output_dimension=raw_dim,
                details={"numerical_count": len(self.numerical_cols), "categorical_count": len(self.categorical_cols)},
            ),
            FeaturePipelineStep(
                step_name="Encoding & Feature Scaling",
                description=f"OneHotEncoding for categorical; {self.params.scaler_type.title()}Scaler for numerical.",
                input_dimension=raw_dim,
                output_dimension=enc_dim,
                details={"encoded_features": enc_dim},
            ),
        ]

        # 2. Optional feature selection (only when explicitly configured)
        k_best = self.params.feature_selection_k
        if k_best is not None and (k_best > enc_dim or k_best <= 0):
            k_best = min(enc_dim, max(2, min(enc_dim, 15)))

        if k_best is not None:
            self.feature_selector = SelectKBest(score_func=f_classif, k=min(k_best, enc_dim))
            X_train_sel = self.feature_selector.fit_transform(X_train_enc, y_train)
            X_test_sel = self.feature_selector.transform(X_test_enc)

            selected_mask = self.feature_selector.get_support()
            self.selected_feature_names_ = [
                self.encoded_feature_names_[i] for i, val in enumerate(selected_mask) if val
            ]
            sel_dim = X_train_sel.shape[1]
            self.pipeline_steps.append(
                FeaturePipelineStep(
                    step_name="Feature Selection",
                    description=f"ANOVA F-value feature scoring selecting top {sel_dim} predictive features.",
                    input_dimension=enc_dim,
                    output_dimension=sel_dim,
                    details={"selected_k": sel_dim},
                )
            )
        else:
            self.feature_selector = None
            X_train_sel = X_train_enc
            X_test_sel = X_test_enc
            self.selected_feature_names_ = list(self.encoded_feature_names_)
            sel_dim = X_train_sel.shape[1]

        # 3. PCA Dimensionality Reduction fitted exclusively on train
        n_q_features = min(self.params.n_quantum_features, sel_dim)
        self.pca = PCA(n_components=n_q_features, random_state=self.random_state)
        X_train_pca = self.pca.fit_transform(X_train_sel)
        X_test_pca = self.pca.transform(X_test_sel)

        # 4. Quantum Normalization ([0, pi] scaling for Pauli/ZZ feature maps)
        self.quantum_scaler = MinMaxScaler(feature_range=(0, np.pi))
        X_train_q = np.clip(self.quantum_scaler.fit_transform(X_train_pca), 0, np.pi)
        X_test_q = np.clip(self.quantum_scaler.transform(X_test_pca), 0, np.pi)

        exp_var = [float(round(v, 4)) for v in self.pca.explained_variance_ratio_]
        cum_var = float(round(float(np.sum(self.pca.explained_variance_ratio_)), 4))

        self.pipeline_steps.append(
            FeaturePipelineStep(
                step_name="Principal Component Analysis (PCA)",
                description=f"Linear dimensionality reduction to {n_q_features} orthogonal components.",
                input_dimension=sel_dim,
                output_dimension=n_q_features,
                details={
                    "explained_variance_ratio": exp_var,
                    "cumulative_variance": cum_var,
                },
            )
        )
        self.pipeline_steps.append(
            FeaturePipelineStep(
                step_name="Quantum State Normalization",
                description="Feature bounding into [0, π] domain for angle and ZZFeatureMap parameter binding.",
                input_dimension=n_q_features,
                output_dimension=n_q_features,
                details={"target_range": "[0, π]"},
            )
        )

        summary = PreprocessingSummary(
            raw_feature_count=raw_dim,
            encoded_feature_count=enc_dim,
            selected_feature_count=sel_dim,
            quantum_feature_count=n_q_features,
            train_samples=len(X_train_q),
            test_samples=len(X_test_q),
            positive_class=self.positive_class_label,
            negative_class=self.negative_class_label,
            target_column=self.config.target_column,
            excluded_identifiers=self.config.identifier_columns,
            pipeline_steps=self.pipeline_steps,
            pca_explained_variance_ratio=exp_var,
            pca_cumulative_variance=cum_var,
            selected_feature_names=self.selected_feature_names_,
        )

        return X_train_q, X_test_q, y_train, y_test, summary

    def fit_transform_fold(self, X_fold_train_df: pd.DataFrame, y_fold_train: np.ndarray) -> np.ndarray:
        """Fit all preprocessing transformations strictly on fold training data and return scaled quantum features."""
        self.numerical_cols, self.categorical_cols = self._determine_column_types(X_fold_train_df)
        self.feature_names_in_ = self.numerical_cols + self.categorical_cols

        transformers = []
        if self.numerical_cols:
            num_scaler = StandardScaler() if self.params.scaler_type == "standard" else MinMaxScaler()
            num_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", num_scaler),
            ])
            transformers.append(("num", num_pipe, self.numerical_cols))

        if self.categorical_cols:
            cat_pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ])
            transformers.append(("cat", cat_pipe, self.categorical_cols))

        self.column_transformer = ColumnTransformer(transformers=transformers, remainder="drop")
        X_enc = self.column_transformer.fit_transform(X_fold_train_df)

        enc_dim = X_enc.shape[1]
        k_best = self.params.feature_selection_k
        if k_best is not None and (k_best > enc_dim or k_best <= 0):
            k_best = min(enc_dim, max(2, min(enc_dim, 15)))

        if k_best is not None:
            self.feature_selector = SelectKBest(score_func=f_classif, k=min(k_best, enc_dim))
            X_sel = self.feature_selector.fit_transform(X_enc, y_fold_train)
        else:
            self.feature_selector = None
            X_sel = X_enc

        sel_dim = X_sel.shape[1]
        n_q_features = min(self.params.n_quantum_features, sel_dim)
        self.pca = PCA(n_components=n_q_features, random_state=self.random_state)
        X_pca = self.pca.fit_transform(X_sel)

        self.quantum_scaler = MinMaxScaler(feature_range=(0, np.pi))
        X_q = self.quantum_scaler.fit_transform(X_pca)
        return X_q

    def transform_fold(self, X_fold_val_df: pd.DataFrame) -> np.ndarray:
        """Transform fold validation data using fitted transforms without refitting."""
        if not self.column_transformer or not self.pca or not self.quantum_scaler:
            raise RuntimeError("Preprocessor fold transforms have not been fitted.")

        X_enc = self.column_transformer.transform(X_fold_val_df)
        if self.feature_selector is not None:
            X_sel = self.feature_selector.transform(X_enc)
        else:
            X_sel = X_enc

        X_pca = self.pca.transform(X_sel)
        X_q = self.quantum_scaler.transform(X_pca)
        return X_q


    def transform_single(self, patient_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Transform a single raw patient input dictionary through the fitted pipeline without refitting."""
        if not self.column_transformer or not self.pca or not self.quantum_scaler:
            raise RuntimeError("Pipeline has not been fitted yet.")

        # Create single-row dataframe with required columns
        row_data = {}
        for col in self.feature_names_in_:
            val = patient_dict.get(col)
            if val is None or val == "":
                row_data[col] = [np.nan]
            else:
                row_data[col] = [val]

        patient_df = pd.DataFrame(row_data)

        # 1. Encode & scale
        encoded = self.column_transformer.transform(patient_df)

        # 2. Select features
        if self.feature_selector is not None:
            selected = self.feature_selector.transform(encoded)
        else:
            selected = encoded

        # 3. PCA
        pca_transformed = self.pca.transform(selected)

        # 4. Quantum scaled
        quantum_ready = self.quantum_scaler.transform(pca_transformed)

        return {
            "encoded": encoded,
            "selected": selected,
            "pca": pca_transformed,
            "quantum_ready": quantum_ready,
        }
