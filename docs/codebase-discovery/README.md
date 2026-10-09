# Centinela (Bayora) — Codebase Discovery & Technical Documentation

> **Status:** Discovery & Reverse Engineering Complete  
> **Repository:** [Centinela (formerly Bayora)](https://github.com/Shreyy8/Centinela.git)  
> **Architecture:** Polyglot Microservices (FastAPI, TanStack Start/React 19, Kafka, PostgreSQL, MongoDB, Docker, Kubernetes/gVisor)  
> **Documentation Date:** October 2026  

---

## 1. Executive Summary

**Centinela** (internally and historically named **Bayora**) is an automated, adversarial AI safety testing and compliance certification platform. It evaluates Large Language Models (LLMs) against adversarial attacks—such as jailbreaks, roleplay obfuscations, prompt injection, and semantic leakage—within a strictly isolated, multi-tenant environment.

Upon completing adversarial testing drills, Centinela calculates defense metrics (such as Bypass Rate and Safety Score) and generates audit certificates intended for regulatory compliance frameworks including **HIPAA**, **SOX**, **GDPR**, and the **EU AI Act**.

### Target Problem & User Value
- **The Problem:** Deploying LLMs in enterprise production environments exposes organizations to severe regulatory liability, data leakage, and security exploits. Traditional security auditing is manual, slow, and cannot mathematically prove isolation between adversarial testing teams and production models.
- **The Solution:** Centinela provides an automated, adversarial red-team vs. blue-team testing harness with multi-tenant cryptographic isolation (zero direct network connectivity between teams), an immutable Merkle/hash-chained audit ledger, real-time telemetry streaming via WebSockets, and a modern web dashboard.

---

## 2. Technology Stack Overview

| Layer | Technologies & Frameworks | Details & References |
|---|---|---|
| **Frontend UI** | [React 19](file:///frontend/package.json), [TanStack Start](file:///frontend/src/server.ts), [TanStack Router](file:///frontend/src/router.tsx), [TanStack Query](file:///frontend/src/routes/__root.tsx), Tailwind CSS v4, Lucide Icons, GSAP, Sonner | Full-stack SSR + SPA client running on Vite 7 |
| **API Gateway** | [Nginx](file:///infra/nginx/centinela-gateway.conf) (Port 8010) | Reverse proxy aggregating auth, session, benchmark, audit, ML, and WebSocket endpoints |
| **Auth & Config** | [FastAPI](file:///bayora/services/auth_service/main.py) (Port 8004), [Motor / MongoDB](file:///bayora/services/auth_service/main.py#L32-L34), [PyJWT](file:///bayora/services/auth_service/main.py#L6-L8), [Passlib/Bcrypt](file:///bayora/services/auth_service/main.py#L5-L6), [Fernet](file:///bayora/services/auth_service/main.py#L9-L10) | User signup/login, encrypted provider API keys (`configs` collection) |
| **Session Manager** | [FastAPI](file:///bayora/services/session_manager/main.py) (Port 8000), `aiokafka`, Cryptography Fernet | Mediated cryptographic bus broker, dynamic per-session key generation, micro-batching |
| **Inference Proxy** | [FastAPI](file:///bayora/services/llm_proxy/main.py) (Port 8002), [vLLM](file:///bayora/services/llm_proxy/inference.py#L53-L60), [Hugging Face Transformers](file:///bayora/services/llm_proxy/inference.py#L64-L75), [Google Gemini API](file:///bayora/services/llm_proxy/inference.py#L37-L47), [Ollama](file:///bayora/services/llm_proxy/inference.py#L77-L98) | Sandboxed inference with output echo filtering, semantic cosine leak detection, explicit VRAM purging |
| **Red Team Engine** | [FastAPI](file:///bayora/services/red_team/main.py) (Port 8003), [LiteLLM](file:///bayora/ml/attack_generators/engine.py#L6), AdversarialPromptEngine | Attack strategies: Direct, Jailbreak (DAN), Roleplay, PAIR (iterative LLM-in-the-loop), GCG suffix |
| **Blue Team Defense** | [FastAPI](file:///bayora/services/blue_team/main.py) (Port 8001), [PEFT / LoRA](file:///bayora/ml/classifiers/defense.py#L4-L26), `unitary/toxic-bert` | Sequence classification defense evaluating LLM responses for toxicity and policy violations |
| **Benchmark Service** | [FastAPI](file:///bayora/services/benchmark_service/main.py) (Port 8006), [PostgreSQL](file:///bayora/services/benchmark_service/database.py#L8-L15) (`bayora_benchmark`), `aiokafka` | Drill runner orchestration, progress tracking, historical leaderboard |
| **Audit Service** | [FastAPI](file:///bayora/services/audit_service/main.py) (Port 8005), [PostgreSQL](file:///bayora/services/audit_service/main.py#L19-L25) (`bayora_audit`), `aiokafka` | Tamper-evident hash-chained audit ledger (`audit_entries` table) |
| **Audit Gateway** | [FastAPI WebSocket](file:///bayora/services/audit_gateway/main.py) (Port 8011), `aiokafka` | Real-time WebSocket fanout of attack logs, classifications, and drill progress |
| **Message Broker** | [Apache Kafka](file:///docker-compose.yml#L8-L21) + Zookeeper | Topics: `red.prompts`, `llm.requests`, `llm.responses`, `blue.evaluation`, `audit.events`, `benchmark.reports`, `session.progress`, `classifications`, `security.violations` |
| **Infrastructure** | [Docker Compose](file:///docker-compose.yml), [Kubernetes (Strimzi, Istio, gVisor)](file:///bayora/infra/k8s/namespaces/apps.yaml), [Terraform AWS EKS](file:///bayora/infra/terraform/main.tf), Falco | Strict multi-namespace isolation, gVisor `runsc` runtime, seccomp syscall filtering |

---

## 3. Quickstart & Local Operation

### Prerequisites
- Python 3.11+ (Tested on Python 3.11, 3.12, 3.13)
- Node.js 20+ & npm
- Docker & Docker Compose
- (Optional for Cloud K8s) Terraform 1.7+, kubectl, AWS CLI

### 1. Launch Backend Infrastructure (Docker Compose)
To start the complete microservice network (Postgres, MongoDB, Kafka, Zookeeper, Nginx, and all Python services):
```bash
docker compose up --build
```
This binds:
- Nginx Gateway: `http://localhost:8010`
- Session Manager: `http://localhost:8000`
- Blue Team: `http://localhost:8001`
- LLM Proxy: `http://localhost:8002`
- Red Team: `http://localhost:8003`
- Auth & Config Service: `http://localhost:8004`
- Audit Service: `http://localhost:8005`
- Benchmark Service: `http://localhost:8006`
- WebSocket Audit Gateway: `ws://localhost:8011`
- PostgreSQL: `localhost:5432`
- MongoDB: `localhost:27017`

### 2. Launch Frontend (TanStack Start / React)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` (or the port reported by Vite) to view the landing page, sign up, configure audits, and monitor live attack streams.

### 3. Run Backend Test Suite
```bash
python -m pytest tests/integration/test_monitoring.py tests/integration/test_session_manager.py -v
```
*(Note: Full test suite execution requires pre-downloaded HuggingFace model cache for `unitary/toxic-bert` and `sentence-transformers/all-MiniLM-L6-v2`).*

---

## 4. Documentation Directory Guide

This discovery report is partitioned into focused, deep-dive specifications:

| Document | Purpose |
|---|---|
| [**`CODEBASE_REPORT.md`**](file:///docs/codebase-discovery/CODEBASE_REPORT.md) | **Primary Comprehensive Technical Report** covering architectural patterns, security models, data flows, and runtime topology. |
| [**`ARCHITECTURE.md`**](file:///docs/codebase-discovery/ARCHITECTURE.md) | Component boundary maps, multi-tier execution flows, cryptographic lifecycle, and 6 Mermaid diagrams. |
| [**`FEATURE_INVENTORY.md`**](file:///docs/codebase-discovery/FEATURE_INVENTORY.md) | Granular breakdown of all 18 discovered system features, status (Implemented / Mocked / Planned), evidence, and line numbers. |
| [**`API_REFERENCE.md`**](file:///docs/codebase-discovery/API_REFERENCE.md) | Complete interface catalog: REST endpoints, WebSocket events, Kafka topics, parameters, auth controls, and callers. |
| [**`DATA_MODEL.md`**](file:///docs/codebase-discovery/DATA_MODEL.md) | Database schemas (PostgreSQL, MongoDB), Kafka message schemas, ER diagram, and cryptographic ledger verification. |
| [**`IMPLEMENTATION_GAPS.md`**](file:///docs/codebase-discovery/IMPLEMENTATION_GAPS.md) | Evidence-backed catalogue of defects, TypeScript compiler errors, mock-only areas, abandoned Django code, and technical debt. |
| [**`summary.json`**](file:///docs/codebase-discovery/summary.json) | Machine-readable JSON summary indexing services, schemas, routes, and verification metrics. |
