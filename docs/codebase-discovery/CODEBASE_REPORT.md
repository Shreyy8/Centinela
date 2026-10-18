# Centinela (Bayora) — Comprehensive Technical Report & Architecture Discovery

> **Document Type:** Senior Software Architect & Technical Lead Codebase Discovery  
> **Repository:** [Centinela (formerly Bayora)](https://github.com/Shreyy8/Centinela.git)  
> **Branch:** `frontend`  
> **Date:** October 2026 (Updated with standalone demo server, backend process supervisor, in-memory database fallbacks, and test verification)  
> **Author:** Antigravity (Advanced Agentic Reverse Engineering)  

---

## Table of Contents
1. [Core Objectives & Executive Overview](#1-core-objectives--executive-overview)
2. [Repository Reconnaissance & File Map](#2-repository-reconnaissance--file-map)
3. [Complete Feature Inventory & Implementation Verification](#3-complete-feature-inventory--implementation-verification)
4. [Important Execution Paths Traced End-to-End](#4-important-execution-paths-traced-end-to-end)
5. [Frontend Architecture & Page Inventory](#5-frontend-architecture--page-inventory)
6. [Backend Microservice Architecture & Business Logic](#6-backend-microservice-architecture--business-logic)
7. [API & Communication Interface Inventory](#7-api--communication-interface-inventory)
8. [Database, Storage Systems & Cryptographic Ledger](#8-database-storage-systems--cryptographic-ledger)
9. [Architecture & Data Flow Diagrams](#9-architecture--data-flow-diagrams)
10. [Integrations & External Dependencies](#10-integrations--external-dependencies)
11. [Authentication, Authorization & Security Analysis](#11-authentication-authorization--security-analysis)
12. [Testing, Reliability & Observability](#12-testing-reliability--observability)
13. [Configuration, Startup & Deployment Topology](#13-configuration-startup--deployment-topology)
14. [Dependencies & Architectural Boundaries](#14-dependencies--architectural-boundaries)
15. [Implementation Gaps, Defects & Technical Debt](#15-implementation-gaps-defects--technical-debt)

---

## 1. Core Objectives & Executive Overview

### 1.1 What Problem the Project Solves
Deploying Large Language Models (LLMs) in enterprise production environments exposes organizations to severe regulatory liability, data leakage, and security exploits. However, traditional adversarial safety testing suffers from three critical architectural vulnerabilities:
1. **Side-Channel Information Leakage:** If the adversarial red team has real-time timing visibility into the target model's token generation or KV cache, they can infer hidden prompts or model weights.
2. **Untrusted Sandboxed Inference:** Running untrusted adversarial prompts against production-grade weights risks container escapes, unauthorized syscalls, or malicious egress probes.
3. **Audit Immutability & Regulatory Compliance:** Regulators (under HIPAA, SOX, GDPR, and the EU AI Act) require mathematically verifiable, tamper-evident proof that safety audits occurred as documented.

**Centinela** (internally and historically developed as **Bayora**) is an automated AI safety validation platform designed to orchestrate simultaneous adversarial red-team attacks and blue-team defenses against LLMs within a strictly isolated multi-tenant environment. It features:
- **Mediated Cryptographic Message Bus:** Strict four-key separation (`RED_KEY`, `LLM_KEY`, `SESSION_KEY`, `BLUE_KEY`) guaranteeing zero direct network connectivity between testing teams.
- **Sandboxed Inference Proxy:** Built-in semantic cosine similarity leak detection, echo filtering, and explicit VRAM/KV-cache memory destruction.
- **Tamper-Evident Merkle/Hash Ledger:** An append-only cryptographic ledger tracking all cross-boundary events with real-time SHA-256 chain verification.
- **Full-Stack Auditor Dashboard:** A React 19 / TanStack Start web portal providing live attack feed streaming via WebSockets and safety seal generation.

### 1.2 Target Audience & User Roles
- **Chief Information Security Officers (CISOs):** Require auditable compliance certificates and quantitative bypass rates before greenlighting LLM deployments.
- **AI Safety & Red-Teaming Engineers:** Configure attack drills, select mutation strategies (DAN, PAIR, GCG), and stress-test custom models.
- **Compliance Auditors:** Verify cryptographic proofs of audit integrity via public hash-chain verification endpoints.

---

## 2. Repository Reconnaissance & File Map

### 2.1 Workspace Structure & Responsibilities

```text
Centinela/
├── bayora/                                  # Core AI Safety Platform (Python microservices & ML)
│   ├── datasets/                            # Safety prompt datasets and loaders
│   │   ├── loaders/common.py                # DatasetLoader (AdvBench, JailbreakBench, Combined)
│   │   └── manifest.json                    # Metadata registry of datasets & adapters
│   ├── infra/                               # Cloud-native infrastructure specifications
│   │   ├── gvisor/runtimeclass.yaml         # Kubernetes RuntimeClass for runsc sandboxing
│   │   ├── k8s/                             # Kubernetes manifests (namespaces, Istio, netpols)
│   │   │   ├── istio/                       # mTLS peer authentication & authorization policies
│   │   │   ├── namespaces/                  # apps.yaml, kafka.yaml, quotas, secrets-rbac
│   │   │   ├── network-policies/            # Zero-trust network policies (default-deny)
│   │   │   └── pod-security/                # Seccomp syscall filtering profiles
│   │   ├── scripts/                         # Key generation and isolation testing scripts
│   │   └── terraform/                       # AWS EKS cluster deployment modules
│   ├── ml/                                  # Machine learning models & classifiers
│   │   ├── attack_generators/engine.py      # AdversarialPromptEngine (Direct, Jailbreak, PAIR, GCG)
│   │   ├── classifiers/defense.py           # DefenseClassifier (LoRA Toxic-BERT evaluator)
│   │   ├── classifiers/train_colab.py       # Training script for blue agent LoRA weights
│   │   └── models/blue_agent_lora/          # Fine-tuned adapter weights & tokenizer
│   ├── monitoring/                          # Observability & runtime intrusion detection
│   │   ├── dashboards/                      # Grafana dashboard & Prometheus alerting config
│   │   └── falco_rules/bayora_rules.yaml    # Falco rules detecting cross-namespace probes & syscalls
│   └── services/                            # FastAPI backend microservices
│       ├── audit_gateway/main.py            # WebSocket telemetry gateway (Kafka consumer + mock streamer)
│       ├── audit_service/main.py            # Append-only SHA-256 Merkle audit ledger
│       ├── auth_service/main.py             # User authentication & Fernet-encrypted API key storage
│       ├── benchmark_service/               # Drill orchestration, database, and leaderboard
│       │   ├── database.py                  # PostgreSQL interface with in-memory ledger fallback
│       │   └── main.py                      # REST endpoints for drill runs and status polling
│       ├── blue_team/main.py                # Blue team toxicity evaluation service
│       ├── llm_proxy/                       # Inference sandbox & memory management
│       │   ├── bus.py                       # LLM proxy message bus consumer
│       │   ├── inference.py                 # SandboxedInference (echo/semantic filter + VRAM purge)
│       │   └── main.py                      # LLM proxy service entry point
│       ├── red_team/main.py                 # Red team adversarial attack streaming engine
│       └── session_manager/                 # Cryptographic message bus broker & session state
│           ├── audit.py                     # AuditEventPublisher emitting to Kafka audit.events
│           ├── bus.py                       # IsolatedMessageBus with micro-batching
│           ├── main.py                      # Session lifecycle endpoints (/start, /infer, /end)
│           └── violations.py                # Falco intrusion breach handler & session terminator
├── docs/codebase-discovery/                 # Comprehensive reverse-engineering documentation
├── frontend/                                # Full-stack Web UI (React 19 / TanStack Start)
│   ├── src/
│   │   ├── components/                      # Shell, Footer, Preloader, and Shadcn UI components
│   │   ├── lib/api.ts                       # Fetch client & WebSocket telemetry manager
│   │   ├── routes/                          # TanStack router page definitions
│   │   │   ├── __root.tsx                   # Layout root with TanStack Query provider
│   │   │   ├── index.tsx                    # Landing page with interactive feature overview
│   │   │   ├── login.tsx & register.tsx     # Authentication screens
│   │   │   ├── config.tsx                   # Audit parameter selection & execution launcher
│   │   │   ├── audit.tsx                    # Real-time streaming audit telemetry dashboard
│   │   │   ├── results.tsx                  # Final resilience score & compliance certification
│   │   │   └── profile.tsx                  # User profile and audit history screen
│   │   ├── server.ts & start.ts             # TanStack Start SSR entry points
│   │   └── styles.css                       # Tailwind CSS v4 styling definitions
│   └── package.json                         # Node dependencies & build scripts
├── infra/nginx/centinela-gateway.conf       # Reverse proxy configuration for port 8010
├── tests/integration/                       # Pytest integration test suite
│   ├── test_llm_proxy.py                    # Inference sandboxing & memory purge tests
│   ├── test_monitoring.py                   # Falco intrusion violation tests
│   ├── test_pipelines.py                    # Red/Blue attack and defense pipeline tests
│   └── test_session_manager.py              # Cryptographic key lifecycle & micro-batch tests
├── demo_server.py                           # Single-process standalone demo server (:8004, :8006, :8000, :8011)
├── run_backend.py                           # Multiprocess supervisor launching all 8 microservices locally
├── docker-compose.yml                       # Full microservices compose orchestration
├── Dockerfile                               # Universal microservice container definition
├── Makefile                                 # Build, test, and deployment automation
└── PLAN.md                                  # Previous engineering implementation roadmap
```

---

## 3. Complete Feature Inventory & Implementation Verification

Centinela contains 21 identified system capabilities spanning frontend presentation, cryptographic orchestration, machine learning inference, and cloud infrastructure:

1. **User Authentication & JWT Issuance:** Fully implemented in [auth_service/main.py](file:///bayora/services/auth_service/main.py). Uses bcrypt via `passlib` and HMAC-SHA256 JWT tokens. Includes fallback to `demo_token` and MongoDB timeout handling.
2. **Encrypted Provider API Key Storage:** Implemented in [auth_service/main.py](file:///bayora/services/auth_service/main.py#L107-L130). Encrypts keys at rest using Fernet with `AUTH_ENCRYPTION_KEY`.
3. **Dynamic Session Lifecycle & Key Isolation:** Implemented and verified in [session_manager/main.py](file:///bayora/services/session_manager/main.py) and [test_session_manager.py](file:///tests/integration/test_session_manager.py). Dynamic Fernet key generated at `session/start` and purged at `session/end`.
4. **Micro-Batch Release Engine:** Implemented in [session_manager/bus.py](file:///bayora/services/session_manager/bus.py#L86-L116). Aggregates responses into batches of 5 before releasing to Blue Team to disrupt timing analysis.
5. **Sandboxed Inference & Echo Filtering:** Implemented in [llm_proxy/inference.py](file:///bayora/services/llm_proxy/inference.py#L156-L170). Replaces echoes with `[ECHO_FILTERED]`.
6. **Semantic Cosine Leak Detection:** Implemented in [llm_proxy/inference.py](file:///bayora/services/llm_proxy/inference.py#L172-L190). Flags responses having $>0.75$ cosine similarity with the prompt as `[SEMANTIC_ECHO_FILTERED]`.
7. **Explicit VRAM & KV Cache Destruction:** Implemented in [llm_proxy/inference.py](file:///bayora/services/llm_proxy/inference.py#L191-L219). Purges model parallel state, runs `torch.cuda.empty_cache()` and `gc.collect()`.
8. **Multi-Strategy Attack Generator:** Partially implemented in [attack_generators/engine.py](file:///bayora/ml/attack_generators/engine.py). Supports Direct, Jailbreak, Roleplay, PAIR, and static GCG suffixes.
9. **Safety Datasets:** Mocked in [datasets/loaders/common.py](file:///bayora/datasets/loaders/common.py). Contains 3 hardcoded prompts across AdvBench and JailbreakBench.
10. **LoRA-Finetuned Toxic-BERT Defense Classifier:** Implemented in [classifiers/defense.py](file:///bayora/ml/classifiers/defense.py). Combines `unitary/toxic-bert` with custom LoRA adapter weights.
11. **Benchmark Orchestration & Leaderboard:** Implemented in [benchmark_service/main.py](file:///bayora/services/benchmark_service/main.py) with PostgreSQL storage and `self._memory_runs` in-memory fallback.
12. **Tamper-Evident SHA-256 Merkle Ledger:** Implemented in [audit_service/main.py](file:///bayora/services/audit_service/main.py). Computes recursive hash chains and verifies chain integrity via `GET /verify`.
13. **Real-Time WebSocket Telemetry Gateway:** Implemented in [audit_gateway/main.py](file:///bayora/services/audit_gateway/main.py). Consumes Kafka topics and broadcasts to connected WebSocket clients.
14. **Zero-Dependency Mock Audit Streamer:** Implemented in [audit_gateway/main.py#L44-L121](file:///bayora/services/audit_gateway/main.py#L44-L121) and [demo_server.py](file:///demo_server.py). Streams 25 synthetic attacks with realistic latency when Kafka is offline.
15. **Falco Intrusion & Breach Termination:** Implemented in [violations.py](file:///bayora/services/session_manager/violations.py) and verified in `test_monitoring.py`. Terminates active sessions upon intrusion detection.
16. **Frontend Audit Configuration & Launch:** Implemented in [routes/config.tsx](file:///frontend/src/routes/config.tsx). Interactive configuration with fallback mock session generation.
17. **Frontend Live Audit Telemetry Dashboard:** Implemented in [routes/audit.tsx](file:///frontend/src/routes/audit.tsx). Renders real-time progress bars, live classification cards, and threat charts. Contains a TypeScript compilation warning on line 85.
18. **Frontend Results & Regulatory Certificates:** Implemented in [routes/results.tsx](file:///frontend/src/routes/results.tsx). Renders Resilience Score, Bypass Rate, and compliance certification badges.
19. **User Profile Editing & Audit History:** UI Present, Backend Missing ([routes/profile.tsx](file:///frontend/src/routes/profile.tsx)). Edits only update React local state.
20. **PDF Audit Certificate Export:** UI Present, Backend Missing ([routes/results.tsx:268-272](file:///frontend/src/routes/results.tsx#L268-L272)). Button has no click handler.
21. **Django Orchestrator Service:** Broken/Abandoned ([services/orchestrator/src/orchestrator/settings.py](file:///services/orchestrator/src/orchestrator/settings.py)). Contains socket error string on line 1 and lacks URL/model definitions.

---

## 4. Important Execution Paths Traced End-to-End

### 4.1 The Complete Adversarial Drill Execution Path
1. **User Initiation:** On `/config`, the user selects target provider (e.g. OpenAI), model (`gpt-4-turbo-preview`), domain (`Healthcare`), and budget ($250). Clicking "EXECUTE ADVERSARIAL AUDIT" triggers `startAuditMutation`.
2. **Configuration Persistence:** The frontend fires a `PUT /config/settings` to `http://localhost:8004` to persist parameters, and `POST /config/api-key` if an API key was provided.
3. **Drill Launch:** The frontend posts to `http://localhost:8006/drills/run` with `drill_name`, `domain`, and calculated attack count (`budget / 0.5 = 50`).
4. **Session Handshake:** Benchmark Service calls Session Manager `POST /session/start` (:8000). Session Manager creates a session ID and generates an ephemeral 32-byte Fernet key, emitting a `SESSION_START` event to Kafka `audit.events`.
5. **Database Initialization:** Benchmark Service inserts a row into `benchmark_runs` with status `pending`.
6. **Attack Trigger:** Benchmark Service triggers Red Team via `POST /attack/stream` (:8003).
7. **Frontend Transition:** The frontend receives the `session_id` and navigates to `/audit?session_id=...`.
8. **WebSocket Telemetry:** Frontend connects to `ws://localhost:8011/ws/{session_id}`. Audit Gateway accepts the socket and begins streaming events.
9. **Adversarial Generation & Encryption:** Red Team mutates base prompts using selected strategies (Jailbreak, Roleplay, PAIR), encrypts payloads with `RED_KEY`, and produces them to Kafka `red.prompts`.
10. **Session Mediation:** Session Manager consumes `red.prompts`, decrypts payloads with `RED_KEY`, re-encrypts with `LLM_KEY`, and publishes to `llm.requests` with the `session_key` attached in the header.
11. **Sandboxed Inference:** LLM Proxy consumes `llm.requests`, decrypts with `LLM_KEY`, queries the target model (Gemini, Ollama, or Mock), runs output filters (echo check, system marker strip, and MiniLM semantic similarity check), encrypts the response with `SESSION_KEY`, and produces to `llm.responses`.
12. **Micro-Batching:** Session Manager consumes `llm.responses`, decrypts with `SESSION_KEY`, and queues responses. Once 5 responses accumulate, it re-encrypts the bundle with `BLUE_KEY` and publishes to `blue.evaluation`.
13. **Defense Evaluation:** Blue Team consumes `blue.evaluation`, evaluates toxicity using LoRA Toxic-BERT, and emits individual classifications to `classifications` and the aggregate report to `benchmark.reports`.
14. **Telemetry Fanout:** Audit Gateway reads `classifications` and pushes live updates to the frontend WebSocket. The frontend updates threat charts, passing/failing counters, and progress meters.
15. **Drill Finalization:** Benchmark Service consumes `benchmark.reports`, updates `benchmark_runs` to status `completed`, and calls Session Manager `POST /session/end`.
16. **Session Teardown:** Session Manager permanently purges the `SESSION_KEY` from memory, flushes any unreleased responses, and emits `SESSION_END` to `audit.events`.
17. **Results View:** Audit Gateway sends `session_ended` over WebSocket. The frontend enables the "VIEW FINAL RESULTS & CERTIFICATE" button, allowing the user to view `/results` showing Resilience Score and compliance certification badges.

---

## 5. Frontend Architecture & Page Inventory

The frontend is a modern single-page application built with React 19, TanStack Start (SSR), TanStack Router, TanStack Query, and Tailwind CSS v4.

### Page Inventory

| Route | File Path | Purpose | Key Data Sources |
|---|---|---|---|
| `/` | [routes/index.tsx](file:///frontend/src/routes/index.tsx) | Landing page introducing Centinela's adversarial safety harness | Static, GSAP animations |
| `/login` | [routes/login.tsx](file:///frontend/src/routes/login.tsx) | User login and JWT acquisition | `POST /auth/login` (:8004) |
| `/register` | [routes/register.tsx](file:///frontend/src/routes/register.tsx) | User registration | `POST /auth/signup` (:8004) |
| `/config` | [routes/config.tsx](file:///frontend/src/routes/config.tsx) | Audit parameter selection and drill execution | `PUT /config/settings`, `POST /drills/run` |
| `/audit` | [routes/audit.tsx](file:///frontend/src/routes/audit.tsx) | Real-time live attack streaming dashboard | `ws://localhost:8011/ws/{session_id}` |
| `/results` | [routes/results.tsx](file:///frontend/src/routes/results.tsx) | Final audit report, scorecards, compliance seals | `GET /drills/{session_id}/status` (:8006) |
| `/profile` | [routes/profile.tsx](file:///frontend/src/routes/profile.tsx) | User profile and organization details | Local component state (mock) |

---

## 6. Backend Microservice Architecture & Business Logic

Centinela follows a clean separation of concerns across 8 dedicated Python services:

1. **`auth_service` (:8004):** Manages user authentication and encrypts LLM provider API keys using Fernet before storing them in MongoDB. Features graceful degradation when MongoDB is unavailable.
2. **`session_manager` (:8000):** Acts as the central cryptographic broker. Generates ephemeral session keys, mediates prompt forwarding between Red Team and LLM Proxy, aggregates responses into micro-batches of 5, and logs audit events to Kafka.
3. **`llm_proxy` (:8002):** Executes sandboxed inference against target LLMs. Enforces prompt echo filtering, cosine semantic leak detection (MiniLM-L6-v2), and forces complete GPU VRAM purging on session completion.
4. **`red_team` (:8003):** Adversarial prompt generation engine supporting Direct, DAN Jailbreaks, Roleplay obfuscation, PAIR (LLM-in-the-loop), and GCG suffix attacks.
5. **`blue_team` (:8001):** Defense classification service using a fine-tuned LoRA adapter on `unitary/toxic-bert` to classify responses as safe or harmful.
6. **`benchmark_service` (:8006):** Orchestrates drills, manages the `benchmark_runs` database in PostgreSQL, tracks progress, and calculates the defense leaderboard.
7. **`audit_service` (:8005):** Manages the tamper-evident SHA-256 Merkle chain in PostgreSQL (`bayora_audit`), verifying ledger consistency from genesis on demand.
8. **`audit_gateway` (:8011):** High-throughput WebSocket server streaming live attack events to frontends, with built-in synthetic simulation when Kafka is unavailable.

---

## 7. Complete API & Interface Inventory

*(Detailed in [API_REFERENCE.md](file:///docs/codebase-discovery/API_REFERENCE.md))*

All microservices expose RESTful HTTP endpoints via FastAPI and communicate asynchronously over Apache Kafka topics:
- **Edge Gateway:** Port 8010 via Nginx.
- **REST Endpoints:** 24 distinct endpoints across the 8 microservices.
- **WebSocket Gateway:** `ws://localhost:8011/ws/{session_id}` supporting `connected`, `progress`, `classification`, and `session_ended` events.
- **Kafka Topics:** 9 specialized topics (`red.prompts`, `llm.requests`, `llm.responses`, `blue.evaluation`, `classifications`, `benchmark.reports`, `session.progress`, `audit.events`, `security.violations`).

---

## 8. Database, Storage Systems & Cryptographic Ledger

*(Detailed in [DATA_MODEL.md](file:///docs/codebase-discovery/DATA_MODEL.md))*

- **PostgreSQL (`bayora_audit`):** Stores `audit_entries` where each entry's hash is computed as $\text{SHA256}(\text{entry} + \text{prev\_hash})$.
- **PostgreSQL (`bayora_benchmark`):** Stores `benchmark_runs` tracking session IDs, drill parameters, attack counts, bypass rates, and JSON evaluation reports.
- **MongoDB (`bayora_auth`):** Stores `users` (bcrypt password hashes) and `configs` (Fernet-encrypted provider API keys).
- **In-Memory Fallbacks:** Both `benchmark_service` and `audit_service` implement in-memory data structures (`self._memory_runs` and `self.chain`) enabling the platform to run seamlessly in demo and offline environments.

---

## 9. Architecture & Data Flow Diagrams

*(Detailed in [ARCHITECTURE.md](file:///docs/codebase-discovery/ARCHITECTURE.md))*

Six Mermaid diagrams illustrate the system architecture:
1. High-Level Component & Service Boundary Diagram
2. Four-Key Cryptographic Isolation Sequence Diagram
3. End-to-End Drill Execution Flow
4. Sandboxed Inference & Filter Decision Tree
5. Entity-Relationship Schema Diagram
6. Audit Ledger Verification Flow

---

## 10. Integrations & External Dependencies

| Integration | Source Location | Purpose | Fallback / Mock Behavior |
|---|---|---|---|
| **Google Gemini API** | [llm_proxy/inference.py:37-47](file:///bayora/services/llm_proxy/inference.py#L37-L47) | Target model inference | Falls back to local Transformers or Mock LLM |
| **Ollama API** | [llm_proxy/inference.py:77-98](file:///bayora/services/llm_proxy/inference.py#L77-L98) | Local open-source model inference | Falls back to Mock LLM if unreachable |
| **LiteLLM** | [attack_generators/engine.py:49-76](file:///bayora/ml/attack_generators/engine.py#L49-L76) | PAIR iterative red-teaming | Falls back to static templates if API fails |
| **Apache Kafka** | All services (`aiokafka`) | Asynchronous message broker | All services implement in-memory mock modes |
| **PostgreSQL** | `audit_service`, `benchmark_service` | Persistent relational storage | Both services implement in-memory ledger fallbacks |
| **MongoDB** | `auth_service` (`motor`) | User credentials & configs | Timeout protection allows demo mode execution |
| **SentenceTransformers**| [llm_proxy/inference.py:24](file:///bayora/services/llm_proxy/inference.py#L24) | Semantic cosine leak detection | Exception caught gracefully |
| **Falco** | [monitoring/falco_rules/](file:///bayora/monitoring/falco_rules/) | Runtime syscall & DNS intrusion detection | `violations.py` handles incoming events |

---

## 11. Authentication, Authorization & Security Analysis

### Verified Security Controls
1. **Zero Direct Network Connectivity:** Enforced by Kubernetes network policies, Istio peer authentication, and the 4-key Fernet encryption bus.
2. **Cryptographic Erasure:** At session completion, `SESSION_KEY` is explicitly deleted from memory, making past session communications permanently unrecoverable.
3. **Hardware Isolation:** Sandboxed services declare `runtimeClassName: gvisor-sandboxed`, executing under the gVisor application kernel.
4. **Intrusion Response:** Falco monitors runtime events and triggers automated session termination upon detecting cross-namespace DNS probes or blocked syscalls.

### Security Deficiencies
1. **Plaintext Session Key in Kafka Header:** In `session_manager/bus.py:54`, the `session_key` is passed as a plaintext Kafka header on topic `llm.requests`.
2. **No-Op Session Auth Hook:** `session_manager/main.py:105` uses `verify_token()` returning `user: anonymous` rather than validating JWT signatures.
3. **Single Global Audit Lock:** `audit_service/main.py` uses an in-process threading lock across all sessions, limiting horizontal scalability.

---

## 12. Testing, Reliability & Observability

### Automated Test Suite
- Located in `tests/integration/`:
  - `test_session_manager.py`: Verifies session lifecycle, micro-batching, and audit logging (**4 passed**).
  - `test_monitoring.py`: Verifies Falco intrusion detection and session termination (**1 passed**).
  - `test_pipelines.py`: Verifies red-team attack generation and blue-team batch evaluation (**2 passed**).
  - `test_llm_proxy.py`: Verifies echo filtering, semantic similarity detection, and memory purging (**4 passed, 1 failed due to `.encode()` on bytes at line 66**).

### Observability
- Prometheus alerting rules configured in `bayora/monitoring/dashboards/prometheus.yaml`.
- Grafana dashboard definition provided in `bayora/monitoring/dashboards/grafana.json`.
- Falco behavioral intrusion rules configured in `bayora/monitoring/falco_rules/bayora_rules.yaml`.

---

## 13. Configuration, Startup & Deployment Topology

### Three Supported Runtime Modes:
1. **Zero-Dependency Demo Server:** `python demo_server.py` runs all core mock services on ports 8004, 8006, 8000, 8011 in a single process.
2. **Direct Python Microservices Runner:** `python run_backend.py` spawns all 8 FastAPI services concurrently with auto-generated Fernet keys.
3. **Full Docker Compose Mesh:** `docker compose up --build` launches Kafka, Zookeeper, PostgreSQL, MongoDB, Nginx gateway, and all 8 services.

### Cloud Deployment (Kubernetes / Istio)
- Automated deployment script in `deploy.ps1` and `Makefile`.
- Microservices deployed across 7 dedicated namespaces with gVisor sandboxing and Istio mTLS.
- AWS EKS cluster provisioning defined in `bayora/infra/terraform/main.tf`.

---

## 14. Dependencies & Architectural Boundaries

- **Python Runtime:** Python 3.11+ with FastAPI, Uvicorn, Pydantic, Cryptography, AIOKafka, Psycopg2, Motor, PyJWT, PyTorch, Transformers, PEFT, and LiteLLM.
- **Frontend Runtime:** Node.js 20+ with React 19, TanStack Start, TanStack Router, TanStack Query, Vite 7, and Tailwind CSS v4.
- **Architectural Separation:** Clean boundaries maintained between red team attack generation, blue team defense evaluation, session mediation, and persistent audit logging.

---

## 15. Implementation Gaps, Defects & Technical Debt

*(Detailed in [IMPLEMENTATION_GAPS.md](file:///docs/codebase-discovery/IMPLEMENTATION_GAPS.md) and phased in [IMPROVEMENTS.md](file:///IMPROVEMENTS.md))*

1. **Frontend TS2554 Compiler Warning:** `frontend/src/routes/audit.tsx:85` expects an initial argument for `useRef`.
2. **Test Bug in `test_llm_proxy.py:66`:** Calling `.encode()` on `LLM_KEY` (already `bytes`).
3. **Corrupted Django Settings:** Socket error prepended to line 1 of `services/orchestrator/src/orchestrator/settings.py`.
4. **Stale Makefile Paths:** Test target points to obsolete file paths.
5. **Plaintext Session Key Transmission:** Key exposed in Kafka header `llm.requests`.
6. **Kafka Docker Compose Listener Mismatch:** Advertised listener set to `localhost:9092`.
7. **Non-Atomic Audit Head Advance:** `_head_hash` advances even if database insert fails.
8. **Insecure Deserialization:** `ast.literal_eval` used instead of standard JSON.
9. **K8s Manifest Drift:** Missing `auth-service`, `audit-gateway`, and `mongodb` in `apps.yaml`.
10. **Hardcoded Safety Datasets:** AdvBench and JailbreakBench have only 3 total prompts.
11. **Frontend Port Bypassing:** Client connects directly to microservice ports instead of Nginx :8010.
12. **Static Mock UI Elements:** PDF download button has no handler; profile edits are local state only.
