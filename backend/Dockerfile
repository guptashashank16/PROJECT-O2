FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (required for Qiskit C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies first (layer cache optimisation)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and sample data
COPY app/ ./app/
COPY samples/ ./samples/

# Create artifacts directory
RUN mkdir -p /app/artifacts

# Railway provides PORT dynamically; fallback to 8000 for local docker-compose
ENV PORT=8000

EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
