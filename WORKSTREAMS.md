# Centinela — Multi-Agent Workstream Isolation Contract

> **Target:** Autonomous Coding Agents & Engineering Teams  
> **Purpose:** Enforces 100% independent execution tracks between 2 agents, preventing cross-track interference, merge conflicts, and dependency blocking.  
> **Authority:** Mandatory project instruction. Every agent assigned to a track must strictly adhere to these boundaries.

---

## 1. Golden Rules of Agent Track Isolation

1. **STRICT REPOSITORY PARTITION:** An agent assigned to **Track 1 (Platform & Systems)** must NEVER create, edit, or delete files in Track 2's domain (e.g. `frontend/`, `bayora/ml/`, `bayora/datasets/`).
2. **ZERO DEPENDENCY BLOCKING:** An agent assigned to **Track 2 (Frontend & ML)** must NEVER wait on Kafka, Docker, or PostgreSQL infrastructure. Track 2 agents MUST use `demo_server.py` for all local development and testing.
3. **FROZEN API CONTRACT:** All communication between tracks is governed strictly by [docs/codebase-discovery/API_REFERENCE.md](file:///docs/codebase-discovery/API_REFERENCE.md). Neither agent may introduce breaking changes to existing endpoint paths, headers, or message formats. Any additions must be strictly additive and backward-compatible.
4. **LOCALIZED VERIFICATION:** Each agent verifies only their own track using their assigned test and compiler commands before opening a pull request.

---

## 2. Track 1: Platform, Cryptography & Systems Engineer

### Scope & Mission
Hardening the core distributed backend, cryptographic key isolation, append-only Merkle ledger, Docker/Kubernetes infrastructure, and CI/CD pipelines.

### PERMITTED Files to Edit
- `bayora/services/session_manager/**` (bus mediation, key revocation, micro-batching)
- `bayora/services/audit_service/**` (tamper-evident Merkle ledger, atomic DB writes)
- `bayora/infra/**` (Kubernetes manifests, Istio policies, runtimeclass, Terraform)
- `docker-compose.yml`, `docker-compose.override.yml`
- `Dockerfile` (multi-stage packaging)
- `Makefile` (test paths and automation)
- `services/orchestrator/**` (cleanup of abandoned Django stub)
- `tests/integration/test_session_manager.py`
- `tests/integration/test_monitoring.py`
- `.github/workflows/**` (CI pipelines)

### FORBIDDEN Files (DO NOT TOUCH)
- ❌ `frontend/**` (Any React, Vite, Tailwind, or TypeScript code)
- ❌ `bayora/datasets/**` (Dataset loaders and raw JSON corpuses)
- ❌ `bayora/ml/**` (Attack generation, PAIR, classifiers, LoRA models)
- ❌ `bayora/services/auth_service/**` (User auth and API key settings)
- ❌ `tests/integration/test_llm_proxy.py`

### Assigned Tasks from IMPROVEMENTS.md
- **Task 1.3:** Clean up socket binding error in `services/orchestrator/src/orchestrator/settings.py`.
- **Task 1.4:** Update `Makefile` test target paths to `tests/integration/`.
- **Task 1.5:** Fix Kafka listeners in `docker-compose.yml` (`INTERNAL://kafka:9092`, `EXTERNAL://localhost:9094`).
- **Task 1.6:** Eliminate plaintext `session_key` transmission from Kafka header in `session_manager/bus.py`.
- **Task 1.7:** Enforce atomic database transaction in `audit_service/main.py`.
- **Task 1.8:** Replace `ast.literal_eval` with standard JSON in `session_manager/bus.py` and `blue_team/main.py`.
- **Task 4.1:** Create slim multi-stage Dockerfile targets.
- **Task 4.2:** Add missing K8s manifests for `auth-service`, `audit-gateway`, and `mongodb` to `apps.yaml`.
- **Task 4.3:** Create `.github/workflows/ci.yml`.

### Track 1 Verification Command
```bash
python -m pytest tests/integration/test_session_manager.py tests/integration/test_monitoring.py -v
```

---

## 3. Track 2: Frontend Product & ML / Data Engineer

### Scope & Mission
Refining the auditor web dashboard, implementing client-side PDF certificate export, ingesting real adversarial prompt datasets, and hardening PAIR attack generation and refusal classifiers.

### PERMITTED Files to Edit
- `frontend/**` (All React components, routes, lib, and build configuration)
- `bayora/datasets/**` (AdvBench & JailbreakBench ingestion, loaders, manifest.json)
- `bayora/ml/**` (Attack generators, PAIR judge scoring, Toxic-BERT classifiers)
- `bayora/services/auth_service/**` (User profile API and MongoDB configuration)
- `bayora/services/llm_proxy/**` (Inference sandboxing, semantic filters)
- `tests/integration/test_llm_proxy.py`
- `tests/integration/test_pipelines.py`

### FORBIDDEN Files (DO NOT TOUCH)
- ❌ `bayora/services/session_manager/**` (Central message broker)
- ❌ `bayora/services/audit_service/**` (Merkle chain implementation)
- ❌ `bayora/infra/**` (Kubernetes, Istio, Terraform)
- ❌ `docker-compose.yml`, `Dockerfile`, `Makefile`

### Assigned Tasks from IMPROVEMENTS.md
- **Task 1.1:** Fix `useRef` TS2554 compilation error in `frontend/src/routes/audit.tsx:85`.
- **Task 1.2:** Fix `LLM_KEY.encode()` AttributeError in `tests/integration/test_llm_proxy.py:66`.
- **Task 2.1:** Ingest complete AdvBench 520 & JailbreakBench corpuses in `bayora/datasets/loaders/common.py`.
- **Task 2.2:** Implement judge scoring for iterative PAIR in `bayora/ml/attack_generators/engine.py`.
- **Task 2.3:** Add string refusal heuristics and fail-closed defense in `bayora/ml/classifiers/defense.py`.
- **Task 2.4:** Standardize Attack Success Rate (ASR) metric across frontend routes.
- **Task 3.1:** Route frontend through unified Nginx Gateway (:8010) in `frontend/src/lib/api.ts`.
- **Task 3.2:** Implement client-side PDF certificate download in `frontend/src/routes/results.tsx`.
- **Task 3.3:** Add user profile persistence API (`/auth/profile`) in `auth_service` and wire to `profile.tsx`.
- **Task 3.4:** Re-enable production auth 401 redirects in frontend.

### Dedicated Development Runtime
Track 2 agents must run the zero-dependency mock server:
```bash
# Terminal 1: Standalone Demo Server
python demo_server.py

# Terminal 2: Frontend Development
cd frontend
npm run dev
```

### Track 2 Verification Command
```bash
cd frontend && npx tsc --noEmit && npm run build
python -m pytest tests/integration/test_llm_proxy.py tests/integration/test_pipelines.py -v
```

---

## 4. Conflict Matrix & Shared File Protocol

| File / Component | Owner | Collaborator Rule |
|---|---|---|
| `bayora/services/blue_team/main.py` | Track 1 for Task 1.8 (JSON serialization) | Track 2 may only modify ML evaluation imports; never change Kafka bus handling. |
| `bayora/services/llm_proxy/bus.py` | Track 1 for Task 1.6 (Session key envelope) | Track 2 manages `inference.py`; Track 1 manages `bus.py`. |
| `demo_server.py` | Track 2 | Track 1 does not need this script (Track 1 uses real Docker/services). |
| `API_REFERENCE.md` | Joint Read-Only Reference | Neither agent alters the specification without an explicit backward-compatibility RFC. |

---

## 5. Agent Pre-Execution Prompt Template

When dispatching an AI coding agent to execute work on this repository, prepend this instruction:

```text
You are assigned to [TRACK 1: Platform & Systems | TRACK 2: Frontend & ML].
You MUST read WORKSTREAMS.md before writing code.
You are STRICTLY FORBIDDEN from modifying any files outside your assigned track.
Verify all changes using only your track's designated test command.
Do not modify or refactor existing working code outside your specific task scope.
```
