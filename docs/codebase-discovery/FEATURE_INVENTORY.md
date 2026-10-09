# Centinela (Bayora) — Feature Inventory & Implementation Matrix

> **Component:** Granular Feature-by-Feature Technical Breakdown  
> **Repository:** [Centinela](https://github.com/Shreyy8/Centinela.git)  

---

## 1. Feature Status Classification Taxonomy

Each discovered feature is classified into one of the following evidence-based categories:
- **`[VERIFIED]`**: Fully implemented end-to-end and verified by source inspection and passing test suites.
- **`[IMPLEMENTED]`**: Fully implemented in code, but end-to-end verification depends on external hardware or remote cloud services (e.g. Hugging Face downloads, AWS EKS, Gemini API key).
- **`[PARTIAL]`**: Partially implemented; important functional pieces are stubbed, missing, or disconnected.
- **`[MOCKED]`**: Functional in code, but relying on hardcoded arrays, mock classes, or simulated responses rather than real production engines.
- **`[UI ONLY]`**: Visual interface exists in frontend routes, but has no corresponding backend hook or mutates only ephemeral local component state.
- **`[BACKEND ONLY]`**: Backend service and endpoints are implemented, but there is no entry point exposed in the frontend web application.
- **`[BROKEN / DEFECT]`**: Contains syntax or type errors that prevent clean compilation or standard command execution.

---

## 2. Feature Inventory Matrix

| # | Feature Name | Category | Status | Primary Entry Point | Backend Handler / Module | Persistence |
|---|---|---|---|---|---|---|
| **1** | User Registration & Auth | Authentication | `[VERIFIED]` | UI `/register`, `POST /auth/signup` | [bayora/services/auth_service/main.py:80](file:///bayora/services/auth_service/main.py#L80) | MongoDB `users` |
| **2** | User Login & JWT Issuance | Authentication | `[VERIFIED]` | UI `/login`, `POST /auth/login` | [bayora/services/auth_service/main.py:93](file:///bayora/services/auth_service/main.py#L93) | MongoDB `users` |
| **3** | User Profile Management | User Profile | `[UI ONLY]` | UI `/profile` | None (Local component state only) | None (Hardcoded "Sarah Chen") |
| **4** | Audit Configuration & Targets | Audit Setup | `[VERIFIED]` | UI `/config`, `PUT /config/settings` | [bayora/services/auth_service/main.py:136](file:///bayora/services/auth_service/main.py#L136) | MongoDB `configs` |
| **5** | Provider API Key Storage | Security | `[VERIFIED]` | UI `/config`, `POST /config/api-key` | [bayora/services/auth_service/main.py:110](file:///bayora/services/auth_service/main.py#L110) | MongoDB `configs` (Fernet) |
| **6** | Dynamic Session Lifecycle | Orchestration | `[VERIFIED]` | `POST /session/start`, `POST /session/end` | [bayora/services/session_manager/main.py:113](file:///bayora/services/session_manager/main.py#L113) | In-Memory Fernet Dictionaries |
| **7** | Adversarial Drill Execution | Core Pipeline | `[IMPLEMENTED]` | UI `/config` ("Start Audit"), `POST /drills/run` | [bayora/services/benchmark_service/main.py:145](file:///bayora/services/benchmark_service/main.py#L145) | Postgres `benchmark_runs` |
| **8** | Adversarial Prompt Generation | Red Team ML | `[MOCKED]` | `POST /attack/stream`, `POST /attack/generate` | [bayora/services/red_team/main.py:118](file:///bayora/services/red_team/main.py#L118) | None (Kafka `red.prompts`) |
| **9** | Sandboxed Model Inference | Target Execution | `[IMPLEMENTED]` | Kafka `llm.requests`, `POST /llm/infer` | [bayora/services/llm_proxy/inference.py:99](file:///bayora/services/llm_proxy/inference.py#L99) | None (Kafka `llm.responses`) |
| **10** | Output Echo & Semantic Filtering | Defense / DLP | `[VERIFIED]` | LLM Proxy `_apply_sandbox_filters` | [bayora/services/llm_proxy/inference.py:156](file:///bayora/services/llm_proxy/inference.py#L156) | In-Memory |
| **11** | Explicit VRAM Teardown | Security / Anti-Leak | `[VERIFIED]` | `POST /llm/session/end`, `end_session()` | [bayora/services/llm_proxy/inference.py:191](file:///bayora/services/llm_proxy/inference.py#L191) | CUDA Garbage Collection |
| **12** | Micro-Batched Response Delivery | Mediated Bus | `[VERIFIED]` | Session Manager `IsolatedMessageBus` | [bayora/services/session_manager/bus.py:89](file:///bayora/services/session_manager/bus.py#L89) | In-Memory Unreleased Buffer |
| **13** | LoRA Response Classification | Blue Team ML | `[IMPLEMENTED]` | Kafka `blue.evaluation`, `POST /evaluate/batch` | [bayora/services/blue_team/main.py:27](file:///bayora/services/blue_team/main.py#L27) | Kafka `classifications` |
| **14** | Live Telemetry Streaming | Telemetry / UX | `[PARTIAL]` | UI `/audit`, WebSocket `ws://:8011/ws/{id}` | [bayora/services/audit_gateway/main.py:94](file:///bayora/services/audit_gateway/main.py#L94) | Ephemeral WebSockets |
| **15** | Safety Certification & Metrics | Reporting | `[PARTIAL]` | UI `/results`, `GET /drills/{id}/status` | [bayora/services/benchmark_service/main.py:193](file:///bayora/services/benchmark_service/main.py#L193) | Postgres `benchmark_runs` |
| **16** | Tamper-Evident Audit Ledger | Forensics / Compliance | `[VERIFIED]` | `GET /verify`, Kafka `audit.events` | [bayora/services/audit_service/main.py:65](file:///bayora/services/audit_service/main.py#L65) | Postgres `audit_entries` |
| **17** | Falco Breach Termination | Infrastructure Defense | `[VERIFIED]` | `ViolationHandler.handle_violation` | [bayora/services/session_manager/violations.py:10](file:///bayora/services/session_manager/violations.py#L10) | In-Memory Session Cleanup |
| **18** | Benchmark Leaderboard & Datasets | Benchmarking | `[BACKEND ONLY]`| `GET /leaderboard`, `GET /datasets` | [bayora/services/benchmark_service/main.py:234](file:///bayora/services/benchmark_service/main.py#L234) | Postgres `benchmark_runs` |

---

## 3. Deep-Dive Feature Breakdown

### Feature 1: User Registration & Authentication
- **Purpose & User Value:** Provides self-service credential creation and password-authenticated session initiation.
- **Entry Points:** 
  - Frontend: [frontend/src/routes/register.tsx](file:///frontend/src/routes/register.tsx)
  - REST: `POST /auth/signup`
- **Backend Components:** [bayora/services/auth_service/main.py:80-91](file:///bayora/services/auth_service/main.py#L80-L91)
- **Data Persistence:** MongoDB `bayora_auth.users`.
- **Validation:** Pydantic `UserSignup` validates email format via `EmailStr`. Passwords hashed with `pwd_context.hash(user.password[:72])` (bcrypt).
- **Success Behavior:** Returns `{"message": "User created successfully"}` with HTTP 200.
- **Failure Behavior:** Returns HTTP 400 `{"detail": "User already exists"}` if email already registered.
- **Status:** **`[VERIFIED]`** (Full code inspection confirms end-to-end operation).

---

### Feature 2: User Login & JWT Access Token Issuance
- **Purpose & User Value:** Issues 60-minute HS256-signed JSON Web Tokens to authenticate subsequent API calls.
- **Entry Points:** 
  - Frontend: [frontend/src/routes/login.tsx](file:///frontend/src/routes/login.tsx)
  - REST: `POST /auth/login`
- **Backend Components:** [bayora/services/auth_service/main.py:93-103](file:///bayora/services/auth_service/main.py#L93-L103)
- **Data Persistence:** Reads from MongoDB `bayora_auth.users`.
- **Validation:** Bcrypt password verification. JWT generated with `{"sub": user_email, "exp": now + 60m}`.
- **Client Side Handling:** Stores `token` and `user_email` in `localStorage`.
- **Status:** **`[VERIFIED]`**.

---

### Feature 3: User Profile Management
- **Purpose & User Value:** Intended to allow CISOs and auditors to view and update their organization, title, and contact details.
- **Entry Points:** Frontend route [frontend/src/routes/profile.tsx](file:///frontend/src/routes/profile.tsx).
- **Observed Implementation:** 
  - Lines 23-29 define a hardcoded mock object `INITIAL`:
    ```typescript
    const INITIAL: Profile = {
      fullName: "Sarah Chen",
      organization: "Northwind Health",
      role: "CISO",
      email: "sarah.chen@northwind.health",
      bio: "",
    };
    ```
  - Submitting the edit form (`onSubmit`, line 90) updates only React `useState`:
    `setProfile(draft); setEditing(false);`
  - No HTTP request is dispatched. There is no `/api/profile` or `/auth/profile` backend endpoint.
- **Status:** **`[UI ONLY]`** (Pure client-side mock; completely disconnected from backend).

---

### Feature 4: Audit Configuration & Targets
- **Purpose & User Value:** Lets auditors select target model providers (`OPENAI`, `ANTHROPIC`, `OLLAMA`, `CUSTOM`), models, domains (`Healthcare`, `Finance`, `Legal`, `General`), severities, and token budgets.
- **Entry Points:** 
  - Frontend: [frontend/src/routes/config.tsx](file:///frontend/src/routes/config.tsx)
  - REST: `PUT /config/settings`, `GET /config/settings`
- **Backend Components:** [bayora/services/auth_service/main.py:136-159](file:///bayora/services/auth_service/main.py#L136-L159)
- **Data Persistence:** MongoDB `bayora_auth.configs`.
- **Status:** **`[VERIFIED]`**.

---

### Feature 5: Provider API Key Storage
- **Purpose & User Value:** Stores third-party LLM provider API credentials securely for inference queries.
- **Entry Points:** 
  - Frontend: [frontend/src/routes/config.tsx:65-67](file:///frontend/src/routes/config.tsx#L65-L67)
  - REST: `POST /config/api-key`, `GET /config/api-key`, `DELETE /config/api-key`
- **Backend Components:** [bayora/services/auth_service/main.py:110-134](file:///bayora/services/auth_service/main.py#L110-L134)
- **Encryption:** Symmetrically encrypted with Fernet key before writing to MongoDB.
- **Status:** **`[VERIFIED]`**.

---

### Feature 6: Dynamic Session Lifecycle & Cryptographic Key Brokerage
- **Purpose & User Value:** Generates a mathematically unique 32-byte URL-safe base64 Fernet key per session; coordinates encryption boundaries.
- **Entry Points:** 
  - REST: `POST /session/start`, `POST /session/end`, `GET /session/{id}/status`
- **Backend Components:** [bayora/services/session_manager/main.py](file:///bayora/services/session_manager/main.py)
- **Data Persistence:** Ephemeral in-memory dictionaries `message_bus.session_keys` and `session_raw_keys`.
- **Audit Side Effects:** Emits `SESSION_START` and `SESSION_END` events to Kafka `audit.events`.
- **Status:** **`[VERIFIED]`** (Validated via [tests/integration/test_session_manager.py](file:///tests/integration/test_session_manager.py)).

---

### Feature 7: Adversarial Drill Execution Orchestration
- **Purpose & User Value:** End-to-end execution of a safety audit drill across multiple microservices.
- **Entry Points:** 
  - Frontend: "Start Audit" button in [frontend/src/routes/config.tsx:111](file:///frontend/src/routes/config.tsx#L111)
  - REST: `POST /drills/run`
- **Backend Components:** [bayora/services/benchmark_service/main.py:145-190](file:///bayora/services/benchmark_service/main.py#L145-L190)
- **Execution Flow:**
  1. Maps `domain` to dataset (`Healthcare` -> `advbench`, etc.).
  2. Calls `http://session-manager:8000/session/start` to obtain `session_id`.
  3. Inserts row into PostgreSQL `benchmark_runs` with status `running`.
  4. Calls `http://red-team:8003/attack/stream` to launch background worker.
  5. Spawns `monitor_session` async polling task to emit progress to Kafka `session.progress`.
- **Status:** **`[IMPLEMENTED]`**.

---

### Feature 8: Adversarial Prompt Generation (Red Team)
- **Purpose & User Value:** Synthesizes attack vectors across multiple evasion strategies.
- **Entry Points:** `POST /attack/stream`, `POST /attack/generate`
- **Strategies Implemented:**
  - `DirectAttack`: Base prompts without mutation.
  - `JailbreakMutation`: Prepends DAN templates ("Imagine you are...", "DAN: Do Anything Now...").
  - `RoleplayObfuscation`: Wraps prompt in fictional screenplay dialogue.
  - `PAIRStrategy`: Multi-turn Prompt Automatic Iterative Refinement via LiteLLM calling attacker & surrogate models.
  - `GCGStrategy`: Appends pre-calculated adversarial token suffixes.
- **Mocked Dependency Finding:** [bayora/datasets/loaders/common.py:29-42](file:///bayora/datasets/loaders/common.py#L29-L42) uses hardcoded mock lists:
  - `load_advbench()` returns only 2 sample prompts.
  - `load_jailbreakbench()` returns only 1 sample prompt.
- **Status:** **`[MOCKED]`** (Engine algorithms are fully implemented, but underlying dataset corpus is hardcoded to 3 mock items).

---

### Feature 9: Sandboxed Model Inference (LLM Proxy)
- **Purpose & User Value:** Executes target model completions inside an isolated runtime.
- **Entry Points:** Kafka consumer on topic `llm.requests`; HTTP fallback `POST /llm/infer`.
- **Supported Backends:**
  - Mock mode (`MOCK_LLM=1`): Returns synthetic response string.
  - Ollama (`OLLAMA_HOST`): Connects to local Ollama on port 11434 (`llama3`).
  - Google Gemini (`GOOGLE_API_KEY`): Connects to `google.generativeai`.
  - vLLM (`vllm.LLM`): Local tensor-parallel GPU execution with greedy sampling.
  - Hugging Face Transformers: Causal LM generation with `use_cache=False`.
- **Status:** **`[IMPLEMENTED]`**.

---

### Feature 10: Output Echo & Semantic Filtering
- **Purpose & User Value:** Prevents prompt echo side-channels and system prompt reproduction leaks.
- **Entry Points:** Executed within [bayora/services/llm_proxy/inference.py:156-189](file:///bayora/services/llm_proxy/inference.py#L156-L189).
- **Mechanisms:**
  - String replacement: Detects full prompt in output and replaces with `[ECHO_FILTERED]`.
  - System marker truncation: Strips text following `[INST]`, `<<SYS>>`, `System:`, `User:`.
  - Semantic Cosine Similarity: Uses `SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')` to compute cosine similarity between prompt and output. If `similarity > 0.75`, blocks response with `[SEMANTIC_ECHO_FILTERED]`.
- **Status:** **`[VERIFIED]`** (Tested in [tests/integration/test_llm_proxy.py:22-48](file:///tests/integration/test_llm_proxy.py#L22-L48)).

---

### Feature 11: Explicit VRAM Teardown & KV-Cache Purging
- **Purpose & User Value:** Prevents cross-session memory contamination (Threat Model FR-3).
- **Entry Points:** `POST /llm/session/end`, `inference_engine.end_session()`.
- **Execution:** Calls `destroy_model_parallel()`, deletes PyTorch model and tokenizer, triggers `torch.cuda.empty_cache()`, `torch.cuda.ipc_collect()`, and Python `gc.collect()`.
- **Status:** **`[VERIFIED]`** (Tested in [tests/integration/test_llm_proxy.py:49-55](file:///tests/integration/test_llm_proxy.py#L49-L55)).

---

### Feature 12: Micro-Batched Response Delivery
- **Purpose & User Value:** Buffers model responses inside Session Manager and releases them in bundles of 5 re-encrypted with `BLUE_KEY`.
- **Entry Points:** `IsolatedMessageBus.handle_llm_response(session_id, encrypted_response)`.
- **Behavior:** Ensures Blue Team never observes real-time per-token timing side-channels.
- **Status:** **`[VERIFIED]`** (Tested in [tests/integration/test_session_manager.py:64-91](file:///tests/integration/test_session_manager.py#L64-L91)).

---

### Feature 13: LoRA Response Classification (Blue Team)
- **Purpose & User Value:** Evaluates LLM responses for toxicity, violence, and harmful compliance using a fine-tuned sequence classifier.
- **Entry Points:** Kafka consumer on topic `blue.evaluation`; HTTP `POST /evaluate/batch`.
- **Model:** `unitary/toxic-bert` fine-tuned with LoRA adapters (`r=8, alpha=32`) located in `blue_agent_lora/`.
- **Output:** Computes `is_harmful`, `confidence`, `total_pairs`, `harmful_detected`, and `bypass_rate`.
- **Status:** **`[IMPLEMENTED]`** (Adapters present in repo; synchronous download on import requires offline caching).

---

### Feature 14: Live Telemetry Streaming
- **Purpose & User Value:** Real-time visual attack feed, risk score dials, and passing/failing counters.
- **Entry Points:**
  - Frontend: [frontend/src/routes/audit.tsx](file:///frontend/src/routes/audit.tsx)
  - WebSocket: `ws://localhost:8011/ws/{session_id}?token={token}`
- **Observed Gaps:**
  - TypeScript Compiler Error: [frontend/src/routes/audit.tsx:85](file:///frontend/src/routes/audit.tsx#L85) causes build failure (`Expected 1 arguments, but got 0`).
  - Feed entries display only category and payload preview; detailed radar visualizations use simulated random distributions.
- **Status:** **`[PARTIAL]`** (WebSocket connection works, but TypeScript build error present and radar charts use synthetic data).

---

### Feature 15: Safety Certification & Results Dashboard
- **Purpose & User Value:** Displays final safety score, harmful detected count, bypass rate, and audit seal.
- **Entry Points:** Frontend route [frontend/src/routes/results.tsx](file:///frontend/src/routes/results.tsx).
- **Observed Gaps:**
  - "DOWNLOAD PDF" button at line 267 has no `onClick` handler and no PDF generation library is imported.
  - "View History Deltas" drawer displays raw JSON dump of the run.
- **Status:** **`[PARTIAL]`** (Visual seal and stats render from PostgreSQL, but PDF export is unimplemented).

---

### Feature 16: Tamper-Evident Forensic Audit Ledger
- **Purpose & User Value:** Provides mathematically verifiable audit trail for compliance regulators.
- **Entry Points:** `GET /verify`, Kafka topic `audit.events`.
- **Backend Components:** [bayora/services/audit_service/main.py](file:///bayora/services/audit_service/main.py)
- **Storage:** PostgreSQL `audit_entries`.
- **Verification:** Recomputes SHA-256 hash chain from genesis block to current head.
- **Status:** **`[VERIFIED]`**.

---

### Feature 17: Falco Breach Termination
- **Purpose & User Value:** Terminates active audit session immediately if an isolation breach occurs.
- **Entry Points:** `ViolationHandler.handle_violation(violation_event)` in [bayora/services/session_manager/violations.py](file:///bayora/services/session_manager/violations.py).
- **Triggers:** Falco rules detecting cross-namespace DNS probes, blocked syscalls (`ptrace`), or container escapes.
- **Status:** **`[VERIFIED]`** (Tested in [tests/integration/test_monitoring.py](file:///tests/integration/test_monitoring.py)).

---

### Feature 18: Benchmark Leaderboard & Datasets Listing
- **Purpose & User Value:** Ranks audited models by safety score and lists supported evaluation datasets.
- **Entry Points:** `GET /leaderboard`, `GET /datasets` on `:8006`.
- **Observed Status:** Fully implemented on backend, but has no corresponding page in the frontend navigation menu (sidebar only links to Configure, Live Audit, Results).
- **Status:** **`[BACKEND ONLY]`**.
