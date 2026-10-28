# =============================================================================
# Centinela — Optimized Multi-Stage Dockerfile
#
# Technique summary (size reductions):
#   1. Dedicated "deps-builder" stage: installs & compiles packages with build
#      tools (gcc, libpq-dev), then copies ONLY the installed site-packages into
#      the slim final stage — build tools never land in the shipped image.
#   2. Single chained RUN per stage: fewer layers, no dangling temp files.
#   3. pip install flags: --no-cache-dir --compile (pre-compiles .pyc at build
#      time so they don't regenerate at runtime and bloat volumes).
#   4. PYTHONDONTWRITEBYTECODE=1: stops Python writing .pyc files at runtime.
#   5. PYTHONUNBUFFERED=1: no stdout buffering needed for log sizing.
#   6. apt-get: --no-install-recommends + rm -rf /var/lib/apt/lists/* in same
#      RUN layer so package index never lands in any image layer.
#   7. runtime-base uses python:3.11-slim (Debian bookworm minimal) — no dev
#      headers, no compiler, no manpages.
#   8. runtime-ml: only llm-proxy uses this. Torch CPU-only wheel is pulled
#      (~800 MB vs ~2.5 GB GPU) unless CUDA is explicitly needed. Override with
#      build arg TORCH_EXTRA_INDEX if you need CUDA.
#   9. .dockerignore (separate file) excludes docs/, infra/, services/, tests/,
#      frontend/, *.md, *.sh, *.log, .git, .venv, __pycache__.
#
# Estimated final image sizes:
#   runtime-base  ≈  210 MB   (was ~420 MB with naïve single stage)
#   runtime-ml    ≈  1.8 GB   (was ~4+ GB with full GPU torch)
# =============================================================================

# ── 0. Shared base OS ────────────────────────────────────────────────────────
FROM python:3.11-slim AS python-base

# Prevent .pyc files on disk; force stdout/stderr to be unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1


# ── 1. deps-builder: compile + install base packages ─────────────────────────
# This stage has gcc/libpq-dev for packages that need C extensions (psycopg2).
# Nothing from this stage except /usr/local/lib/python3.11/site-packages and
# /usr/local/bin (entrypoints) is copied to the final image.
FROM python-base AS deps-builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc \
       libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --compile -r requirements.txt


# ── 2. runtime-base: slim image for all non-ML services ──────────────────────
# Only the installed site-packages are copied — no compiler, no headers.
# Used by: session-manager, audit-service, auth-service, benchmark-service,
#          red-team, blue-team, audit-gateway.
FROM python-base AS runtime-base

# Copy only compiled packages from builder — skip gcc and build headers
COPY --from=deps-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps-builder /usr/local/bin /usr/local/bin

# psycopg2 needs libpq at runtime (not libpq-dev, just the shared library)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only application code — .dockerignore filters everything else
COPY bayora/ ./bayora/

CMD ["uvicorn", "bayora.services.session_manager.main:app", \
     "--host", "0.0.0.0", "--port", "8000"]


# ── 3. ml-deps-builder: install ML packages (CPU-only torch by default) ──────
# Build arg TORCH_EXTRA_INDEX lets CI switch to a CUDA wheel without changing
# this file: --build-arg TORCH_EXTRA_INDEX=https://download.pytorch.org/whl/cu121
FROM deps-builder AS ml-deps-builder

ARG TORCH_EXTRA_INDEX=https://download.pytorch.org/whl/cpu

COPY requirements-llm.txt .
# Install torch CPU-only first (avoids pulling the 2.5 GB GPU wheel by default),
# then install the rest of the ML requirements that depend on torch.
RUN pip install --no-cache-dir --compile \
        torch --extra-index-url ${TORCH_EXTRA_INDEX} \
    && pip install --no-cache-dir --compile \
        -r requirements-llm.txt


# ── 4. runtime-ml: ML-heavy image for llm-proxy only ─────────────────────────
FROM python-base AS runtime-ml

# libpq5 for psycopg2, libgomp1 for torch OpenMP, libglib2.0-0 for sentence-transformers
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libpq5 \
       libgomp1 \
       libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ml-deps-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=ml-deps-builder /usr/local/bin /usr/local/bin

WORKDIR /app
COPY bayora/ ./bayora/

CMD ["uvicorn", "bayora.services.llm_proxy.main:app", \
     "--host", "0.0.0.0", "--port", "8002"]
