"""
Quantum Utility Report Router — Q-CARE Platform
================================================
Generates a structured "Quantum Utility Report" at the conclusion of an
experiment. The report is exportable as JSON or CSV.

IMPORTANT: Conclusions in this report are OBSERVATIONAL only.
No formal statistical significance testing is applied.
"""
import csv
import io
import json
import numpy as np
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.auth.rbac import UserRecord, require_permission
from app.schemas import QuantumUtilityReport
from app.state import app_state

router = APIRouter(tags=["Quantum Utility Report"])


def _build_report() -> QuantumUtilityReport:
    """Assemble a QuantumUtilityReport from current app_state."""
    bench = app_state.benchmark_summary
    meta = app_state.experiment_metadata

    if bench is None:
        raise HTTPException(
            status_code=400,
            detail="No benchmark results available. Please run training first.",
        )

    now = datetime.now(timezone.utc).isoformat()
    exp_id = getattr(bench, "experiment_id", None) or (meta.experiment_id if meta else "exp-active") or "exp-active"

    vqc_res = bench.results.get("vqc") if (bench.results and isinstance(bench.results, dict)) else None
    cv_metrics: dict = {}
    held_out_metrics: dict = {}
    if vqc_res:
        m = vqc_res.metrics
        held_out_metrics = {
            "roc_auc": getattr(m, "roc_auc", 0.0),
            "accuracy": getattr(m, "accuracy", 0.0),
            "f1_score": getattr(m, "f1_score", 0.0),
            "brier_score": getattr(m, "brier_score", 0.0),
            "sensitivity": getattr(m, "sensitivity", 0.0),
            "specificity": getattr(m, "specificity", 0.0),
        }
        if vqc_res.mean_metrics and vqc_res.std_metrics:
            std_obj = vqc_res.std_metrics
            cv_metrics = {
                "roc_auc_mean": getattr(vqc_res.mean_metrics, "roc_auc", 0.0),
                "roc_auc_std": getattr(std_obj, "roc_auc", std_obj.get("roc_auc", 0.0) if isinstance(std_obj, dict) else 0.0),
                "accuracy_mean": getattr(vqc_res.mean_metrics, "accuracy", 0.0),
                "accuracy_std": getattr(std_obj, "accuracy", std_obj.get("accuracy", 0.0) if isinstance(std_obj, dict) else 0.0),
                "f1_mean": getattr(vqc_res.mean_metrics, "f1_score", 0.0),
                "f1_std": getattr(std_obj, "f1_score", std_obj.get("f1_score", 0.0) if isinstance(std_obj, dict) else 0.0),
            }

    classical_baselines = {}
    if bench.results and isinstance(bench.results, dict):
        for mid, res in bench.results.items():
            if mid == "vqc":
                continue
            m = res.metrics
            classical_baselines[mid] = {
                "roc_auc": getattr(m, "roc_auc", 0.0),
                "accuracy": getattr(m, "accuracy", 0.0),
                "f1_score": getattr(m, "f1_score", 0.0),
                "brier_score": getattr(m, "brier_score", 0.0),
            }

    noise_robustness: dict = {}
    if bench.noisy_vqc_result:
        noisy = bench.noisy_vqc_result
        noise_info = getattr(noisy, "noise_info", None) or bench.noise_execution_info
        ideal_auc = held_out_metrics.get("roc_auc", 0.01)
        noisy_auc = getattr(noisy.metrics, "roc_auc", 0.0)
        retention = round((noisy_auc / max(0.01, ideal_auc)) * 100.0, 1) if ideal_auc > 0 else 0.0
        
        exec_mode = "AER_EXECUTION"
        err_1q = 0.01
        err_2q = 0.03
        err_ro = 0.02
        if noise_info:
            exec_mode = getattr(noise_info, "execution_mode", "AER_EXECUTION")
            err_1q = getattr(noise_info, "one_qubit_gate_error", getattr(noise_info, "depolarizing_error_1q", 0.01))
            err_2q = getattr(noise_info, "two_qubit_gate_error", getattr(noise_info, "depolarizing_error_2q", 0.03))
            err_ro = getattr(noise_info, "readout_error", 0.02)

        noise_robustness = {
            "execution_mode": exec_mode,
            "noisy_roc_auc": noisy_auc,
            "ideal_roc_auc": ideal_auc,
            "auc_retention_pct": retention,
            "noise_one_qubit_error": err_1q,
            "noise_two_qubit_error": err_2q,
            "noise_readout_error": err_ro,
        }

    resource_usage: dict = {}
    if vqc_res:
        resource_usage["vqc_training_time_s"] = getattr(vqc_res.metrics, "training_time_seconds", 0.0)
        resource_usage["vqc_inference_time_ms"] = getattr(vqc_res.metrics, "inference_time_ms", 0.0)

    fold_variability: dict = {}
    folds = getattr(vqc_res, "fold_metrics", None) or getattr(vqc_res, "folds", None)
    if folds:
        aucs = []
        for f in folds:
            if hasattr(f, "metrics"):
                aucs.append(getattr(f.metrics, "roc_auc", 0.0))
            elif isinstance(f, dict) and "metrics" in f:
                m_sub = f["metrics"]
                aucs.append(getattr(m_sub, "roc_auc", m_sub.get("roc_auc", 0.0) if isinstance(m_sub, dict) else 0.0))
            else:
                aucs.append(getattr(f, "roc_auc", 0.0))
        fold_variability["vqc_fold_roc_aucs"] = aucs
        fold_variability["vqc_roc_auc_range"] = round(max(aucs) - min(aucs), 4) if aucs else 0.0
        fold_variability["vqc_roc_auc_std"] = round(float(np.std(aucs)), 4) if aucs else 0.0

    expl_summary: dict = {}
    vqc_expl = getattr(app_state, "explainability_cache", {}).get("vqc")
    if vqc_expl:
        expl_summary["vqc_method"] = getattr(vqc_expl, "method_name", "Quantum Kernel Sensitivity")
        feats = getattr(vqc_expl, "features", [])
        expl_summary["vqc_top_features"] = [
            {"feature": getattr(f, "feature_name", str(f)), "sensitivity": getattr(f, "importance_score", 0.0)}
            for f in feats[:3]
        ]

    evidence = bench.evidence
    verdict = getattr(evidence, "verdict", "INSUFFICIENT_EVIDENCE") if evidence else "INSUFFICIENT_EVIDENCE"
    verdict_explanation = (
        getattr(evidence, "verdict_explanation", None)
        or getattr(evidence, "methodological_statement", None)
        or getattr(evidence, "summary", "")
        or "Empirical evaluation complete. Results are observational and benchmark-specific."
    )

    q_auc = held_out_metrics.get("roc_auc", 0.0)
    best_c_auc = max((v["roc_auc"] for v in classical_baselines.values()), default=0.0)
    auc_delta = q_auc - best_c_auc

    if auc_delta > 0.03:
        conclusion = (
            f"Under the selected experimental configuration, the quantum model (VQC) showed "
            f"a higher observed ROC-AUC than the strongest classical baseline (+{auc_delta:.3f}). "
        )
    elif abs(auc_delta) <= 0.03:
        conclusion = (
            f"Under the selected experimental configuration, the quantum model (VQC) was "
            f"competitive with the strongest classical baseline (observed ROC-AUC delta: {auc_delta:+.3f}). "
        )
    else:
        conclusion = (
            f"Under the selected experimental configuration, classical models showed "
            f"higher observed ROC-AUC than the VQC (delta: {auc_delta:+.3f}). "
        )

    if noise_robustness:
        ret = noise_robustness.get("auc_retention_pct", 0)
        mode = noise_robustness.get("execution_mode", "UNKNOWN")
        conclusion += f"The VQC retained {ret}% of its ideal ROC-AUC under simulated noise ({mode}). "

    conclusion += (
        "These results do not establish quantum advantage. "
        "No formal statistical significance test was applied."
    )

    # Generate strengths, limitations, disclaimers for frontend UI
    q_dims = getattr(meta, "n_qubits", getattr(meta, "pca_components", getattr(meta, "n_quantum_features", 6))) if meta else 6
    ansatz_name = getattr(meta, "ansatz", "RealAmplitudes") if meta else "RealAmplitudes"
    layers = getattr(meta, "ansatz_layers", 2) if meta else 2
    fmap_name = getattr(meta, "feature_map", "ZZFeatureMap") if meta else "ZZFeatureMap"
    opt_name = getattr(meta, "optimizer", getattr(meta, "quantum_optimizer", "COBYLA")) if meta else "COBYLA"
    t_mode = getattr(meta, "training_mode", getattr(meta, "quantum_execution_mode", "DEMO_MODE")) if meta else "DEMO_MODE"
    vqc_samples = getattr(meta, "vqc_training_samples_used", getattr(meta, "train_samples", getattr(meta, "n_samples_train", 0))) if meta else 0
    vqc_iters = getattr(meta, "max_iterations", getattr(meta, "quantum_max_iterations", 25)) if meta else 25
    total_samples = getattr(meta, "dataset_rows", 0) or ((getattr(meta, "train_samples", 0) + getattr(meta, "test_samples", 0)) if meta else (getattr(bench, "test_samples_count", 0) or 0))
    total_features = getattr(meta, "dataset_columns", getattr(meta, "n_samples_total", 0)) if meta else 0

    strengths = [
        f"Observed VQC Held-out ROC-AUC of {q_auc:.3f} across stratified test partitions.",
        f"Compact quantum feature representation with {q_dims} principal quantum features and {layers}-layer {ansatz_name} ansatz.",
    ]
    if noise_robustness:
        strengths.append(f"Demonstrated {noise_robustness.get('auc_retention_pct', 0)}% metric retention under simulated gate and readout depolarizing noise.")
    if resource_usage.get("vqc_inference_time_ms"):
        strengths.append(f"Low statevector inference latency of {resource_usage['vqc_inference_time_ms']:.2f} ms per sample.")

    limitations = [
        f"Dimensionality reduction required (compressed to {q_dims} qubits) due to NISQ device size limitations.",
        "Simulated on classical statevector/Aer backend; hardware execution subject to physical decoherence (T1/T2) and crosstalk.",
        "Variational optimization landscape is susceptible to barren plateaus in deeper circuit configurations.",
    ]

    disclaimers = [
        "Observational scientific benchmark only — does NOT constitute formal proof of quantum advantage or supremacy.",
        "Validation performed on retrospective tabular datasets; requires prospective multi-center trial verification before clinical use.",
        "Decision support system only; all diagnostic inferences must be reviewed by qualified medical specialists.",
    ]

    return QuantumUtilityReport(
        experiment_id=exp_id,
        generated_at=now,
        dataset_name=bench.dataset_name,
        sample_count=total_samples,
        feature_count=total_features,
        quantum_dimensions=q_dims,
        n_qubits=q_dims,
        feature_map=fmap_name,
        ansatz=ansatz_name,
        ansatz_layers=layers,
        optimizer=opt_name,
        training_mode=t_mode,
        vqc_training_samples=vqc_samples,
        vqc_iterations=vqc_iters,
        cv_metrics=cv_metrics,
        held_out_metrics=held_out_metrics,
        classical_baselines=classical_baselines,
        noise_robustness=noise_robustness,
        resource_usage=resource_usage,
        fold_variability=fold_variability,
        disagreement_summary=None,
        explainability_summary=expl_summary,
        evidence_verdict=verdict,
        evidence_explanation=verdict_explanation,
        benchmark_verdict=verdict,
        verdict_explanation=verdict_explanation,
        quantum_strengths=strengths,
        quantum_limitations=limitations,
        methodological_disclaimers=disclaimers,
        conclusion=conclusion,
    )


