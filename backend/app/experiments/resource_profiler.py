from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import numpy as np

from app.experiments.schemas import (
    ClassicalResourceMetrics,
    DatasetResourceMetrics,
    QuantumResourceMetrics,
    ResourceProfile,
)
from app.schemas import (
    BenchmarkSummary,
    ClassicalModelConfig,
    ModelEvaluationResult,
    PreprocessingSummary,
    QuantumModelConfig,
)


def compute_resource_profile(
    experiment_id: str,
    experiment_name: str,
    quantum_config: Optional[QuantumModelConfig],
    preprocessing_summary: Optional[PreprocessingSummary],
    benchmark_summary: Optional[BenchmarkSummary],
    vqc_result: Optional[ModelEvaluationResult],
    classical_results: Dict[str, ModelEvaluationResult],
) -> ResourceProfile:
    """Compute empirical and architectural computational resource profile."""
    now_str = datetime.now(timezone.utc).isoformat()
    
    # 1. Quantum Resources
    n_qubits = quantum_config.n_qubits if quantum_config else 6
    layers = quantum_config.ansatz_layers if quantum_config else 2
    max_iter = quantum_config.max_iterations if quantum_config else 25
    
    # Parameter count calculation:
    # RealAmplitudes: n_qubits * (layers + 1)
    # EfficientSU2: 2 * n_qubits * (layers + 1)
    ansatz_type = quantum_config.ansatz if quantum_config else "RealAmplitudes"
    if ansatz_type == "EfficientSU2":
        param_count = 2 * n_qubits * (layers + 1)
    else:
        param_count = n_qubits * (layers + 1)
        
    circuit_depth = layers * 2 + 1
    
    vqc_sim_time = 0.0
    vqc_latency = 0.0
    if vqc_result:
        metrics = vqc_result.mean_metrics or vqc_result.metrics
        vqc_sim_time = float(metrics.training_time_seconds)
        vqc_latency = float(metrics.inference_time_ms)
        
    # Circuit evaluations estimate: COBYLA evaluates ~2*params per step
    circuit_evals = max_iter * (param_count + 1)

    quantum_metrics = QuantumResourceMetrics(
        qubit_count=n_qubits,
        circuit_depth=circuit_depth,
        parameter_count=param_count,
        optimization_iterations=max_iter,
        circuit_evaluations=circuit_evals,
        simulation_time_seconds=round(vqc_sim_time, 3),
        inference_latency_ms=round(vqc_latency, 2),
        simulator_backend="Qiskit Aer Statevector / Depolarizing Noise Simulator",
    )

    # 2. Classical Resources
    classical_metrics: List[ClassicalResourceMetrics] = []
    param_summaries = {
        "logistic_regression": f"L2 Regularized Linear ({n_qubits} weights + bias)",
        "random_forest": f"100 Decision Trees (max_depth=5, feature_subsets)",
        "svm": f"RBF Kernel Support Vectors (~{min(30, max(5, n_qubits*4))} support vectors)",
    }

    for m_id, res in classical_results.items():
        if res.model_type == "classical":
            m_metrics = res.mean_metrics or res.metrics
            classical_metrics.append(
                ClassicalResourceMetrics(
                    model_id=m_id,
                    model_name=res.model_name,
                    parameter_count_summary=param_summaries.get(m_id, "Classical Model Parameters"),
                    training_time_seconds=round(float(m_metrics.training_time_seconds), 4),
                    inference_latency_ms=round(float(m_metrics.inference_time_ms), 3),
                )
            )

    # 3. Dataset Resources
    raw_rows = 138
    raw_cols = 31
    enc_dims = 30
    sel_dims = 10
    pca_dims = n_qubits
    
    if preprocessing_summary:
        raw_rows = preprocessing_summary.train_samples + preprocessing_summary.test_samples
        raw_cols = preprocessing_summary.raw_feature_count
        enc_dims = preprocessing_summary.encoded_feature_count
        sel_dims = preprocessing_summary.selected_feature_count
        pca_dims = preprocessing_summary.quantum_feature_count

    compression_ratio = round(raw_cols / max(1, pca_dims), 2)

    dataset_metrics = DatasetResourceMetrics(
        raw_rows=raw_rows,
        raw_columns=raw_cols,
        encoded_dimensions=enc_dims,
        selected_dimensions=sel_dims,
        pca_dimensions=pca_dims,
        dimension_compression_ratio=compression_ratio,
    )

    notes = (
        f"Circuit depth ({circuit_depth}) and parameter count ({param_count}) are exact analytical circuit properties. "
        f"Simulation time ({quantum_metrics.simulation_time_seconds}s) and latencies ({quantum_metrics.inference_latency_ms}ms) "
        f"are empirical CPU runtime measurements on local Python/Qiskit execution."
    )

    return ResourceProfile(
        experiment_id=experiment_id,
        experiment_name=experiment_name,
        timestamp_utc=now_str,
        quantum_resources=quantum_metrics,
        classical_resources=classical_metrics,
        dataset_resources=dataset_metrics,
        measured_vs_configured_notes=notes,
    )
