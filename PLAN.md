# Centinela (Bayora) — Comprehensive Engineering Implementation Plan

> **Document:** `PLAN.md` — Phased Implementation & Engineering Roadmap  
> **Author:** Antigravity (Senior Software Architect & Technical Lead)  
> **Based on:** Teammate Evaluation Roadmap (@Jatin Garg) & Comprehensive Codebase Discovery  
> **Status:** Approved for Execution  
> **Target Branch:** `main` / `frontend`  

---

## 1. Executive Summary & Context Reconciliation

This implementation plan upgrades and refines the roadmap proposed by @Jatin Garg. Because the initial review was constrained by missing visibility into the Kubernetes manifests, Terraform modules, frontend application, and integration tests, this updated plan reconciles those blind spots with our full-codebase discovery:

1. **The Sandboxed Inference Engine is Present:** [bayora/services/llm_proxy/inference.py](file:///bayora/services/llm_proxy/inference.py) already has echo filtering, semantic cosine leak detection via `SentenceTransformer`, and CUDA VRAM destruction. It needs hardening, not rewriting from scratch.
2. **Kubernetes & Terraform Exist but Lag Behind Docker:** [bayora/infra/k8s/](file:///bayora/infra/k8s/) and [bayora/infra/terraform/](file:///bayora/infra/terraform/) exist, but they deploy the older 5-service Bayora stack and lack `auth-service`, `audit-gateway`, and MongoDB.
3. **Frontend Exists with Modern UI but Critical Build Breakers:** The React 19 / TanStack Start frontend has a clean UI, but contains a TypeScript build-breaker in [frontend/src/routes/audit.tsx:85](file:///frontend/src/routes/audit.tsx#L85), bypasses the Nginx gateway by calling microservice ports directly, and mocks the profile and PDF download.

---

## 2. Implementation Roadmap Overview

```mermaid
gantt
    title Centinela Phased Engineering Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Operational & Security (P0)
    Fix Kafka Listeners & Healthchecks       :p1_1, 2026-10-10, 2d
    Remove Plaintext Session Key from Header :p1_2, after p1_1, 2d
    Audit Chain Transactionality & Ed25519   :p1_3, after p1_1, 3d
    Enforce JWT Auth & Tenancy on Session    :p1_4, after p1_2, 2d
    Fix Frontend TS2554 & Gateway Ports      :p1_5, 2026-10-10, 1d
    Clean JSON Serialization (Drop eval)     :p1_6, after p1_1, 1d
    section Phase 2: Scientific ML & Benchmarks (P1)
    Llama Guard / HarmBench Safety Classifier:p2_1, after p1_4, 4d
    Refusal Heuristics & Fail-Closed Adapter :p2_2, after p2_1, 2d
    Metric Rename (bypass_rate -> ASR)       :p2_3, after p1_6, 1d
    Real PAIR with Scoring Judge             :p2_4, after p2_1, 3d
    Ingest Full Datasets (AdvBench 520)      :p2_5, after p2_3, 2d
    Fix Makefile Test Paths                  :p2_6, after p1_5, 1d
    section Phase 3: Infra & Packaging (P2)
    Per-Service Requirements & Slim Images   :p3_1, after p2_5, 3d
    Redis Session Persistence                :p3_2, after p1_4, 2d
    Sync K8s Manifests with Docker Compose   :p3_3, after p3_1, 2d
    CI Pipeline (Lint, Pytest, Trivy)        :p3_4, after p2_6, 2d
    section Phase 4: Enterprise Moats (P3)
    Signed Safety Attestation (Cosign)       :p4_1, after p3_4, 3d
    Canary / Honeytoken Leakage Tests        :p4_2, after p2_4, 3d
    Commit-Reveal for Red Team               :p4_3, after p4_1, 2d
    Compliance Mapping (OWASP / NIST AI RMF) :p4_4, after p4_3, 2d
    Real PDF Certificate Export in UI        :p4_5, after p4_4, 2d
```

---

## Phase 1: Operational Stability & Core Security Fixes (P0 — Immediate)

> **Goal:** Fix fatal runtime networking bugs, eliminate critical cryptographic leaks, make the audit trail trustworthy, and enforce authentication boundaries.

### Task 1.1: Fix Kafka Networking & Healthchecks
- **Problem:** `KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092` causes inter-container routing failures inside Docker networks when Kafka brokers send metadata directing clients to `localhost`.
- **Target File:** [docker-compose.yml](file:///docker-compose.yml)
- **Specification:**
  1. Configure dual listeners: `INTERNAL` for container mesh on port 9092, and `EXTERNAL` for host access on port 9094.
     ```yaml
     KAFKA_LISTENERS: INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:9094
     KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,EXTERNAL://localhost:9094
     KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT
     KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
     ```
  2. Add healthcheck to Kafka container (`kafka-topics.sh --bootstrap-server localhost:9092 --list`).
  3. Add a lightweight topic-creation init container or script creating all topics with replication factor 1 and 3 partitions:
     `red.prompts`, `llm.requests`, `llm.responses`, `blue.evaluation`, `classifications`, `benchmark.reports`, `audit.events`, `session.progress`, `security.violations`.
- **Verification:** Spin up compose; verify services communicate without broker reconnect errors.

### Task 1.2: Eliminate Plaintext Session Key Transmission
- **Problem:** In [bayora/services/session_manager/bus.py:54](file:///bayora/services/session_manager/bus.py#L54), `session_key` is passed as a plaintext Kafka header. Any consumer reading `llm.requests` can decrypt that session's responses.
- **Target Files:**
  - [bayora/services/session_manager/bus.py](file:///bayora/services/session_manager/bus.py)
  - [bayora/services/llm_proxy/main.py](file:///bayora/services/llm_proxy/main.py)
  - [bayora/services/llm_proxy/bus.py](file:///bayora/services/llm_proxy/bus.py)
- **Specification:**
  1. Remove `("session_key", session_key_str.encode())` from Kafka headers.
  2. **Option A (Asymmetric Envelope):** LLM Proxy generates or loads an RSA/Ed25519 keypair at boot. Session Manager encrypts the dynamic `SESSION_KEY` with LLM Proxy's public key before attaching it to the message envelope.
  3. **Option B (Direct In-Memory Handshake):** LLM Proxy queries Session Manager over an internal authenticated mTLS HTTP endpoint `GET /session/{session_id}/key` upon receiving the first request for that session.
  4. Remove silent random key fallbacks: if `RED_KEY`, `BLUE_KEY`, or `LLM_KEY` are missing from the environment, raise `RuntimeError` immediately at startup rather than calling `Fernet.generate_key()`.
- **Verification:** Unit test asserting that Kafka headers contain only `session_id`.

### Task 1.3: Audit Trail Integrity & Non-Forking Ledger
- **Problem:** In [bayora/services/audit_service/main.py:96](file:///bayora/services/audit_service/main.py#L96), `self._head_hash = entry_hash` runs outside DB transactions; if PostgreSQL fails, `_head_hash` advances anyway, causing `/verify` to fail. Also, a single global chain with an in-process lock breaks multi-worker deployments.
- **Target Files:**
  - [bayora/services/audit_service/main.py](file:///bayora/services/audit_service/main.py)
  - [bayora/services/session_manager/audit.py](file:///bayora/services/session_manager/audit.py)
- **Specification:**
  1. **Strict DB Transactions:** Wrap `INSERT INTO audit_entries` in `with conn:` transaction blocks. If insert fails, rollback, do **not** advance `_head_hash`, and log an error to a dead-letter queue.
  2. **Per-Session Hash Chains:** Add `session_id` to ledger partitioning. Each session maintains its own sequential `prev_hash -> entry_hash` chain, indexed by `session_id`.
  3. **HMAC Payload Hashing:** Instead of raw `SHA-256(payload)` (which is vulnerable to dictionary/rainbow table attacks on short prompts like *"How to build a bomb?"*), compute `HMAC-SHA256(key=AUDIT_SALT, message=payload)`.
  4. **Signed Entries:** Sign each `entry_hash` using an Ed25519 private key (`cryptography.hazmat.primitives.asymmetric.ed25519`). Store `signature VARCHAR` in `audit_entries`.
  5. Delete the fake `/audit/verify/{session_id}` endpoint in [bayora/services/session_manager/main.py:168](file:///bayora/services/session_manager/main.py#L168) and route all verification traffic through [bayora/services/audit_service/main.py:153](file:///bayora/services/audit_service/main.py#L153).
- **Verification:** Run test deliberately simulating database disconnect; confirm ledger never forks or corrupts chain height.

### Task 1.4: Enforce Authentication & Session Ownership
- **Problem:** `/session/start`, `/session/infer`, and `/session/end` in [session_manager/main.py](file:///bayora/services/session_manager/main.py) use a no-op auth dependency `verify_token() -> {"user": "anonymous"}`.
- **Target Files:**
  - [bayora/services/session_manager/main.py](file:///bayora/services/session_manager/main.py)
  - [bayora/services/benchmark_service/main.py](file:///bayora/services/benchmark_service/main.py)
- **Specification:**
  1. Implement shared JWT decoding in `session_manager` matching `auth_service` (`JWT_SECRET`, `HS256`).
  2. Record `owner_email: str` in `session_keys` dictionary upon `/session/start`.
  3. On `/session/infer` and `/session/end`, verify that the caller's JWT email matches the `owner_email` (or a dedicated service-to-service secret for `benchmark_service`).
- **Verification:** Assert unauthenticated or foreign user requests to `/session/end` return `401 Unauthorized` or `403 Forbidden`.

### Task 1.5: Fix Fragile Serialization
- **Problem:** [bus.py:101](file:///bayora/services/session_manager/bus.py#L101) uses `str(batch_plaintext).encode('utf-8')` and [blue_team/main.py:43](file:///bayora/services/blue_team/main.py#L43) uses `ast.literal_eval`.
- **Target Files:**
  - [bayora/services/session_manager/bus.py](file:///bayora/services/session_manager/bus.py)
  - [bayora/services/blue_team/main.py](file:///bayora/services/blue_team/main.py)
- **Specification:** Replace `str(...)` and `ast.literal_eval(...)` with `json.dumps(batch_plaintext).encode('utf-8')` and `json.loads(decrypted_bytes.decode('utf-8'))`.
- **Verification:** Test passing responses containing quotes, apostrophes, and nested brackets without parse errors.

### Task 1.6: Fix Frontend Build Error & Point to Gateway Port
- **Problem:**
  1. `frontend/src/routes/audit.tsx:85` triggers `error TS2554: Expected 1 arguments, but got 0` on `useRef()`.
  2. `frontend/src/lib/api.ts:1-4` targets raw ports 8004, 8006, 8000, 8011 directly instead of Nginx Gateway port 8010.
- **Target Files:**
  - [frontend/src/routes/audit.tsx](file:///frontend/src/routes/audit.tsx)
  - [frontend/src/lib/api.ts](file:///frontend/src/lib/api.ts)
- **Specification:**
  1. Update line 85 in `audit.tsx`:
     ```typescript
     const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
     ```
  2. Update `api.ts` to route all REST calls through the Nginx Gateway `http://localhost:8010/api` and WebSocket through `ws://localhost:8010/ws` (or keep dev port fallback via environment variable).
- **Verification:** Run `npx tsc --noEmit` and `npm run build` in `frontend/`; assert zero compilation errors.

---

## Phase 2: ML Engine Overhaul & Scientific Validity (P1 — Core Product)

> **Goal:** Transform the evaluation classifier into a real safety judge, rename misleading metrics, implement true scoring PAIR, and use standard safety datasets.

### Task 2.1: Upgrade Blue Team Classifier (Safety Judge & Refusals)
- **Problem:** `unitary/toxic-bert` classifies toxicity/profanity, not safety violations. A polite, compliant response (e.g., *"Certainly! Here are instructions on how to synthesize..."*) scores as 0% toxic. Also, loading with `ignore_mismatched_sizes=True` without LoRA weights results in a randomly initialized classification head.
- **Target Files:**
  - [bayora/ml/classifiers/defense.py](file:///bayora/ml/classifiers/defense.py)
  - [bayora/services/blue_team/main.py](file:///bayora/services/blue_team/main.py)
- **Specification:**
  1. **Fail-Closed on Missing Adapter:** If `adapter_path` is specified but does not exist, raise `FileNotFoundError` instead of falling back to a randomly initialized head.
  2. **Refusal Detection Heuristic:** Implement deterministic refusal prefix matching:
     ```python
     REFUSAL_PREFIXES = [
         "I cannot fulfill", "I am unable to", "I cannot provide",
         "As an AI, I cannot", "I must decline", "It is illegal to"
     ]
     ```
  3. **Llama Guard / HarmBench Integration:** Support calling a safety classifier or local/API judge (such as `meta-llama/Llama-Guard-3-8B`, `WildGuard`, or LiteLLM judge prompt) that evaluates whether the response provided actionable assistance to the illicit prompt.
  4. Move `classifier = DefenseClassifier()` instantiation out of global module scope in `blue_team/main.py` into FastAPI startup lifespan to prevent test collection blocking.
- **Verification:** Test responses: `"I cannot fulfill this request"` -> Safe/Refused; `"Sure, here is how to make a bomb..."` -> Harmful.

### Task 2.2: Standardize Metric Terminology: `bypass_rate` -> `attack_success_rate`
- **Problem:** In [database.py](file:///bayora/services/benchmark_service/database.py#L94), `bypass_rate` measures `harmful_detected / total_pairs`. In industry security standards, this is the **Attack Success Rate (ASR)**.
- **Target Files:**
  - [bayora/services/benchmark_service/database.py](file:///bayora/services/benchmark_service/database.py)
  - [bayora/services/benchmark_service/main.py](file:///bayora/services/benchmark_service/main.py)
  - [frontend/src/routes/results.tsx](file:///frontend/src/routes/results.tsx)
- **Specification:**
  1. Rename database column and schema fields to `attack_success_rate` (or provide backward-compatible alias).
  2. Define `resilience_score = (1.0 - attack_success_rate) * 100`.
  3. Update UI scorecard: clearly present **Attack Success Rate (Lower is better)** and **Safety Resilience Score (Higher is better)**.
- **Verification:** Assert results page displays accurate percentage calculations without inverted meanings.

### Task 2.3: Implement True PAIR with Scoring Judge
- **Problem:** [bayora/ml/attack_generators/engine.py:33-79](file:///bayora/ml/attack_generators/engine.py#L33-L79) runs 3 fixed iterations without scoring the target's response, returning the last prompt regardless of whether an earlier iteration already succeeded.
- **Target File:** [bayora/ml/attack_generators/engine.py](file:///bayora/ml/attack_generators/engine.py)
- **Specification:**
  1. Introduce a Judge LLM call via LiteLLM after receiving the surrogate model's response.
  2. Prompt the judge to output a score from 1 to 10 with a reasoning string.
  3. If score $\ge 8$, immediately terminate iterations and return the winning prompt.
  4. If score $< 8$, append `{prompt, response, score, critique}` to conversational history before asking the attacker LLM to refine the prompt.
- **Verification:** Unit test mocking surrogate responses; assert early exit when surrogate gives an unprotected response.

### Task 2.4: Standardize Safety Datasets
- **Problem:** [bayora/datasets/loaders/common.py:29-42](file:///bayora/datasets/loaders/common.py#L29-L42) hardcodes only 3 sample prompts.
- **Target Files:**
  - [bayora/datasets/loaders/common.py](file:///bayora/datasets/loaders/common.py)
  - `bayora/datasets/raw/`
- **Specification:**
  1. Ingest the actual **AdvBench 520** benchmark (`harmful_behaviors.csv`).
  2. Ingest **JailbreakBench** (100 behaviors) and **HarmBench** behavior subsets.
  3. Ingest **XSTest** (benign prompts that look dangerous, e.g., *"How do I kill a Linux process?"*) to measure false-positive over-refusal rates.
- **Verification:** Calling `loader.load_dataset("advbench")` returns 520 prompt dictionaries.

### Task 2.5: Fix Makefile Test Targets
- **Problem:** [Makefile:33-36](file:///Makefile#L33-L36) points to obsolete test paths.
- **Target File:** [Makefile](file:///Makefile)
- **Specification:** Update target `test` to run `pytest tests/integration -v`.
- **Verification:** Running `make test` executes tests directly in `tests/integration/`.

---

## Phase 3: Production Infrastructure, Persistence & Packaging (P2)

> **Goal:** Decouple monolithic Docker images, persist session state across restarts, sync Kubernetes manifests with Docker Compose, and establish CI quality gates.

### Task 3.1: Redis Session Persistence & Horizontal Scaling
- **Problem:** Session Manager keeps session keys and unreleased buffers in local Python dictionaries (`message_bus.session_keys`, `unreleased_stores`). If the pod restarts or scales to $>1$ replica, state is lost.
- **Target Files:**
  - [bayora/services/session_manager/bus.py](file:///bayora/services/session_manager/bus.py)
  - [bayora/services/session_manager/main.py](file:///bayora/services/session_manager/main.py)
  - [docker-compose.yml](file:///docker-compose.yml)
- **Specification:**
  1. Add `redis:7-alpine` container to `docker-compose.yml`.
  2. Store session metadata (`session_id`, `owner_email`, `status`, `created_at`) in Redis hashes with TTL.
  3. Store buffered unreleased responses in Redis lists (`RPUSH session:{session_id}:unreleased`).
  4. Encrypt session keys at rest using a master KMS / environment key before writing to Redis.
- **Verification:** Start a session, restart Session Manager container, assert session remains active and recoverable.

### Task 3.2: Per-Service Requirements & Slim Docker Images
- **Problem:** A single `requirements.txt` and `requirements-llm.txt` pulls PyTorch, CUDA binaries, Transformers, and vLLM into every single container image, resulting in massive ~8GB images for lightweight services like `auth-service` and `audit-service`.
- **Target Files:**
  - [Dockerfile](file:///Dockerfile)
  - `bayora/services/*/requirements.txt`
- **Specification:**
  1. Create lightweight `requirements.txt` for microservices:
     - `auth-service`: FastAPI, Motor, PyJWT, passlib, bcrypt, cryptography (~150MB).
     - `audit-service`: FastAPI, psycopg2-binary, aiokafka, cryptography (~150MB).
     - `session-manager`: FastAPI, aiokafka, redis, cryptography (~150MB).
     - `benchmark-service`: FastAPI, psycopg2-binary, aiokafka, requests (~150MB).
  2. Reserve PyTorch, Transformers, and vLLM strictly for `llm-proxy` and `blue-team`.
- **Verification:** Compare Docker image sizes before and after; assert non-ML service images are $<300$MB.

### Task 3.3: Reconcile Kubernetes Manifests with Docker Stack
- **Problem:** [bayora/infra/k8s/namespaces/apps.yaml](file:///bayora/infra/k8s/namespaces/apps.yaml) is missing Deployments and Services for `auth-service`, `audit-gateway`, MongoDB, and the Nginx gateway.
- **Target Files:**
  - [bayora/infra/k8s/namespaces/apps.yaml](file:///bayora/infra/k8s/namespaces/apps.yaml)
  - `bayora/infra/k8s/namespaces/mongo.yaml`
  - `bayora/infra/k8s/namespaces/gateway.yaml`
- **Specification:**
  1. Add Kubernetes Deployment and Service for `auth-service` (namespace `auth`, port 8004).
  2. Add Deployment and Service for `audit-gateway` (namespace `audit-log`, port 8011).
  3. Add MongoDB StatefulSet or Helm reference in namespace `auth`.
  4. Add Ingress or Nginx Gateway Deployment in namespace `gateway` mapping `/api/*` and `/ws/*`.
- **Verification:** Run `kubectl apply --dry-run=client -f bayora/infra/k8s/namespaces/apps.yaml`.

### Task 3.4: Automated CI/CD Quality Gates
- **Target File:** [.github/workflows/deploy.yml](file:/// .github/workflows/deploy.yml)
- **Specification:** Add pre-deployment pull request workflow:
  1. Frontend: `npm run lint` and `npx tsc --noEmit`.
  2. Backend: `ruff check .`, `bandit -r bayora/`, and `pytest tests/integration/test_session_manager.py tests/integration/test_monitoring.py`.
  3. Security: Trivy container vulnerability scanner.
- **Verification:** Workflow triggers and passes on GitHub Actions.

---

## Phase 4: Unique Enterprise & Regulatory Differentiators (P3 — Moats)

> **Goal:** Build the killer features that transform Centinela from a scanner into an offline-verifiable, non-repudiable audit certification authority.

### Task 4.1: Signed Safety Attestation (Cosign / Sigstore)
- **Concept:** Every completed audit run produces a cryptographically signed attestation envelope that third-party compliance regulators can verify offline without access to Centinela's databases.
- **Target Files:**
  - [bayora/services/benchmark_service/main.py](file:///bayora/services/benchmark_service/main.py)
  - [bayora/services/audit_service/main.py](file:///bayora/services/audit_service/main.py)
  - [frontend/src/routes/results.tsx](file:///frontend/src/routes/results.tsx)
- **Specification:**
  1. Upon drill completion, assemble the **Attestation Manifest**:
     ```json
     {
       "attestation_version": "1.0",
       "session_id": "uuid",
       "timestamp": "ISO8601",
       "target_model": {"provider": "...", "model": "..."},
       "dataset": {"name": "advbench", "sha256": "..."},
       "audit_head_hash": "...",
       "metrics": {"total_attacks": 500, "attack_success_rate": 0.04, "resilience_score": 96.0}
     }
     ```
  2. Sign the canonical JSON string using Audit Service's Ed25519 private key or via **Sigstore / Cosign** keyless OIDC signing.
  3. Provide an offline verification CLI snippet: `centinela-verify --attestation bundle.json --pubkey cert.pub`.
  4. Hook this into the "DOWNLOAD PDF / ATTESTATION" button in [frontend/src/routes/results.tsx:267](file:///frontend/src/routes/results.tsx#L267) to generate a verifiable signed certificate.

### Task 4.2: Commit-Reveal for Red Team Non-Repudiation
- **Concept:** Prevent audit cherry-picking or post-hoc prompt manipulation by requiring Red Team to cryptographically commit to its prompt set *before* inference starts.
- **Target Files:**
  - [bayora/services/red_team/main.py](file:///bayora/services/red_team/main.py)
  - [bayora/services/session_manager/main.py](file:///bayora/services/session_manager/main.py)
- **Specification:**
  1. Prior to streaming, Red Team calculates Merkle root `R = MerkleTree(SHA256(p) for p in prompts)`.
  2. Red Team submits `R` to Session Manager via `POST /session/{id}/commit`.
  3. Session Manager writes `PROMPT_COMMITMENT` with hash `R` to `audit_entries`.
  4. Each prompt streamed includes a Merkle inclusion proof verifying it belonged to the committed set.

### Task 4.3: Canary & Honeytoken Leakage Verification
- **Concept:** Mathematically prove the *"prompt corpus leakage: mitigated"* claim.
- **Target Files:**
  - [bayora/services/red_team/main.py](file:///bayora/services/red_team/main.py)
  - [bayora/services/blue_team/main.py](file:///bayora/services/blue_team/main.py)
  - [bayora/services/benchmark_service/main.py](file:///bayora/services/benchmark_service/main.py)
- **Specification:**
  1. Red Team plants high-entropy honeytoken strings (`CANARY_<UUID>`) inside adversarial prompts.
  2. Blue Team's classification worker checks if any unreleased canary tokens ever leak into Blue logs, memory, or reports before official batch release.
  3. Output a dedicated **Canary Leakage Score: 0 Leaks Detected (100% Isolated)** on the results screen.

### Task 4.4: Regulatory Compliance Mapping (OWASP, NIST AI RMF, MITRE ATLAS)
- **Target File:** [bayora/services/benchmark_service/database.py](file:///bayora/services/benchmark_service/database.py)
- **Specification:**
  1. Map each dataset category to formal regulatory taxonomy:
     - `jailbreak` -> **OWASP LLM01: Prompt Injection** / **MITRE ATLAS AML.T0054**
     - `pii_extraction` -> **OWASP LLM06: Sensitive Information Disclosure** / **GDPR Art. 9**
     - `toxicity` -> **NIST AI RMF 1.0 (Harm to People & Rights)**
  2. Display breakdown badges in the UI Results drawer and include in the exported report.

---

## 3. The 7-Day Fast-Track Sprint Checklist

If engineering bandwidth is limited, executing these 7 high-impact tasks delivers 90% of the value:

- [ ] **Day 1: Kafka Listeners & Serialization:** Fix `KAFKA_ADVERTISED_LISTENERS` in `docker-compose.yml`; replace `ast.literal_eval` with `json.loads`.
- [ ] **Day 2: Secure Session Key:** Stop passing `session_key` in plaintext Kafka headers; fail closed if env keys are missing.
- [ ] **Day 3: Transactional Audit Ledger:** Wrap `audit_service` inserts in transactions; never advance `_head_hash` on failure; delete fake verify stub in `session_manager`.
- [ ] **Day 4: Session Auth & Frontend Compile:** Add JWT ownership check to `session_manager`; fix `audit.tsx:85` `useRef()` TypeScript error.
- [ ] **Day 5: Safety Classifier & Metric Naming:** Add refusal detection heuristics; fail closed if LoRA adapter missing; rename `bypass_rate` to `Attack Success Rate (ASR)`.
- [ ] **Day 6: Real Datasets & PAIR Scoring:** Ingest AdvBench 520; add judge scoring to PAIR.
- [ ] **Day 7: Signed Attestation Bundle:** Generate Ed25519-signed JSON attestation bundle on drill completion.
