import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.data.profiler import DatasetProfiler
from app.data.sample_loader import load_sample_dataset
from app.routers import dataset, predict, results, train
from app.schemas import DatasetConfigRequest, HealthResponse
from app.state import app_state

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hybrid-quantum-medical-ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for pre-loading initial demonstration dataset."""
    logger.info("Initializing Hybrid Quantum-Classical Medical Platform Backend...")
    try:
        # Pre-load initial sample dataset
        df, meta = load_sample_dataset("breast_cancer_wisconsin")
        app_state.reset_for_new_dataset(df, dataset_name=meta["name"])
        
        profiler = DatasetProfiler(df, dataset_name=meta["name"])
        profile_res = profiler.profile(target_column=meta["suggested_target"])
        app_state.dataset_profile = profile_res

        app_state.dataset_config = DatasetConfigRequest(
            target_column=profile_res.suggested_target or "diagnosis",
            positive_class=profile_res.suggested_positive_class or "M",
            identifier_columns=profile_res.suggested_identifiers,
            excluded_features=[],
            problem_type="binary_classification",
        )
        logger.info(f"Loaded initial dataset: {meta['name']} ({len(df)} rows)")
    except Exception as e:
        logger.warning(f"Could not auto-load initial sample dataset: {e}")
    
    yield
    logger.info("Shutting down backend service.")


app = FastAPI(
    title="Hybrid Quantum-Classical Disease Detection API",
    description="Research prototype API for benchmarking Variational Quantum Classifiers (VQC) against Classical ML on clinical tabular data.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(dataset.router, prefix="/api")
app.include_router(train.router, prefix="/api")
app.include_router(results.router, prefix="/api")
app.include_router(predict.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["System Health"])
async def health_check():
    """System health check and quantum backend status."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        fast_demo_mode=settings.FAST_DEMO_MODE,
        quantum_simulator="Qiskit Statevector Local Simulator",
    )


@app.get("/api/config", tags=["System Health"])
async def get_system_config():
    """Retrieve active system parameters and default quantum settings."""
    return {
        "fast_demo_mode": settings.FAST_DEMO_MODE,
        "default_qubits": settings.DEFAULT_QUANTUM_QUBITS,
        "default_layers": settings.DEFAULT_VQC_LAYERS,
        "default_max_iter": settings.DEFAULT_VQC_MAX_ITER,
        "random_seed": settings.RANDOM_SEED,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )
