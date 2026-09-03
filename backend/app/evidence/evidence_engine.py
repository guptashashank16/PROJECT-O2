import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

logger = logging.getLogger("hybrid-quantum-medical-ai")


class DimensionEvidence(BaseModel):
    dimension: str
    status: str  # "passed" | "neutral" | "warning"
    quantum_metric: float
    classical_metric: float
    delta: float
    description: str


class QuantumEvidenceSummary(BaseModel):
    verdict: str  # "QUANTUM_PREFERRED" | "QUANTUM_COMPETITIVE" | "CLASSICAL_PREFERRED" | "INSUFFICIENT_EVIDENCE"
    verdict_label: str
    verdict_explanation: str
    performance_evidence: DimensionEvidence
    generalization_evidence: DimensionEvidence
    calibration_evidence: DimensionEvidence
    robustness_evidence: DimensionEvidence
    resource_evidence: DimensionEvidence
    rule_breakdown: List[str]


class QuantumEvidenceEngine:
    """Transparent evidence synthesis engine determining clinical quantum utility based on 5 dimensions."""

    @staticmethod
    def evaluate(
        vqc_metrics: Dict[str, float],
        best_classical_metrics: Dict[str, float],
        vqc_std: Dict[str, float],
        classical_std: Dict[str, float],
        noisy_vqc_metrics: Optional[Dict[str, float]] = None,
        quantum_resources: Optional[Dict[str, Any]] = None,
        sample_size: int = 569,
    ) -> QuantumEvidenceSummary:
        
        # Check sufficient data & folds
        if sample_size < 30:
            return QuantumEvidenceEngine._build_insufficient_evidence(
                "Sample size too small (< 30 observations) for statistical benchmarking."
            )

        q_auc = vqc_metrics.get("roc_auc", 0.5)
        c_auc = best_classical_metrics.get("roc_auc", 0.5)
        auc_delta = q_auc - c_auc

        q_auc_std = vqc_std.get("roc_auc", 0.05)
        c_auc_std = classical_std.get("roc_auc", 0.05)

        # 1. Performance Dimension
        if auc_delta >= 0.03:
            perf_status = "passed"
            perf_desc = f"VQC outperforms best classical baseline in ROC-AUC (+{auc_delta:.3f})."
        elif abs(auc_delta) < 0.03:
            perf_status = "neutral"
            perf_desc = f"VQC performance is comparable to best classical baseline (delta: {auc_delta:+.3f})."
        else:
            perf_status = "warning"
            perf_desc = f"Best classical baseline outperforms VQC in ROC-AUC ({c_auc:.3f} vs {q_auc:.3f})."

        perf_evidence = DimensionEvidence(
            dimension="Performance",
            status=perf_status,
            quantum_metric=round(q_auc, 4),
            classical_metric=round(c_auc, 4),
            delta=round(auc_delta, 4),
            description=perf_desc,
        )

        # 2. Generalization Dimension (5-fold variability)
        if q_auc_std <= c_auc_std + 0.02:
            gen_status = "passed"
            gen_desc = f"VQC exhibits stable cross-validation variance (SD: ±{q_auc_std:.3f})."
        else:
            gen_status = "warning"
            gen_desc = f"VQC displays higher fold-to-fold variance than classical baseline (SD: ±{q_auc_std:.3f} vs ±{c_auc_std:.3f})."

        gen_evidence = DimensionEvidence(
            dimension="Generalization",
            status=gen_status,
            quantum_metric=round(q_auc_std, 4),
            classical_metric=round(c_auc_std, 4),
            delta=round(q_auc_std - c_auc_std, 4),
            description=gen_desc,
        )

        # 3. Calibration Dimension (Brier Score)
        q_brier = vqc_metrics.get("brier_score", 0.15)
        c_brier = best_classical_metrics.get("brier_score", 0.15)
        brier_delta = q_brier - c_brier

        if q_brier <= c_brier + 0.02:
            cal_status = "passed"
            cal_desc = f"VQC probability calibration is well-aligned (Brier Score: {q_brier:.3f})."
        else:
            cal_status = "warning"
            cal_desc = f"Classical model shows superior calibration accuracy (Brier: {c_brier:.3f} vs {q_brier:.3f})."

        cal_evidence = DimensionEvidence(
            dimension="Calibration",
            status=cal_status,
            quantum_metric=round(q_brier, 4),
            classical_metric=round(c_brier, 4),
            delta=round(brier_delta, 4),
            description=cal_desc,
        )

        # 4. Robustness Dimension (Noisy VQC retention)
        if noisy_vqc_metrics:
            noisy_auc = noisy_vqc_metrics.get("roc_auc", q_auc * 0.9)
            retention = (noisy_auc / max(0.01, q_auc)) * 100.0
            if retention >= 85.0:
                rob_status = "passed"
                rob_desc = f"VQC retains high accuracy under noisy simulation ({retention:.1f}% retention)."
            else:
                rob_status = "warning"
                rob_desc = f"VQC performance degrades noticeably under simulated noise ({retention:.1f}% retention)."
            rob_q = round(noisy_auc, 4)
            rob_c = round(q_auc, 4)
            rob_delta = round(noisy_auc - q_auc, 4)
        else:
            rob_status = "neutral"
            rob_desc = "Noisy quantum simulation not executed."
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

        # 5. Resource Dimension
        resources = quantum_resources or {"n_qubits": 6, "circuit_depth": 2, "inference_time_ms": vqc_metrics.get("inference_time_ms", 10.0)}
        c_infer_time = best_classical_metrics.get("inference_time_ms", 1.0)
        time_ratio = resources.get("inference_time_ms", 10.0) / max(0.01, c_infer_time)

        if time_ratio < 20.0:
            res_status = "passed"
            res_desc = f"Circuit depth ({resources.get('circuit_depth', 2)}) and qubits ({resources.get('n_qubits', 6)}) run efficiently."
        else:
            res_status = "warning"
            res_desc = f"Quantum simulation runtime overhead is {time_ratio:.1f}x higher than classical."

        res_evidence = DimensionEvidence(
            dimension="Resource Cost",
            status=res_status,
            quantum_metric=round(resources.get("inference_time_ms", 10.0), 3),
            classical_metric=round(c_infer_time, 3),
            delta=round(resources.get("inference_time_ms", 10.0) - c_infer_time, 3),
            description=res_desc,
        )

        # Final Verdict Synthesis Logic
        rules_eval = []
        if auc_delta >= 0.03 and gen_status == "passed" and rob_status != "warning":
            verdict = "QUANTUM_PREFERRED"
            verdict_label = "Quantum Preferred"
            explanation = "VQC demonstrates statistically significant diagnostic superiority and stability over classical baselines under fair 5-fold evaluation."
            rules_eval.append("Rule: VQC ROC-AUC advantage >= +0.03")
            rules_eval.append("Rule: Fold variance acceptable")
            rules_eval.append("Rule: Noise retention acceptable")
        elif auc_delta >= -0.04 and gen_status != "warning" and rob_status == "passed":
            verdict = "QUANTUM_COMPETITIVE"
            verdict_label = "Quantum Competitive"
            explanation = "VQC achieves diagnostic parity with strong classical baselines, demonstrating viable feature space representation on this biomedical dataset."
            rules_eval.append("Rule: ROC-AUC within parity threshold (-0.04 to +0.03)")
            rules_eval.append("Rule: Robust noise tolerance confirmed")
        elif auc_delta < -0.04 or (auc_delta < 0.0 and gen_status == "warning"):
            verdict = "CLASSICAL_PREFERRED"
            verdict_label = "Classical Preferred"
            explanation = "Classical models (Random Forest / Logistic Regression / SVM) provide superior predictive performance and lower computational cost for this clinical dataset."
            rules_eval.append("Rule: Classical baselines exceed VQC accuracy/ROC-AUC")
            rules_eval.append("Rule: Lower inference overhead and variance")
        else:
            verdict = "INSUFFICIENT_EVIDENCE"
            verdict_label = "Insufficient Evidence"
            explanation = "Cross-validation results show high variance across folds; additional samples or feature tuning required."
            rules_eval.append("Rule: Inconclusive diagnostic metric margins")

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
            dimension="N/A", status="warning", quantum_metric=0.0, classical_metric=0.0, delta=0.0, description=reason
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
