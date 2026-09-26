"""
Quantum Evidence Engine
========================
Transparent 5-dimensional evidence synthesis for the Q-CARE platform.

IMPORTANT METHODOLOGICAL NOTE
------------------------------
This engine produces OBSERVATIONAL conclusions based on benchmark metrics.
It does NOT perform statistical significance testing (e.g., permutation tests,
DeLong AUC tests, bootstrap hypothesis tests).

Consequently, language such as "statistically significant" is deliberately
avoided.  All advantage claims are phrased as:
  - "observed performance advantage"
  - "observed ROC-AUC difference under the evaluation protocol"
  - "higher/lower under the selected experimental configuration"

Uncertainty (cross-validation standard deviation) is reported alongside every
mean metric.  Confidence intervals are reported where practical via bootstrap.
"""
import logging
from typing import Any, Dict, List, Optional

import numpy as np
from pydantic import BaseModel

logger = logging.getLogger("hybrid-quantum-medical-ai")


# ---------------------------------------------------------------------------
# Pydantic output models
# ---------------------------------------------------------------------------

class DimensionEvidence(BaseModel):
    dimension: str
    status: str           # "passed" | "neutral" | "warning"
    quantum_metric: float
    classical_metric: float
    delta: float
    quantum_std: float = 0.0
    classical_std: float = 0.0
    description: str
    fold_values: Optional[List[float]] = None  # per-fold quantum metric if available


class QuantumEvidenceSummary(BaseModel):
    verdict: str          # "QUANTUM_PREFERRED" | "QUANTUM_COMPETITIVE" | "CLASSICAL_PREFERRED" | "INSUFFICIENT_EVIDENCE"
    verdict_label: str
    verdict_explanation: str
    performance_evidence: DimensionEvidence
    generalization_evidence: DimensionEvidence
    calibration_evidence: DimensionEvidence
    robustness_evidence: DimensionEvidence
    resource_evidence: DimensionEvidence
    rule_breakdown: List[str]
    methodological_note: str = (
        "Conclusions are observational and based on held-out test and cross-validation metrics. "
        "No formal statistical significance test has been applied. "
        "Do not interpret metric differences as statistically significant without "
        "appropriate hypothesis testing (e.g., DeLong test, bootstrap)."
    )


# ---------------------------------------------------------------------------
# Bootstrap confidence interval helper
# ---------------------------------------------------------------------------

def _bootstrap_ci(values: List[float], n_bootstrap: int = 1000, ci: float = 0.95) -> Dict[str, float]:
    """
    Compute a bootstrap confidence interval for the mean of `values`.

    Returns dict with keys: mean, ci_lower, ci_upper, std.
    Requires at least 2 values; returns point estimate otherwise.
    """
    arr = np.array(values, dtype=float)
    if len(arr) < 2:
        v = float(arr[0]) if len(arr) == 1 else 0.0
        return {"mean": v, "std": 0.0, "ci_lower": v, "ci_upper": v}

    rng = np.random.default_rng(42)
    boot_means = [
        float(np.mean(rng.choice(arr, size=len(arr), replace=True)))
        for _ in range(n_bootstrap)
    ]
    alpha = (1.0 - ci) / 2.0
    return {
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr, ddof=1)),
        "ci_lower": float(np.percentile(boot_means, 100 * alpha)),
        "ci_upper": float(np.percentile(boot_means, 100 * (1 - alpha))),
    }


# ---------------------------------------------------------------------------
# Evidence Engine
# ---------------------------------------------------------------------------

