# Universal Dockerfile for Bayora Microservices
# The specific service to run is passed via the Kubernetes 'command' or 'args'
FROM python:3.11-slim

WORKDIR /app

ARG EXTRA_REQUIREMENTS=

# Install Python requirements for the base service image.
COPY requirements.txt requirements-llm.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r requirements-llm.txt

# Copy only the application code that the container needs.
COPY bayora/ ./bayora/

# Ensure Python can find the bayora package module
ENV PYTHONPATH=/app

# Default command (will be overridden by Kubernetes Deployment manifests)
CMD ["uvicorn", "bayora.services.session_manager.main:app", "--host", "0.0.0.0", "--port", "8000"]
