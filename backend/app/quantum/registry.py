from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type
from pydantic import BaseModel

from app.models.base import BaseDiseaseClassifier


class QuantumModelMetadata(BaseModel):
    model_id: str
    name: str
    description: str
    circuit_family: str
    implemented: bool
    status: str  # "ACTIVE_BENCHMARK", "PLANNED_EXTENSION", "RESEARCH_PROTOTYPE"
    ansatz_options: List[str]
    feature_map_options: List[str]
    supported_optimizers: List[str]
    theoretical_notes: str


class QuantumModel(BaseDiseaseClassifier, ABC):
    """Abstract base interface for quantum machine learning models."""

    def __init__(self, model_id: str, model_name: str):
        super().__init__(model_id=model_id, model_name=model_name, model_type="quantum")

    @abstractmethod
    def get_config(self) -> Dict[str, Any]:
        """Return quantum circuit and optimizer configuration."""
        pass

    @abstractmethod
    def get_metrics(self) -> Dict[str, Any]:
        """Return latest fitted convergence or evaluation metrics."""
        pass


class QuantumModelRegistry:
    """Central research registry cataloging implemented and planned quantum classifier models."""

    _models: Dict[str, QuantumModelMetadata] = {}
    _classes: Dict[str, Type[QuantumModel]] = {}

    @classmethod
    def register_metadata(cls, meta: QuantumModelMetadata, model_class: Optional[Type[QuantumModel]] = None) -> None:
        cls._models[meta.model_id.lower()] = meta
        if model_class:
            cls._classes[meta.model_id.lower()] = model_class

    @classmethod
    def get_model_class(cls, model_id: str) -> Type[QuantumModel]:
        key = model_id.lower()
        if key not in cls._classes:
            meta = cls._models.get(key)
            if meta and not meta.implemented:
                raise NotImplementedError(
                    f"Quantum model '{meta.name}' is designated as a planned research extension and is not currently implemented. "
                    "The platform does not silently fall back to VQC."
                )
            raise KeyError(f"Quantum model '{model_id}' is not registered.")
        return cls._classes[key]

    @classmethod
    def list_all_models(cls) -> List[QuantumModelMetadata]:
        return list(cls._models.values())

    @classmethod
    def get_metadata(cls, model_id: str) -> Optional[QuantumModelMetadata]:
        return cls._models.get(model_id.lower())


# Register Available and Planned Models with explicit honest status
QuantumModelRegistry.register_metadata(
    QuantumModelMetadata(
        model_id="vqc",
        name="Variational Quantum Classifier (VQC)",
        description="Parameterized Quantum Circuit (PQC) trained with classical optimization routines against Pauli Z observables.",
        circuit_family="Parameterized Variational Ansatz (Hardware-Efficient / RealAmplitudes / EfficientSU2)",
        implemented=True,
        status="ACTIVE_BENCHMARK",
        ansatz_options=["RealAmplitudes", "EfficientSU2"],
        feature_map_options=["ZZFeatureMap", "AngleEncoding"],
        supported_optimizers=["COBYLA", "SLSQP", "SPSA"],
        theoretical_notes="Maps classical features into n-qubit Hilbert space via non-linear angle/entanglement rotations, optimizing θ to minimize binary cross-entropy.",
    )
)

QuantumModelRegistry.register_metadata(
    QuantumModelMetadata(
        model_id="qsvm",
        name="Quantum Kernel Support Vector Machine (QSVM)",
        description="Quantum kernel estimation via transition fidelity |⟨φ(x)|φ(x')⟩|² evaluated on quantum circuit, solved with classical dual quadratic program.",
        circuit_family="Quantum Kernel Estimation (ZZFeatureMap Hilbert Space)",
        implemented=False,
        status="PLANNED_EXTENSION",
        ansatz_options=[],
        feature_map_options=["ZZFeatureMap", "PauliFeatureMap"],
        supported_optimizers=["Classical Dual SVM Solver"],
        theoretical_notes="Constructs a non-linear inner product in exponentially large quantum state space without requiring explicit variational parameter optimization.",
    )
)

QuantumModelRegistry.register_metadata(
    QuantumModelMetadata(
        model_id="qnn",
        name="Quantum Neural Network (QNN)",
        description="Multi-layer quantum circuit network with parameter-shift rule analytical gradients and hybrid backpropagation.",
        circuit_family="Deep Parameterized Circuit Network",
        implemented=False,
        status="PLANNED_EXTENSION",
        ansatz_options=["TwoLocal", "NLocal"],
        feature_map_options=["ZZFeatureMap"],
        supported_optimizers=["ADAM", "GradientDescent"],
        theoretical_notes="Combines layered parameterized unitaries with classical non-linear feedforward activation layers.",
    )
)