class QuantumEvidenceEngine:
    """
    Transparent evidence synthesis engine for Q-CARE benchmarking.

    Evaluates five dimensions:
      1. Performance        — ROC-AUC on held-out test set
      2. Generalization     — Cross-validation fold variance
      3. Calibration        — Brier Score on held-out test set
      4. Noise Robustness   — AUC retention under Aer/fallback noise simulation
      5. Resource Cost      — Inference time ratio quantum vs. classical

    All verdicts are OBSERVATIONAL, not statistical proof of advantage.
    """

    @staticmethod
    def evaluate(
        vqc_metrics: Dict[str, float],
        best_classical_metrics: Dict[str, float],
        vqc_std: Dict[str, float],
        classical_std: Dict[str, float],
        noisy_vqc_metrics: Optional[Dict[str, float]] = None,
        quantum_resources: Optional[Dict[str, Any]] = None,
        sample_size: int = 100,
        vqc_fold_aucs: Optional[List[float]] = None,
        classical_fold_aucs: Optional[List[float]] = None,
    ) -> QuantumEvidenceSummary:
        """
        Parameters
        ----------
        vqc_metrics          : held-out test metrics for VQC
        best_classical_metrics: held-out test metrics for best classical model
        vqc_std              : cross-validation standard deviations for VQC
        classical_std        : cross-validation standard deviations for best classical
        noisy_vqc_metrics    : held-out metrics of the VQC under noise simulation
        quantum_resources    : dict with n_qubits, circuit_depth, inference_time_ms
        sample_size          : total valid dataset rows (for sufficiency check)
        vqc_fold_aucs        : list of per-fold AUC values for VQC (optional)
        classical_fold_aucs  : list of per-fold AUC values for best classical (optional)
        """

        # --- Sufficiency guard ------------------------------------------------
        if sample_size < 30:
            return QuantumEvidenceEngine._build_insufficient_evidence(
                f"Sample size too small ({sample_size} < 30 observations) "
                "for meaningful benchmark comparison."
            )

        # --- Core metrics -----------------------------------------------------
        q_auc = float(vqc_metrics.get("roc_auc", 0.5))
        c_auc = float(best_classical_metrics.get("roc_auc", 0.5))
        auc_delta = q_auc - c_auc

        q_auc_std = float(vqc_std.get("roc_auc", 0.05))
        c_auc_std = float(classical_std.get("roc_auc", 0.05))

        # Bootstrap CIs if fold values provided
        q_ci: Dict[str, float] = {}
        c_ci: Dict[str, float] = {}
        if vqc_fold_aucs and len(vqc_fold_aucs) >= 2:
            q_ci = _bootstrap_ci(vqc_fold_aucs)
        if classical_fold_aucs and len(classical_fold_aucs) >= 2:
            c_ci = _bootstrap_ci(classical_fold_aucs)

        # -----------------------------------------------------------------------
        # 1. Performance Dimension
        # -----------------------------------------------------------------------
        if auc_delta >= 0.03:
            perf_status = "passed"
            perf_desc = (
                f"VQC shows an observed ROC-AUC advantage over the best classical "
                f"baseline under the evaluation protocol (delta: +{auc_delta:.3f}; "
                f"VQC {q_auc:.3f} ± {q_auc_std:.3f} vs. Classical {c_auc:.3f} ± {c_auc_std:.3f})."
            )
            if q_ci and c_ci:
                perf_desc += (
                    f" Bootstrap 95% CI — VQC: [{q_ci['ci_lower']:.3f}, {q_ci['ci_upper']:.3f}]; "
                    f"Classical: [{c_ci['ci_lower']:.3f}, {c_ci['ci_upper']:.3f}]."
                )
        elif abs(auc_delta) < 0.03:
            perf_status = "neutral"
            perf_desc = (
                f"VQC performance is comparable to the best classical baseline "
                f"(observed delta: {auc_delta:+.3f}; VQC {q_auc:.3f} ± {q_auc_std:.3f} "
                f"vs. Classical {c_auc:.3f} ± {c_auc_std:.3f})."
            )
        else:
            perf_status = "warning"
            perf_desc = (
                f"Best classical baseline shows a higher observed ROC-AUC than VQC "
                f"under the evaluation protocol ({c_auc:.3f} ± {c_auc_std:.3f} "
                f"vs. VQC {q_auc:.3f} ± {q_auc_std:.3f}; delta: {auc_delta:+.3f})."
            )

        perf_evidence = DimensionEvidence(
            dimension="Performance",
            status=perf_status,
            quantum_metric=round(q_auc, 4),
            classical_metric=round(c_auc, 4),
            delta=round(auc_delta, 4),
            quantum_std=round(q_auc_std, 4),
            classical_std=round(c_auc_std, 4),
            description=perf_desc,
            fold_values=vqc_fold_aucs,
        )

        # -----------------------------------------------------------------------
        # 2. Generalization Dimension (fold-to-fold variance)
        # -----------------------------------------------------------------------
        if q_auc_std <= c_auc_std + 0.02:
            gen_status = "passed"
            gen_desc = (
                f"VQC shows stable cross-validation variance "
                f"(SD: ±{q_auc_std:.3f} vs. Classical SD: ±{c_auc_std:.3f})."
            )
        else:
            gen_status = "warning"
            gen_desc = (
                f"VQC shows higher observed fold-to-fold variance than the classical "
                f"baseline (VQC SD: ±{q_auc_std:.3f} vs. Classical SD: ±{c_auc_std:.3f}). "
                "This may indicate higher sensitivity to data partitioning."
            )

        gen_evidence = DimensionEvidence(
            dimension="Generalization",
            status=gen_status,
            quantum_metric=round(q_auc_std, 4),
            classical_metric=round(c_auc_std, 4),
            delta=round(q_auc_std - c_auc_std, 4),
            quantum_std=0.0,
            classical_std=0.0,
            description=gen_desc,
            fold_values=vqc_fold_aucs,
        )

        # -----------------------------------------------------------------------
        # 3. Calibration Dimension (Brier Score — lower is better)
        # -----------------------------------------------------------------------
        q_brier = float(vqc_metrics.get("brier_score", 0.15))
        c_brier = float(best_classical_metrics.get("brier_score", 0.15))
        brier_delta = q_brier - c_brier

        q_brier_std = float(vqc_std.get("brier_score", 0.03))
        c_brier_std = float(classical_std.get("brier_score", 0.03))

        if q_brier <= c_brier + 0.02:
            cal_status = "passed"
            cal_desc = (
                f"VQC probability calibration is comparable to the best classical baseline "
                f"(VQC Brier: {q_brier:.3f} ± {q_brier_std:.3f}; "
                f"Classical Brier: {c_brier:.3f} ± {c_brier_std:.3f})."
            )
        else:
            cal_status = "warning"
            cal_desc = (
                f"Classical model shows better observed calibration accuracy "
                f"(Classical Brier: {c_brier:.3f} ± {c_brier_std:.3f} "
                f"vs. VQC Brier: {q_brier:.3f} ± {q_brier_std:.3f})."
            )

        cal_evidence = DimensionEvidence(
            dimension="Calibration",
            status=cal_status,
            quantum_metric=round(q_brier, 4),
            classical_metric=round(c_brier, 4),
            delta=round(brier_delta, 4),
            quantum_std=round(q_brier_std, 4),
            classical_std=round(c_brier_std, 4),
            description=cal_desc,
        )

        # -----------------------------------------------------------------------
        # 4. Robustness Dimension (Noisy VQC AUC retention)
        # -----------------------------------------------------------------------
        if noisy_vqc_metrics:
            noisy_auc = float(noisy_vqc_metrics.get("roc_auc", q_auc * 0.9))
            retention = (noisy_auc / max(0.01, q_auc)) * 100.0
            noise_mode = noisy_vqc_metrics.get("execution_mode", "UNKNOWN")

            if retention >= 85.0:
                rob_status = "passed"
                rob_desc = (
                    f"VQC retains {retention:.1f}% of ideal ROC-AUC under simulated noise "
                    f"(Noisy AUC: {noisy_auc:.3f}, Ideal AUC: {q_auc:.3f}). "
                    f"Noise simulation mode: {noise_mode}."
                )
            else:
                rob_status = "warning"
                rob_desc = (
                    f"VQC performance degrades noticeably under simulated noise "
                    f"({retention:.1f}% retention; Noisy AUC: {noisy_auc:.3f} "
                    f"vs. Ideal AUC: {q_auc:.3f}). Noise simulation mode: {noise_mode}."
                )
            rob_q = round(noisy_auc, 4)
            rob_c = round(q_auc, 4)
            rob_delta = round(noisy_auc - q_auc, 4)
        else:
            rob_status = "neutral"
            rob_desc = "Noisy quantum simulation was not executed."
            rob_q = round(q_auc, 4)
            rob_c = round(q_auc, 4)
            rob_delta = 0.0

        rob_evidence = DimensionEvidence(
            dimension="Noise Robustness",
            status=rob_status,
            quantum_metric=rob_q,
            classical_metric=rob_c,
            delta=rob_delta,
            description=rob_desc,
        )

        # -----------------------------------------------------------------------
        # 5. Resource Dimension (inference time overhead)
        # -----------------------------------------------------------------------
        resources = quantum_resources or {
            "n_qubits": 6,
            "circuit_depth": 2,
            "inference_time_ms": vqc_metrics.get("inference_time_ms", 10.0),
        }
        c_infer = float(best_classical_metrics.get("inference_time_ms", 1.0))
        q_infer = float(resources.get("inference_time_ms", 10.0))
        time_ratio = q_infer / max(0.01, c_infer)

        if time_ratio < 20.0:
            res_status = "passed"
            res_desc = (
                f"Quantum circuit overhead is {time_ratio:.1f}× classical inference time "
                f"({q_infer:.2f} ms vs. {c_infer:.2f} ms). "
                f"Circuit: {resources.get('n_qubits', '?')} qubits, depth {resources.get('circuit_depth', '?')}."
            )
        else:
            res_status = "warning"
            res_desc = (
                f"Quantum simulation runtime is {time_ratio:.1f}× higher than classical "
                f"inference ({q_infer:.2f} ms vs. {c_infer:.2f} ms). "
                "This reflects classical simulation overhead, not future hardware timing."
            )

        res_evidence = DimensionEvidence(
            dimension="Resource Cost",
            status=res_status,
            quantum_metric=round(q_infer, 3),
            classical_metric=round(c_infer, 3),
            delta=round(q_infer - c_infer, 3),
            description=res_desc,
        )

        # -----------------------------------------------------------------------
        # Final Verdict Synthesis
        # -----------------------------------------------------------------------
        rules_eval: List[str] = []

        if auc_delta >= 0.03 and gen_status == "passed" and rob_status != "warning":
            verdict = "QUANTUM_PREFERRED"
            verdict_label = "Quantum Preferred"
            explanation = (
                f"Under the selected experimental configuration, the VQC shows an "
                f"observed ROC-AUC advantage over the best classical baseline "
                f"(+{auc_delta:.3f}) with acceptable fold variance. "
                "These results do not establish quantum advantage; "
                "no formal statistical significance test has been applied."
            )
            rules_eval.append(f"Observed VQC ROC-AUC advantage ≥ +0.03 (delta: +{auc_delta:.3f})")
            rules_eval.append("Fold variance within acceptable range")
            if rob_status == "passed":
                rules_eval.append("Noise retention ≥ 85%")

        elif auc_delta >= -0.04 and gen_status != "warning" and rob_status == "passed":
            verdict = "QUANTUM_COMPETITIVE"
            verdict_label = "Quantum Competitive"
            explanation = (
                f"Under the selected experimental configuration, the VQC achieves "
                f"observed parity with the best classical baseline "
                f"(observed ROC-AUC delta: {auc_delta:+.3f}) and demonstrates "
                f"acceptable noise tolerance. "
                "These results do not establish quantum advantage."
            )
            rules_eval.append(f"Observed ROC-AUC within parity range (delta: {auc_delta:+.3f})")
            rules_eval.append("Noise robustness: acceptable")

        elif auc_delta < -0.04 or (auc_delta < 0.0 and gen_status == "warning"):
            verdict = "CLASSICAL_PREFERRED"
            verdict_label = "Classical Preferred"
            explanation = (
                f"Under the selected experimental configuration, classical models show "
                f"higher observed ROC-AUC than VQC "
                f"(best classical {c_auc:.3f} vs. VQC {q_auc:.3f}; delta: {auc_delta:+.3f}). "
                "This is an observational result on the evaluated dataset and configuration."
            )
            rules_eval.append(f"Classical baselines show higher observed ROC-AUC (delta: {auc_delta:+.3f})")
            if gen_status == "warning":
                rules_eval.append("VQC shows higher fold-to-fold variance")

        else:
            verdict = "INSUFFICIENT_EVIDENCE"
            verdict_label = "Insufficient Evidence"
            explanation = (
                "Cross-validation results show high variance across folds, or metric "
                "margins are within noise levels. Additional samples, tuning, or "
                "a larger evaluation budget are recommended."
            )
            rules_eval.append("Metric margins are within noise levels or fold variance is high")

        return QuantumEvidenceSummary(
            verdict=verdict,
            verdict_label=verdict_label,
            verdict_explanation=explanation,
            performance_evidence=perf_evidence,
            generalization_evidence=gen_evidence,
            calibration_evidence=cal_evidence,
            robustness_evidence=rob_evidence,
            resource_evidence=res_evidence,
            rule_breakdown=rules_eval,
        )

    @staticmethod
    def _build_insufficient_evidence(reason: str) -> QuantumEvidenceSummary:
        dummy_dim = DimensionEvidence(
            dimension="N/A",
            status="warning",
            quantum_metric=0.0,
            classical_metric=0.0,
            delta=0.0,
            description=reason,
        )
        return QuantumEvidenceSummary(
            verdict="INSUFFICIENT_EVIDENCE",
            verdict_label="Insufficient Evidence",
            verdict_explanation=reason,
            performance_evidence=dummy_dim,
            generalization_evidence=dummy_dim,
            calibration_evidence=dummy_dim,
            robustness_evidence=dummy_dim,
            resource_evidence=dummy_dim,
            rule_breakdown=[reason],
        )
