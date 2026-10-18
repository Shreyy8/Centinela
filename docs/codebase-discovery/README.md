# Centinela (Bayora) — Codebase Discovery & Technical Documentation

> **Status:** Codebase Reverse Engineering & Verification Complete  
> **Repository:** [Centinela (formerly Bayora)](https://github.com/Shreyy8/Centinela.git)  
> **Branch:** `frontend`  
> **Architecture:** Polyglot Microservices (FastAPI, TanStack Start / React 19, Apache Kafka, PostgreSQL, MongoDB, Docker, Kubernetes/gVisor, Istio)  
> **Verification Date:** October 2026 (Updated with standalone demo runners, in-memory fallback modes, and test execution analysis)  

---

## 1. Executive Summary

**Centinela** (historically and internally developed as **Bayora**) is an automated adversarial AI safety testing and compliance certification platform. It stress-tests Large Language Models (LLMs) against adversarial attacks—including jailbreaks, roleplay obfuscations, prompt injections, and semantic leaks—within a mathematically isolated, multi-tenant execution harness.

Upon completing an adversarial test drill, Centinela calculates defense metrics (such as Bypass Rate / Attack Success Rate and Resilience Score) and produces audit trail artifacts mapped to regulatory compliance frameworks including **HIPAA**, **SOX**, **GDPR**, and the **EU AI Act**.

### Target Problem & User Value
- **The Problem:** Deploying LLMs in enterprise production environments exposes organizations to severe regulatory liability, sensitive data leakage, and security exploits. Traditional security auditing is manual, slow, and cannot mathematically prove isolation between adversarial testing teams and target model weights.
- **The Solution:** Centinela provides an automated, adversarial red-team vs. blue-team testing harness with multi-tenant cryptographic isolation (zero direct network connectivity between teams mediated by dynamic Fernet session keys), an immutable hash-chained audit ledger, real-time telemetry streaming via WebSockets, and a modern web dashboard.

---

## 2. Technology Stack Overview

| Layer | Technologies & Frameworks | Details & Source References |
|---|---|---|
| **Frontend UI** | [React 19](file:///frontend/package.json), [TanStack Start](file:///frontend/src/server.ts), [TanStack Router](file:///frontend/src/router.tsx), [TanStack Query](file:///frontend/src/routes/__root.tsx), Tailwind CSS v4, Lucide Icons, GSAP, Sonner | Full-stack SSR + SPA client running on Vite 7 with Shadcn UI components |
| **API Gateway** | [Nginx](file:///infra/nginx/centinela-gateway.conf) (Port 8010) | Reverse proxy aggregating auth, session, benchmark, audit, ML, and WebSocket endpoints |
| **Auth & Config Service** | [FastAPI](file:///bayora/services/auth_service/main.py) (Port 8004), [Motor / MongoDB](file:///bayora/services/auth_service/main.py#L30-L33), [PyJWT](file:///bayora/services/auth_service/main.py#L6-L8), [Passlib/Bcrypt](file:///bayora/services/auth_service/main.py#L5-L6), [Fernet](file:///bayora/services/auth_service/main.py#L9-L10) | User signup/login, encrypted provider API keys (`configs` collection), graceful fallback when MongoDB is offline |
| **Session Manager** | [FastAPI](file:///bayora/services/session_manager/main.py) (Port 8000), `aiokafka`, Cryptography Fernet | Mediated cryptographic bus broker, dynamic per-session key generation, micro-batching (batch size 5), Falco isolation breach termination |
| **Inference Proxy** | [FastAPI](file:///bayora/services/llm_proxy/main.py) (Port 8002), [vLLM](file:///bayora/services/llm_proxy/inference.py#L53-L60), [Hugging Face Transformers](file:///bayora/services/llm_proxy/inference.py#L64-L75), [Google Gemini API](file:///bayora/services/llm_proxy/inference.py#L37-L47), [Ollama](file:///bayora/services/llm_proxy/inference.py#L77-L98) | Sandboxed inference with output echo filtering, semantic cosine leak detection via `SentenceTransformer`, and explicit GPU VRAM purging |
| **Red Team Engine** | [FastAPI](file:///bayora/services/red_team/main.py) (Port 8003), [LiteLLM](file:///bayora/ml/attack_generators/engine.py#L6), AdversarialPromptEngine | Attack strategies: Direct, Jailbreak (DAN), Roleplay, PAIR (iterative LLM-in-the-loop), GCG suffix. Streams to Kafka `red.prompts` |
| **Blue Team Defense** | [FastAPI](file:///bayora/services/blue_team/main.py) (Port 8001), [PEFT / LoRA](file:///bayora/ml/classifiers/defense.py#L4-L26), `unitary/toxic-bert` | Sequence classification defense evaluating LLM responses for toxicity and policy violations; emits classifications and reports |
| **Benchmark Service** | [FastAPI](file:///bayora/services/benchmark_service/main.py) (Port 8006), [PostgreSQL](file:///bayora/services/benchmark_service/database.py#L8-L15) (`bayora_benchmark`), `aiokafka` | Drill runner orchestration, progress tracking, historical leaderboard; includes in-memory ledger fallback |
| **Audit Service** | [FastAPI](file:///bayora/services/audit_service/main.py) (Port 8005), [PostgreSQL](file:///bayora/services/audit_service/main.py#L19-L25) (`bayora_audit`), `aiokafka` | Tamper-evident hash-chained audit ledger (`audit_entries` table) with public `GET /verify` validation |
| **Audit Gateway** | [FastAPI WebSocket](file:///bayora/services/audit_gateway/main.py) (Port 8011), `aiokafka` | Real-time WebSocket fanout of attack logs, classifications, and drill progress. Includes synthetic attack streamer when Kafka is offline |
| **Message Broker** | [Apache Kafka](file:///docker-compose.yml#L8-L21) + Zookeeper | Topics: `red.prompts`, `llm.requests`, `llm.responses`, `blue.evaluation`, `audit.events`, `benchmark.reports`, `session.progress`, `classifications`, `security.violations` |
| **Standalone Runners** | [demo_server.py](file:///demo_server.py), [run_backend.py](file:///run_backend.py) | `demo_server.py` runs all core mock services in a single process; `run_backend.py` spawns all 8 FastAPI services concurrently with auto-generated Fernet keys |
| **Cloud Infrastructure** | [Docker Compose](file:///docker-compose.yml), [Kubernetes (Strimzi, Istio, gVisor)](file:///bayora/infra/k8s/namespaces/apps.yaml), [Terraform AWS EKS](file:///bayora/infra/terraform/main.tf), Falco | Strict multi-namespace isolation, gVisor `runsc` runtime, seccomp syscall filtering, Falco runtime intrusion detection |

---

## 3. Quickstart & Local Operation

The project supports three distinct operational modes:

### Mode A: Zero-Dependency Standalone Demo Runner (Fastest)
Runs Auth (8004), Benchmark (8006), Session Manager (8000), and WebSocket Gateway (8011) in a single Python process with synthetic telemetry and in-memory persistence:
```bash
python demo_server.py
```
Then start the frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Configure an audit and view real-time streaming telemetry without spinning up Docker, Kafka, or Postgres.

### Mode B: Direct Local Python Microservices Runner
Spawns all 8 FastAPI microservices locally via subprocess with auto-generated Fernet keys and `MOCK_LLM=1`:
```bash
python run_backend.py
```

### Mode C: Full Containerized Microservices Mesh (Docker Compose)
Spawns Kafka, Zookeeper, PostgreSQL, MongoDB, Nginx gateway, and all 8 microservices:
```bash
docker compose up --build
```
This binds:
- Nginx Gateway: `http://localhost:8010`
- Session Manager: `http://localhost:8000`
- Blue Team Defense: `http://localhost:8001`
- LLM Proxy: `http://localhost:8002`
- Red Team Engine: `http://localhost:8003`
- Auth & Config Service: `http://localhost:8004`
- Audit Service: `http://localhost:8005`
- Benchmark Service: `http://localhost:8006`
- WebSocket Audit Gateway: `ws://localhost:8011`
- PostgreSQL: `localhost:5432`
- MongoDB: `localhost:27017`

---

## 4. Test Suite Execution

The repository contains automated integration tests located in `tests/integration/`:

```bash
# Run Session Manager integration tests (Lifecycle, micro-batching, audit publishing)
python -m pytest tests/integration/test_session_manager.py -v

# Run Monitoring & Falco isolation breach test
python -m pytest tests/integration/test_monitoring.py -v

# Run Red-Team & Blue-Team pipeline tests
python -m pytest tests/integration/test_pipelines.py -v

# Run LLM Proxy sandboxing tests (requires sentence-transformers)
python -m pytest tests/integration/test_llm_proxy.py -v
```

*Note on test results:* `test_session_manager.py` (4 passed), `test_monitoring.py` (1 passed), and `test_pipelines.py` (2 passed) pass completely. In `test_llm_proxy.py`, 4 out of 5 tests pass; `test_llm_proxy_bus_flow` encounters an `AttributeError` at line 66 because `LLM_KEY` is already `bytes` (documented in [IMPLEMENTATION_GAPS.md](file:///docs/codebase-discovery/IMPLEMENTATION_GAPS.md)).

---

## 5. Documentation Directory Guide

This discovery report is partitioned into focused, deep-dive specifications:

| Document | Purpose |
|---|---|
| [**`CODEBASE_REPORT.md`**](file:///docs/codebase-discovery/CODEBASE_REPORT.md) | **Primary Comprehensive Technical Report** covering architectural patterns, security models, data flows, and runtime topology. |
| [**`ARCHITECTURE.md`**](file:///docs/codebase-discovery/ARCHITECTURE.md) | Component boundary maps, multi-tier execution flows, cryptographic lifecycle, and 6 Mermaid diagrams. |
| [**`FEATURE_INVENTORY.md`**](file:///docs/codebase-discovery/FEATURE_INVENTORY.md) | Granular breakdown of all discovered system features, status (Implemented / Mocked / Planned), evidence, and line numbers. |
| [**`API_REFERENCE.md`**](file:///docs/codebase-discovery/API_REFERENCE.md) | Complete interface catalog: REST endpoints, WebSocket events, Kafka topics, parameters, auth controls, and callers. |
| [**`DATA_MODEL.md`**](file:///docs/codebase-discovery/DATA_MODEL.md) | Database schemas (PostgreSQL, MongoDB), Kafka message schemas, ER diagram, and cryptographic ledger verification. |
| [**`IMPLEMENTATION_GAPS.md`**](file:///docs/codebase-discovery/IMPLEMENTATION_GAPS.md) | Evidence-backed catalogue of defects, TypeScript compiler warnings, mock-only areas, abandoned Django stubs, and technical debt. |
| [**`summary.json`**](file:///docs/codebase-discovery/summary.json) | Machine-readable JSON summary indexing services, schemas, routes, and verification metrics. |
| [**`IMPROVEMENTS.md`**](file:///IMPROVEMENTS.md) | Phase-wise implementation plan to resolve all discovered gaps and technical debt. |