@router.get("/report/utility", response_model=QuantumUtilityReport)
@router.get("/report/quantum-utility", response_model=QuantumUtilityReport)
async def get_utility_report(
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Generate and return the Quantum Utility Report for the current experiment."""
    try:
        return _build_report()
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating utility report: {str(e)}")


@router.get("/report/utility/export/json")
@router.get("/report/export-json")
async def export_utility_report_json(
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Export the Quantum Utility Report as a JSON file."""
    try:
        report = _build_report()
        content = report.model_dump_json(indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="qcare_utility_report_{report.experiment_id}.json"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting JSON report: {str(e)}")


@router.get("/report/utility/export/csv")
@router.get("/report/export-csv")
async def export_utility_report_csv(
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Export a flat CSV summary of the Quantum Utility Report."""
    try:
        report = _build_report()

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Q-CARE Quantum Utility Report"])
        writer.writerow(["Generated At", report.generated_at])
        writer.writerow(["Experiment ID", report.experiment_id])
        writer.writerow([])

        writer.writerow(["=== Dataset ==="])
        writer.writerow(["Dataset Name", report.dataset_name])
        writer.writerow(["Sample Count", report.sample_count])
        writer.writerow(["Quantum Dimensions (PCA)", report.quantum_dimensions])
        writer.writerow([])

        writer.writerow(["=== Quantum Circuit ==="])
        writer.writerow(["Qubits", report.n_qubits])
        writer.writerow(["Feature Map", report.feature_map])
        writer.writerow(["Ansatz", report.ansatz])
        writer.writerow(["Ansatz Layers", report.ansatz_layers])
        writer.writerow(["Optimizer", report.optimizer])
        writer.writerow(["Training Mode", report.training_mode])
        writer.writerow([])

        writer.writerow(["=== VQC Held-Out Test Metrics ==="])
        for k, v in report.held_out_metrics.items():
            writer.writerow([k, v])
        writer.writerow([])

        writer.writerow(["=== Classical Baselines (Held-Out Test) ==="])
        for model_id, metrics in report.classical_baselines.items():
            for k, v in metrics.items():
                writer.writerow([f"{model_id}.{k}", v])
        writer.writerow([])

        writer.writerow(["=== Evidence Verdict ==="])
        writer.writerow(["Verdict", report.evidence_verdict])
        writer.writerow(["Explanation", report.evidence_explanation])
        writer.writerow([])

        writer.writerow(["=== Conclusion ==="])
        writer.writerow([report.conclusion])

        content = output.getvalue().encode("utf-8")
        return StreamingResponse(
            io.BytesIO(content),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="qcare_utility_report_{report.experiment_id}.csv"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting CSV report: {str(e)}")


@router.get("/experiment/metadata")
@router.get("/report/experiment-metadata")
async def get_experiment_metadata(
    user: UserRecord = Depends(require_permission("evidence:view")),
):
    """Return the full experiment metadata for the current benchmark run."""
    if app_state.experiment_metadata is None:
        raise HTTPException(status_code=404, detail="No experiment metadata available. Please run training first.")
    return app_state.experiment_metadata

