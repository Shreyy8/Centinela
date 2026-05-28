# Universal Dockerfile for Bayora Microservices
# The specific service to run is passed via the Kubernetes 'command' or 'args'
FROM python:3.11-slim

# Install system dependencies required for psycopg2 and ML binaries
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
# Using --no-cache-dir to keep image size small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire codebase
COPY bayora/ ./bayora/

# Ensure Python can find the bayora package module
ENV PYTHONPATH=/app

# Default command (will be overridden by Kubernetes Deployment manifests)
CMD ["uvicorn", "bayora.services.session_manager.main:app", "--host", "0.0.0.0", "--port", "8000"]
