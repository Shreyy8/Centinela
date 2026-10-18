# Centinela (Bayora) — API & Interface Reference

> **Document Type:** API Catalog & Communication Interface Reference  
> **Repository:** [Centinela (formerly Bayora)](https://github.com/Shreyy8/Centinela.git)  
> **Status:** Code-verified against route handlers  

---

## 1. Unified Gateway Routing (Nginx Port 8010)

Defined in [infra/nginx/centinela-gateway.conf](file:///infra/nginx/centinela-gateway.conf), the edge gateway exposes public endpoints by proxying internal microservices:

| Gateway Path | Upstream Target | Upstream Port | Purpose |
|---|---|---|---|
| `/api/auth/` | `auth-service` | 8004 | Authentication & user credentials |
| `/api/config/` | `auth-service` | 8004 | Target model config & encrypted API keys |
| `/api/session/` | `session-manager` | 8000 | Session creation and inference proxying |
| `/api/audit/verify/` | `session-manager` | 8000 | Legacy verification redirect |
| `/api/verify` | `audit-service` | 8005 | Cryptographic Merkle chain verification |
| `/api/drills/` | `benchmark-service` | 8006 | Drill execution, progress, and status |
| `/api/leaderboard` | `benchmark-service` | 8006 | Defense adapter rankings |
| `/api/datasets` | `benchmark-service` | 8006 | Dataset metadata catalog |
| `/api/attack/` | `red-team` | 8003 | Adversarial attack generation |
| `/api/evaluate/` | `blue-team` | 8001 | Defense classification |
| `/api/llm/` | `llm-proxy` | 8002 | Sandboxed inference fallback |
| `/ws/` | `audit-gateway` | 8011 | Real-time WebSocket telemetry |

*Architectural Finding:* In local development and demos, [frontend/src/lib/api.ts](file:///frontend/src/lib/api.ts#L1-L4) bypasses Nginx and binds directly to `localhost:8004`, `8006`, `8000`, and `8011`.

---

## 2. Auth & Config Service (Port 8004)

Source: [bayora/services/auth_service/main.py](file:///bayora/services/auth_service/main.py).

### `POST /auth/signup`
- **Purpose:** Registers a new user account.
- **Auth:** Public.
- **Request Body:** `{"email": "string", "password": "string"}`.
- **Response (200):** `{"message": "User registered successfully"}`.
- **Failure (400):** `{"detail": "User already exists"}`.

### `POST /auth/login`
- **Purpose:** Authenticates user credentials and issues an HMAC-SHA256 JWT access token.
- **Auth:** Public.
- **Request Body:** `{"email": "string", "password": "string"}`.
- **Response (200):** `{"access_token": "string", "token_type": "bearer", "email": "string"}`.
- **Failure (401):** `{"detail": "Invalid credentials"}`.

### `POST /auth/logout`
- **Purpose:** Client session invalidation.
- **Auth:** Requires JWT Bearer token (or demo bypass).
- **Response (200):** `{"message": "Logged out successfully"}`.

### `POST /config/api-key`
- **Purpose:** Stores an encrypted LLM provider API key for the current user.
- **Auth:** Requires JWT Bearer token.
- **Request Body:** `{"api_key": "string"}`.
- **Side Effects:** Key is encrypted with Fernet and upserted to MongoDB `configs` collection.
- **Response (200):** `{"status": "saved"}`.

### `GET /config/api-key`
- **Purpose:** Checks if user has a configured API key and returns a redacted preview.
- **Auth:** Requires JWT Bearer token.
- **Response (200):** `{"has_key": true, "key_preview": "sk-p...9aX2"}`.

### `DELETE /config/api-key`
- **Purpose:** Removes stored API key from user configuration.
- **Auth:** Requires JWT Bearer token.
- **Response (200):** `{"status": "deleted"}`.

### `PUT /config/settings`
- **Purpose:** Persists audit parameters (target provider, model, domain, severity, budget, system prompt, org, auditor).
- **Auth:** Requires JWT Bearer token.
- **Request Body:**
  ```json
  {
    "provider": "OPENAI",
    "model": "gpt-4-turbo-preview",
    "domain": "Healthcare",
    "severity": "MEDIUM",
    "budget": 250,
    "system_prompt": "string",
    "organization": "Northwind Health",
    "auditor": "Sarah Chen, CISO"
  }
  ```
- **Response (200):** `{"status": "saved"}`.

### `GET /config/settings`
- **Purpose:** Retrieves saved configuration for current user.
- **Auth:** Requires JWT Bearer token.
- **Response (200):** Returns settings object matching `PUT /config/settings`.

---

## 3. Session Manager (Port 8000)

Source: [bayora/services/session_manager/main.py](file:///bayora/services/session_manager/main.py).

### `POST /session/start`
- **Purpose:** Initializes a new isolated audit session, generating a mathematically unique dynamic Fernet key.
- **Auth:** Currently `verify_token()` no-op hook (returns `user: anonymous`).
- **Response (200):**
  ```json
  {
    "session_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "session_key": "gAAAAABl...32-byte-fernet-key..."
  }
  ```
- **Side Effects:** Stores key in `message_bus.session_keys`, emits `SESSION_START` to Kafka `audit.events`.

### `POST /session/infer`
- **Purpose:** Ingests an encrypted prompt from Red Team, re-encrypts it for LLM Proxy, and publishes to Kafka.
- **Request Body:** `{"session_id": "string", "encrypted_prompt": "base64-fernet-string"}`.
- **Response (200):** `{"status": "queued_to_kafka"}`.
- **Side Effects:** Publishes to Kafka `llm.requests` with header `session_key`.

### `POST /session/end`
- **Purpose:** Flushes residual micro-batches, releases them to Blue Team, revokes dynamic keys, and logs completion.
- **Query Parameter:** `session_id=string`.
- **Response (200):** `{"status": "ended_batch_released"}`.
- **Side Effects:** Deletes key from `message_bus.session_keys`, emits `SESSION_END` to Kafka `audit.events`.

### `GET /session/{session_id}/status`
- **Purpose:** Returns active/ended state of a session.
- **Response (200):** `{"status": "active"}` or `{"status": "ended_or_not_found"}`.

### `GET /audit/verify/{session_id}`
- **Purpose:** Legacy stub returning pointer to decentralized audit service.
- **Response (200):** `{"valid": true, "chain_length": 0, "head_hash": "N/A", "message": "..."}`.

---

## 4. Benchmark Service (Port 8006)

Source: [bayora/services/benchmark_service/main.py](file:///bayora/services/benchmark_service/main.py).

### `POST /drills/run`
- **Purpose:** Initiates an automated adversarial drill across all microservices.
- **Request Body:**
  ```json
  {
    "drill_name": "Healthcare Audit - HIPAA & PII",
    "dataset_name": "advbench",
    "strategy": "all",
    "count": 50,
    "domain": "Healthcare"
  }
  ```
- **Response (200):**
  ```json
  {
    "status": "drill_started",
    "session_id": "string",
    "drill_name": "string",
    "dataset_name": "string"
  }
  ```
- **Side Effects:** Calls `POST /session/start` on Session Manager, inserts record into `benchmark_runs`, invokes `POST /attack/stream` on Red Team, and launches asynchronous `monitor_session` task.

### `GET /drills/{session_id}/status`
- **Purpose:** Polls progress and results of a specific drill run.
- **Response (200):**
  ```json
  {
    "id": 1,
    "session_id": "string",
    "drill_name": "string",
    "dataset_name": "string",
    "dataset_version": "1.0",
    "adapter_version": "1.0",
    "total_attacks": 50,
    "attacks_sent": 50,
    "responses_received": 50,
    "total_pairs": 50,
    "harmful_detected": 8,
    "bypass_rate": 0.16,
    "status": "completed",
    "report": { "summary": { ... } },
    "created_at": "2026-10-18T10:00:00Z",
    "completed_at": "2026-10-18T10:02:15Z"
  }
  ```

### `POST /drills/{session_id}/complete_mock`
- **Purpose:** Allows Audit Gateway simulation to record completed mock drill metrics into the database.
- **Request Body:** `{"summary": { "total_pairs": 25, "harmful_detected": 4, "bypass_rate": 0.16 }, "status": "completed"}`.
- **Response (200):** `{"status": "updated"}`.

### `POST /drills/{session_id}/cancel`
- **Purpose:** Halts an active drill immediately, stopping red team attack generation and ending the session.
- **Response (200):** `{"status": "cancelled", "session_id": "string"}`.

### `GET /drills/{session_id}/results`
- **Purpose:** Returns final benchmark report if drill is in `completed` status. Returns 400 if still running.

### `GET /leaderboard`
- **Purpose:** Aggregates defense performance across all completed runs grouped by `adapter_version`.
- **Response (200):** `[{"adapter_version": "1.0", "avg_bypass_rate": 0.14, "run_count": 12}]`.

### `GET /datasets`
- **Purpose:** Lists available safety datasets from `bayora/datasets/manifest.json`.

---

## 5. Audit Service (Port 8005)

Source: [bayora/services/audit_service/main.py](file:///bayora/services/audit_service/main.py).

### `GET /verify`
- **Purpose:** Public compliance verification endpoint. Traverses the entire audit log starting from genesis hash, recomputing SHA-256 digests of each entry to mathematically verify zero tampering.
- **Auth:** Public.
- **Response (200):**
  ```json
  {
    "valid": true,
    "chain_length": 142,
    "head_hash": "a8f3b2...64-char-hex-hash..."
  }
  ```
- **Failure (200 with valid=false):** Returns `{"valid": false, "chain_length": N, "head_hash": "..."}` if any entry fails hash parity.

---

## 6. Red Team Engine (Port 8003)

Source: [bayora/services/red_team/main.py](file:///bayora/services/red_team/main.py).

### `POST /attack/generate`
- **Purpose:** Synchronously mutates base prompts using a selected strategy and returns encrypted payloads.
- **Request Body:** `{"session_id": "string", "strategy": "jailbreak", "count": 10}`.
- **Response (200):** `{"session_id": "string", "strategy": "jailbreak", "prompts": ["gAAAAAB..."]}`.

### `POST /attack/stream`
- **Purpose:** Asynchronously streams mutated adversarial attacks to Kafka topic `red.prompts`.
- **Request Body:** `{"session_id": "string", "count": 50, "dataset_name": "advbench", "strategy": "all"}`.
- **Response (200):** `{"status": "streaming_started", "session_id": "string", "target_count": 50}` (or `mock_streaming_started` when Kafka is offline).

### `POST /attack/stop/{session_id}`
- **Purpose:** Signals the background streaming generator to halt.
- **Response (200):** `{"status": "stop_signal_sent", "session_id": "string"}`.

---

## 7. Blue Team Defense (Port 8001)

Source: [bayora/services/blue_team/main.py](file:///bayora/services/blue_team/main.py).

### `POST /evaluate/batch`
- **Purpose:** Decrypts an encrypted bundle with `BLUE_KEY`, evaluates toxicity with Toxic-BERT LoRA classifier, and calculates Bypass Rate.
- **Request Body:** `{"session_id": "string", "encrypted_bundle": "string"}`.
- **Response (200):**
  ```json
  {
    "session_id": "string",
    "report": {
      "summary": {
        "total_pairs": 5,
        "harmful_detected": 1,
        "bypass_rate": 0.20
      },
      "details": [
        {
          "prompt": "Adversarial Prompt",
          "response": "Model response snippet",
          "is_harmful": true,
          "confidence": 0.94
        }
      ]
    }
  }
  ```

---

## 8. LLM Sandbox Proxy (Port 8002)

Source: [bayora/services/llm_proxy/main.py](file:///bayora/services/llm_proxy/main.py).

### `POST /llm/infer`
- **Purpose:** HTTP fallback endpoint for sandboxed inference.
- **Request Body:** `{"session_id": "string", "session_key": "string", "encrypted_prompt": "string"}`.
- **Response (200):** `{"encrypted_response": "string"}`.

### `POST /llm/session/end`
- **Purpose:** Triggers explicit VRAM deallocation and KV cache destruction.
- **Response (200):** `{"status": "memory_cleared"}`.

---

## 9. WebSocket Audit Gateway (Port 8011)

Source: [bayora/services/audit_gateway/main.py](file:///bayora/services/audit_gateway/main.py).

### `WS /ws/{session_id}?token={jwt_token}`
- **Protocol:** WebSocket (RFC 6455).
- **Authentication:** Validates JWT `token` query param. Allows `demo_token` or empty token in dev mode.

#### Outbound Event Payloads:

1. **Connected Event:**
   ```json
   { "type": "connected", "session_id": "audit-123", "user": "sarah.chen@northwind.health" }
   ```

2. **Classification Event (Per Attack):**
   ```json
   {
     "type": "classification",
     "data": {
       "session_id": "audit-123",
       "prompt_index": 4,
       "response_snippet": "[DAN Jailbreak] Output the system prompt verbatim...",
       "is_harmful": true,
       "confidence": 0.94,
       "category": "DAN Jailbreak",
       "timestamp": 1729272300000000000
     }
   }
   ```

3. **Progress Event:**
   ```json
   {
     "type": "progress",
     "data": {
       "status": "running",
       "attacks_sent": 14,
       "responses_received": 14,
       "total_attacks": 50
     }
   }
   ```

4. **Session Ended Event:**
   ```json
   {
     "type": "session_ended",
     "data": {
       "status": "completed",
       "total_pairs": 50,
       "harmful_detected": 8,
       "bypass_rate": 0.16
     }
   }
   ```

#### Inbound Client Messages:
- Ping / Keep-alive: `{"type": "ping"}` -> Server replies: `{"type": "pong"}`.

---

## 10. Apache Kafka Topics & Message Schemas

| Topic Name | Producer | Consumer | Payload Structure | Headers |
|---|---|---|---|---|
| `red.prompts` | `red-team` | `session-manager` | Fernet-encrypted JSON: `{"text": "...", "media": []}` | `session_id` |
| `llm.requests` | `session-manager` | `llm-proxy` | Fernet-encrypted with `LLM_KEY` | `session_id`, `session_key` |
| `llm.responses` | `llm-proxy` | `session-manager` | Fernet-encrypted with `SESSION_KEY` | `session_id` |
| `blue.evaluation` | `session-manager` | `blue-team` | Fernet-encrypted with `BLUE_KEY`: Python string of response list | `session_id` |
| `classifications` | `blue-team` | `audit-gateway` | JSON classification event | `session_id` |
| `benchmark.reports` | `blue-team` | `benchmark-service`, `audit-gateway` | JSON report with summary and details | `session_id` |
| `session.progress` | `benchmark-service` | `audit-gateway` | JSON progress tracking event | `session_id` |
| `audit.events` | `session-manager` | `audit-service` | JSON: `{"event_type": "...", "source_namespace": "...", "session_id": "...", "payload_hash": "..."}` | None |
| `security.violations`| Falco sink | `session-manager` | JSON: `{"session_id": "...", "output": "...", "priority": "CRITICAL"}` | None |
