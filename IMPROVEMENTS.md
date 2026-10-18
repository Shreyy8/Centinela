# Centinela (Bayora) — Phased Engineering Improvements & Implementation Plan

> **Document Type:** Context-Rich Engineering Implementation Plan  
> **Target:** Autonomous Coding Agents & Core Engineering Team  
> **Status:** Fully Detailed — Zero Hallucination Design Contract  
> **Repository:** [Centinela (formerly Bayora)](https://github.com/Shreyy8/Centinela.git)  

---

## 1. Executive Summary & Purpose

During comprehensive reverse engineering and empirical test execution of the Centinela codebase, a specific set of compile errors, test failures, security vulnerabilities, mock stubs, and architectural gaps were cataloged.

This document serves as the **unambiguous, context-complete implementation plan** to resolve every identified issue. Every task specifies the **exact file paths**, **symbol names**, **line numbers**, **observed defect**, **exact code modifications**, and **verification command** so that an automated coding agent or developer can execute each phase without ambiguity or hallucination.

---

## Phase 1: Operational Stability & Critical Bug Fixes (P0 — Immediate)

> **Goal:** Eliminate all compilation and test failures, fix fatal networking bugs, secure cryptographic key handling, and ensure audit integrity.

---

### Task 1.1: Fix Frontend TypeScript Compiler Error TS2554
- **Severity:** High (Breaks strict CI/CD type checks)
- **Target File:** [frontend/src/routes/audit.tsx:85](file:///frontend/src/routes/audit.tsx#L85)
- **Observed Defect:**
  ```typescript
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  ```
  Running `npx tsc --noEmit` fails: `error TS2554: Expected 1 arguments, but got 0.` In React 19 / TypeScript 5.8, `useRef` requires an explicit initial value argument when called without arguments.
- **Root Cause:** Missing `undefined` default value.
- **Exact Implementation:**
  Replace line 85 of `frontend/src/routes/audit.tsx`:
  ```typescript
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  ```
- **Verification Command:**
  ```bash
  cd frontend
  npx tsc --noEmit
  ```
  *Success Criteria:* Command exits with code 0 and zero errors.

---

### Task 1.2: Fix AttributeError in `test_llm_proxy.py`
- **Severity:** High (Causes integration test suite failure)
- **Target File:** [tests/integration/test_llm_proxy.py:66](file:///tests/integration/test_llm_proxy.py#L66)
- **Observed Defect:**
  ```python
  llm_fernet = Fernet(LLM_KEY.encode())
  ```
  Pytest fails with: `AttributeError: 'bytes' object has no attribute 'encode'. Did you mean: 'decode'?`
- **Root Cause:** In `bayora/services/llm_proxy/bus.py:13`, `LLM_KEY` is already returned as a `bytes` instance (`return key.encode()`). Calling `.encode()` on bytes raises an `AttributeError`.
- **Exact Implementation:**
  In `tests/integration/test_llm_proxy.py`, update line 66:
  ```python
  llm_fernet = Fernet(LLM_KEY if isinstance(LLM_KEY, bytes) else LLM_KEY.encode())
  ```
- **Verification Command:**
  ```bash
  python -m pytest tests/integration/test_llm_proxy.py -v
  ```
  *Success Criteria:* All 5 tests in `test_llm_proxy.py` pass cleanly.

---

### Task 1.3: Clean Up Abandoned Django Orchestrator Stub
- **Severity:** High (Corrupted syntax in Python file)
- **Target File:** [services/orchestrator/src/orchestrator/settings.py:1](file:///services/orchestrator/src/orchestrator/settings.py#L1)
- **Observed Defect:**
  ```python
  ERROR:    [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8080): [winerror 10048] only one usage of each socket address (protocol/network address/port) is normally permitted"""Django settings for the CENTINELA orchestrator service."""
  ```
- **Root Cause:** A terminal port-binding error was accidentally pasted into line 1. Furthermore, `services/orchestrator/` is an abandoned stub with no `urls.py`, `wsgi.py`, or apps.
- **Exact Implementation:**
  1. Remove the corrupted text from line 1 of `services/orchestrator/src/orchestrator/settings.py` so the file begins with the valid docstring:
     ```python
     """Django settings for the CENTINELA orchestrator service."""
     ```
  2. Add a prominent deprecation notice at the top of the file:
     ```python
     # DEPRECATED: Centinela has transitioned to polyglot FastAPI microservices in bayora/services/.
     # This Django configuration is preserved for architectural reference only.
     ```
- **Verification Command:**
  ```bash
  python -m py_compile services/orchestrator/src/orchestrator/settings.py
  ```
  *Success Criteria:* Compilation succeeds with zero syntax errors.

---

### Task 1.4: Update Makefile Test Paths
- **Severity:** Medium (Automated `make test` fails)
- **Target File:** [Makefile:33-36](file:///Makefile#L33-L36)
- **Observed Defect:**
  `make test` invokes obsolete paths from before the repository reorganization:
  ```makefile
  PYTHONPATH=. pytest bayora/services/session_manager/test_session_manager.py \
             bayora/services/llm_proxy/test_llm_proxy.py \
             bayora/ml/evaluation/test_pipelines.py \
             bayora/monitoring/test_monitoring.py
  ```
- **Exact Implementation:**
  Update the `test` target in `Makefile` to:
  ```makefile
  test:
  	@echo "Running All Centinela Integration Tests..."
  	PYTHONPATH=. pytest tests/integration/test_session_manager.py \
  	           tests/integration/test_llm_proxy.py \
  	           tests/integration/test_pipelines.py \
  	           tests/integration/test_monitoring.py -v
  ```
- **Verification Command:**
  Execute tests via pytest using the updated paths.

---

### Task 1.5: Fix Kafka Networking & Advertised Listeners in Docker Compose
- **Severity:** High (Breaks inter-container communication in Docker)
- **Target File:** [docker-compose.yml:17](file:///docker-compose.yml#L17)
- **Observed Defect:**
  ```yaml
  KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
  ```
  When services connect to `kafka:9092`, the broker returns metadata pointing them to `localhost:9092`, which resolves to the calling container itself rather than the broker.
- **Exact Implementation:**
  Configure dual listeners in `docker-compose.yml` under service `kafka`:
  ```yaml
  environment:
    KAFKA_BROKER_ID: 1
    KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    KAFKA_LISTENERS: INTERNAL://0.0.0.0:9092,EXTERNAL://0.0.0.0:9094
    KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,EXTERNAL://localhost:9094
    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT
    KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
  ```
  Update port mapping:
  ```yaml
  ports:
    - "9094:9094"
  ```
- **Verification Command:**
  Verify with Docker compose that containers resolve `kafka:9092` internally and host tools connect on `localhost:9094`.

---

### Task 1.6: Eliminate Plaintext Session Key Transmission in Kafka Header
- **Severity:** Critical (Cryptographic key exposure)
- **Target Files:**
  - [bayora/services/session_manager/bus.py:52-56](file:///bayora/services/session_manager/bus.py#L52-L56)
  - [bayora/services/llm_proxy/main.py:30-43](file:///bayora/services/llm_proxy/main.py#L30-L43)
- **Observed Defect:**
  `session_manager/bus.py` puts `("session_key", session_key_str.encode())` directly into Kafka message headers on `llm.requests`.
- **Exact Implementation:**
  1. In `session_manager/bus.py`, remove `session_key` from headers:
     ```python
     headers = [("session_id", session_id.encode())]
     ```
  2. Implement an authenticated in-memory key retrieval or asymmetric envelope exchange:
     - In `session_manager/main.py`, expose an internal mTLS endpoint `GET /internal/session/{session_id}/key` accessible only by `llm-proxy`.
     - Alternatively, encrypt the ephemeral `SESSION_KEY` inside the payload using `LLM_KEY`:
       ```python
       envelope = {
           "payload": plaintext.decode('utf-8', errors='replace'),
           "session_key": session_key_str
       }
       llm_encrypted = self.llm_fernet.encrypt(json.dumps(envelope).encode())
       ```
     - In `llm_proxy/bus.py`, decrypt the envelope with `LLM_KEY` and extract `session_key`.
- **Verification Command:**
  Run `pytest tests/integration/test_session_manager.py` and inspect Kafka message headers to confirm `session_key` is completely absent.

---

### Task 1.7: Ensure Atomic Audit Chain Updates
- **Severity:** High (Ledger corruption on database failure)
- **Target File:** [bayora/services/audit_service/main.py:83-97](file:///bayora/services/audit_service/main.py#L83-L97)
- **Observed Defect:**
  `self._head_hash = entry_hash` runs unconditionally outside the `try/except` block, advancing the in-memory head hash even if the PostgreSQL `INSERT` fails.
- **Exact Implementation:**
  In `bayora/services/audit_service/main.py`, wrap database operations in an atomic transaction:
  ```python
  if self.conn:
      try:
          with self.conn.cursor() as cur:
              cur.execute("""
                  INSERT INTO audit_entries 
                  (event_type, source_namespace, session_id, payload_hash, timestamp_ns, prev_hash, entry_hash)
                  VALUES (%(event_type)s, %(source_namespace)s, %(session_id)s, %(payload_hash)s, %(timestamp_ns)s, %(prev_hash)s, %(entry_hash)s)
              """, entry)
          self._head_hash = entry_hash
      except Exception as e:
          print(f"❌ Failed to persist audit log entry: {e}")
          raise
  else:
      self.chain.append(entry)
      self._head_hash = entry_hash
  ```
- **Verification Command:**
  Run a test simulating a disconnected database; verify that `_head_hash` does not advance when inserts fail.

---

### Task 1.8: Replace `ast.literal_eval` with Standard JSON Serialization
- **Severity:** Medium (Fragile deserialization prone to crashing on quotes/newlines)
- **Target Files:**
  - [bayora/services/session_manager/bus.py:101](file:///bayora/services/session_manager/bus.py#L101)
  - [bayora/services/blue_team/main.py:43](file:///bayora/services/blue_team/main.py#L43)
  - [bayora/services/blue_team/main.py:114](file:///bayora/services/blue_team/main.py#L114)
- **Observed Defect:**
  `bus.py` uses `str(batch_plaintext).encode('utf-8')` and `blue_team` uses `ast.literal_eval(decrypted_bytes.decode('utf-8'))`.
- **Exact Implementation:**
  1. In `bayora/services/session_manager/bus.py:101`:
     ```python
     bundle_bytes = json.dumps(batch_plaintext).encode('utf-8')
     ```
  2. In `bayora/services/blue_team/main.py:43` and line 114:
     ```python
     try:
         responses = json.loads(decrypted_bytes.decode('utf-8'))
     except json.JSONDecodeError:
         # Fallback to ast.literal_eval for backward compatibility with existing queues
         responses = ast.literal_eval(decrypted_bytes.decode('utf-8'))
     ```
- **Verification Command:**
  ```bash
  python -m pytest tests/integration/test_pipelines.py -v
  ```

---

## Phase 2: Scientific ML & Dataset Expansion (P1)

> **Goal:** Replace mock datasets with real adversarial benchmarks, implement genuine GCG optimization, and improve toxicity classification accuracy.

---

### Task 2.1: Ingest Complete AdvBench & JailbreakBench Corpuses
- **Target File:** [bayora/datasets/loaders/common.py](file:///bayora/datasets/loaders/common.py)
- **Current Defect:** Only 3 hardcoded prompts are available.
- **Specification:**
  1. Download or bundle the full AdvBench 520 harmful behaviors list from `llm-attacks` and the 100 JailbreakBench behaviors into `bayora/datasets/raw/advbench_520.json` and `bayora/datasets/raw/jailbreakbench_100.json`.
  2. Implement file-backed loading with fallback caching in `DatasetLoader`:
     ```python
     def load_advbench(self):
         path = os.path.join(self.data_dir, "advbench_520.json")
         if os.path.exists(path):
             with open(path, 'r', encoding='utf-8') as f:
                 return json.load(f)
         # Fallback to embedded seed list
     ```
  3. Ensure `load_combined()` returns the full normalized union (620+ prompt behaviors).
- **Verification:** Assert `len(loader.load_dataset("combined")) >= 600`.

---

### Task 2.2: Hardened PAIR Strategy with Scoring Judge
- **Target File:** [bayora/ml/attack_generators/engine.py:33-79](file:///bayora/ml/attack_generators/engine.py#L33-L79)
- **Current Defect:** PAIR iteratively prompts an attacker model but lacks a dedicated Judge LLM to evaluate whether the surrogate target actually refused or complied.
- **Specification:**
  1. Add a `JudgeModel` stage in `PAIRStrategy.amutate` scoring the target response on a 1–10 scale.
  2. If the response score is $\ge 7$ (successful jailbreak), terminate the refinement loop early and return the successful adversarial prompt.
  3. Add structured retry logic with exponential backoff on LiteLLM rate limit exceptions (`litellm.RateLimitError`).
- **Verification:** Unit test mocking surrogate and judge responses, verifying loop termination upon jailbreak detection.

---

### Task 2.3: Refusal Heuristics & Fail-Closed Classification
- **Target File:** [bayora/ml/classifiers/defense.py](file:///bayora/ml/classifiers/defense.py)
- **Specification:**
  1. Add standard refusal prefix detection before running neural inference:
     ```python
     REFUSAL_PREFIXES = [
         "I cannot fulfill this request",
         "I am unable to provide",
         "As an AI, I cannot",
         "I apologize, but I cannot"
     ]
     ```
     If response starts with any refusal prefix, classify as `is_harmful = False` with confidence `0.99`.
  2. If model weights are missing or torch encounters CUDA OOM, enforce a **fail-closed** policy (`is_harmful = True`) rather than crashing the batch evaluator.
- **Verification:** Unit tests verifying refusal strings are classified as safe and corrupted inputs fail closed.

---

### Task 2.4: Standardize Metric Naming (ASR & Resilience Score)
- **Target Files:**
  - `bayora/services/benchmark_service/database.py`
  - `bayora/services/blue_team/main.py`
  - `frontend/src/routes/results.tsx`
  - `frontend/src/routes/audit.tsx`
- **Specification:**
  Industry standard terminology for adversarial evaluation is **Attack Success Rate (ASR)** and **Resilience Score** ($1.0 - \text{ASR}$).
  1. Ensure both `bypass_rate` and `attack_success_rate` are returned in API JSON responses for backward compatibility.
  2. Add `resilience_score = round(100.0 * (1.0 - asr), 1)` to summary metrics.
- **Verification:** Verify `/drills/{session_id}/status` returns both fields.

---

## Phase 3: Frontend Completion & Gateway Integration (P2)

> **Goal:** Route all frontend requests through the Nginx reverse proxy, complete unfinished UI features (PDF export, profile persistence), and restore authentication flows.

---

### Task 3.1: Route Frontend Through Unified Nginx Gateway
- **Target File:** [frontend/src/lib/api.ts:1-4](file:///frontend/src/lib/api.ts#L1-L4)
- **Current Defect:** Frontend hardcodes ports `8004`, `8006`, `8000`, `8011` directly, bypassing Nginx on `8010`.
- **Specification:**
  1. Support an environment variable `VITE_API_GATEWAY_URL` defaulting to `http://localhost:8010`:
     ```typescript
     const GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8010";
     export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8010";
     ```
  2. Map all endpoints to the gateway routes:
     - Auth & Config: `${GATEWAY_URL}/api/auth` and `${GATEWAY_URL}/api/config`
     - Drills & Benchmark: `${GATEWAY_URL}/api/drills`
     - Session: `${GATEWAY_URL}/api/session`
     - WebSocket: `${WS_URL}/ws/${sessionId}`
  3. Ensure `infra/nginx/centinela-gateway.conf` contains matching rewrite rules for all endpoints.
- **Verification:** Run Nginx via Docker compose and verify the frontend functions through port 8010.

---

### Task 3.2: Implement Client-Side PDF Audit Certificate Export
- **Target File:** [frontend/src/routes/results.tsx:268-272](file:///frontend/src/routes/results.tsx#L268-L272)
- **Current Defect:** "DOWNLOAD PDF" button has no `onClick` handler.
- **Specification:**
  1. Implement a PDF generation utility in `frontend/src/lib/pdf.ts` using `jspdf` or HTML-to-canvas rendering.
  2. Certificate must render:
     - Document Title: *"CENTINELA ADVERSARIAL AI SAFETY AUDIT CERTIFICATE"*
     - Session ID & Timestamp
     - Auditee Organization & Auditor Name
     - Target Model & Domain
     - Resilience Score (e.g. 84%) & Attack Success Rate (16%)
     - Compliance Badges: HIPAA (Verified), GDPR (Verified), EU AI Act (Compliant)
     - Merkle Ledger Head Hash verification watermark.
  3. Wire the button's `onClick` to trigger the download:
     ```tsx
     <button onClick={() => downloadCertificate(run, session_id)} className="...">
     ```
- **Verification:** Click "DOWNLOAD PDF" on `/results` and confirm PDF downloads with correct metadata.

---

### Task 3.3: User Profile Persistence API
- **Target Files:**
  - [bayora/services/auth_service/main.py](file:///bayora/services/auth_service/main.py)
  - [frontend/src/routes/profile.tsx](file:///frontend/src/routes/profile.tsx)
- **Current Defect:** `/profile` updates only local React state.
- **Specification:**
  1. Add `GET /auth/profile` and `PUT /auth/profile` in `auth_service/main.py` persisting `fullName`, `organization`, `role`, and `bio` to MongoDB `users` collection.
  2. In `frontend/src/routes/profile.tsx`, fetch profile via `useQuery` and mutate via `useMutation` calling `api.put("/auth/profile", draft)`.
- **Verification:** Edit profile in UI, refresh page, and verify values persist from MongoDB.

---

### Task 3.4: Re-Enable Production Authentication Controls
- **Target Files:**
  - [frontend/src/lib/api.ts:15-22](file:///frontend/src/lib/api.ts#L15-L22)
  - [frontend/src/routes/audit.tsx:91-96](file:///frontend/src/routes/audit.tsx#L91-L96)
- **Specification:**
  1. Re-enable the 401 response interceptor in `api.ts` redirecting unauthenticated users to `/login`.
  2. Implement an `isDemoMode` toggle so that local demo recording (`demo_server.py`) can bypass auth while production builds strictly enforce JWT validation.
- **Verification:** Access `/audit` without a token in production mode and verify redirect to `/login`.

---

## Phase 4: Infrastructure & Cloud Hardening (P3)

> **Goal:** Optimize Docker image sizes, synchronize Kubernetes manifests with Docker Compose, and establish automated CI quality gates.

---

### Task 4.1: Multi-Stage Docker Packaging (Slim Images)
- **Target File:** [Dockerfile](file:///Dockerfile)
- **Current Defect:** Unconditionally installs PyTorch, Transformers, vLLM, and PEFT for all 8 microservices, creating 6GB+ containers for lightweight services like `auth-service` and `audit-service`.
- **Specification:**
  1. Split into two build targets:
     - `base-service`: Python 3.11-slim installing only `requirements.txt` (~250MB). Used for `session-manager`, `audit-service`, `benchmark-service`, `auth-service`, and `audit-gateway`.
     - `ml-service`: Installs `requirements-llm.txt` with PyTorch and Transformers (~3.5GB). Used for `llm-proxy`, `blue-team`, and `red-team`.
  2. Update `docker-compose.yml` to specify the respective build targets.
- **Verification:** Run `docker compose build` and verify non-ML container sizes are reduced by $>80\%$.

---

### Task 4.2: Synchronize Kubernetes Manifests
- **Target File:** [bayora/infra/k8s/namespaces/apps.yaml](file:///bayora/infra/k8s/namespaces/apps.yaml)
- **Current Defect:** `apps.yaml` only declares 6 services, missing `auth-service`, `audit-gateway`, and `mongodb`.
- **Specification:**
  1. Add Kubernetes Deployment and Service definitions for:
     - `auth-service`: Port 8004 in namespace `apps`
     - `audit-gateway`: Port 8011 in namespace `apps` (configured for WebSocket ingress)
     - `mongodb`: StatefulSet or Deployment with PersistentVolumeClaim in namespace `data`
  2. Update Istio AuthorizationPolicies in `bayora/infra/k8s/istio/authorization-policies.yaml` to include routes for the new services.
- **Verification:** Run `kubectl apply --dry-run=client -f bayora/infra/k8s/namespaces/apps.yaml` with zero validation errors.

---

### Task 4.3: Automated GitHub Actions CI Pipeline
- **Target File:** `.github/workflows/ci.yml`
- **Specification:**
  Create automated CI pipeline executing on every push and PR:
  1. **Frontend Job:** `npm install`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
  2. **Backend Job:** Setup Python 3.11, install `requirements.txt` and `requirements-llm.txt`, run `pytest tests/integration/ -v`.
  3. **Security Audit Job:** Trivy vulnerability scan on Docker images.
- **Verification:** Push commit to GitHub and verify CI pipeline executes and passes all checks.

---

## Plan Execution Checklist

| Phase | Task ID | Summary | Target Module | Status |
|---|---|---|---|---|
| **Phase 1** | Task 1.1 | Fix `useRef` TS2554 error | `frontend/src/routes/audit.tsx:85` | Ready |
| **Phase 1** | Task 1.2 | Fix `LLM_KEY.encode()` AttributeError | `tests/integration/test_llm_proxy.py:66` | Ready |
| **Phase 1** | Task 1.3 | Fix corrupted docstring in Django settings | `services/orchestrator/.../settings.py:1` | Ready |
| **Phase 1** | Task 1.4 | Update test paths in Makefile | `Makefile:33-36` | Ready |
| **Phase 1** | Task 1.5 | Fix Kafka advertised listeners in Compose | `docker-compose.yml:17` | Ready |
| **Phase 1** | Task 1.6 | Remove plaintext session key in Kafka header | `bayora/services/session_manager/bus.py:54` | Ready |
| **Phase 1** | Task 1.7 | Enforce atomic audit chain updates | `bayora/services/audit_service/main.py:96` | Ready |
| **Phase 1** | Task 1.8 | Replace `ast.literal_eval` with JSON | `session_manager/bus.py` & `blue_team/main.py`| Ready |
| **Phase 2** | Task 2.1 | Ingest full AdvBench 520 & JailbreakBench | `bayora/datasets/loaders/common.py` | Ready |
| **Phase 2** | Task 2.2 | Harden PAIR strategy with Scoring Judge | `bayora/ml/attack_generators/engine.py` | Ready |
| **Phase 2** | Task 2.3 | Add refusal heuristics & fail-closed defense| `bayora/ml/classifiers/defense.py` | Ready |
| **Phase 2** | Task 2.4 | Standardize Attack Success Rate (ASR) metric| Multiple backend & frontend files | Ready |
| **Phase 3** | Task 3.1 | Route frontend through Nginx Gateway (:8010)| `frontend/src/lib/api.ts` | Ready |
| **Phase 3** | Task 3.2 | Implement client-side PDF certificate export| `frontend/src/routes/results.tsx` | Ready |
| **Phase 3** | Task 3.3 | Implement profile persistence API | `auth_service/main.py` & `profile.tsx` | Ready |
| **Phase 3** | Task 3.4 | Re-enable production auth controls & redirects| `frontend/src/lib/api.ts` & `audit.tsx` | Ready |
| **Phase 4** | Task 4.1 | Multi-stage Docker packaging (slim images) | `Dockerfile` & `docker-compose.yml` | Ready |
| **Phase 4** | Task 4.2 | Synchronize Kubernetes deployment manifests | `bayora/infra/k8s/namespaces/apps.yaml` | Ready |
| **Phase 4** | Task 4.3 | Automated GitHub Actions CI pipeline | `.github/workflows/ci.yml` | Ready |
