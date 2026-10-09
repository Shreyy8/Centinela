# Centinela (Bayora) — Complete API & Interface Reference

> **Component:** HTTP REST APIs, WebSocket Feeds & Gateway Routes  
> **Repository:** [Centinela](https://github.com/Shreyy8/Centinela.git)  

---

## 1. Unified Gateway Routing Table (Nginx)

The reverse proxy defined in [infra/nginx/centinela-gateway.conf](file:///infra/nginx/centinela-gateway.conf) listens on **port 8010** and routes incoming traffic to the internal microservices:

| External Gateway Path | Internal Upstream Service | Upstream Port | Notes & Headers |
|---|---|---|---|
| `/api/auth/*` | `http://auth-service:8004/auth/*` | 8004 | Strips prefix `/api/auth/` -> `/auth/` |
| `/api/config/*` | `http://auth-service:8004/config/*` | 8004 | Strips prefix `/api/config/` -> `/config/` |
| `/api/session/*` | `http://session-manager:8000/session/*` | 8000 | Strips prefix `/api/session/` -> `/session/` |
| `/api/audit/verify/*` | `http://session-manager:8000/audit/verify/*` | 8000 | Redirects to session-manager stub |
| `/api/verify` | `http://audit-service:8005/verify` | 8005 | Direct proxy to immutable audit ledger |
| `/api/drills/*` | `http://benchmark-service:8006/drills/*` | 8006 | Strips prefix `/api/drills/` -> `/drills/` |
| `/api/leaderboard` | `http://benchmark-service:8006/leaderboard` | 8006 | Direct proxy to leaderboard |
| `/api/datasets` | `http://benchmark-service:8006/datasets` | 8006 | Direct proxy to datasets |
| `/api/attack/*` | `http://red-team:8003/attack/*` | 8003 | Strips prefix `/api/attack/` -> `/attack/` |
| `/api/evaluate/*` | `http://blue-team:8001/evaluate/*` | 8001 | Strips prefix `/api/evaluate/` -> `/evaluate/` |
| `/api/llm/*` | `http://llm-proxy:8002/llm/*` | 8002 | Strips prefix `/api/llm/` -> `/llm/` |
| `/ws/*` | `http://audit-gateway:8011/ws/*` | 8011 | WebSocket upgrade proxy (`Upgrade`, `Connection`) |

> **Architecture Note:** While Nginx configures these routes on port 8010, the current frontend API client ([frontend/src/lib/api.ts](file:///frontend/src/lib/api.ts#L1-L5)) connects directly to individual port bindings (`8004`, `8006`, `8000`, `8011`) on `localhost`.

---

## 2. Microservice REST API Inventory

### 2.1 Auth & Config Service (`:8004`)
Source: [bayora/services/auth_service/main.py](file:///bayora/services/auth_service/main.py)

#### `POST /auth/signup`
- **Purpose:** Registers a new user account with hashed password.
- **Handler:** `signup(user: UserSignup)` ([line 80](file:///bayora/services/auth_service/main.py#L80))
- **Auth:** Public.
- **Input:** JSON body: `{"email": "string", "password": "string"}`.
- **Output:** `200 OK` -> `{"message": "User created successfully"}`.
- **Side Effects:** Writes to MongoDB `bayora_auth.users`.
- **Errors:** `400 Bad Request` if user already exists (`detail: "User already exists"`).
- **Consumers:** [frontend/src/routes/register.tsx](file:///frontend/src/routes/register.tsx).

#### `POST /auth/login`
- **Purpose:** Authenticates credentials and issues a signed JWT access token.
- **Handler:** `login(user_data: UserLogin)` ([line 93](file:///bayora/services/auth_service/main.py#L93))
- **Auth:** Public.
- **Input:** JSON body: `{"email": "string", "password": "string"}`.
- **Output:** `200 OK` -> `{"access_token": "jwt_string", "token_type": "bearer", "email": "string"}`.
- **Errors:** `401 Unauthorized` if invalid email or password.
- **Consumers:** [frontend/src/routes/login.tsx](file:///frontend/src/routes/login.tsx).

#### `POST /auth/logout`
- **Purpose:** Client logout notification.
- **Handler:** `logout()` ([line 105](file:///bayora/services/auth_service/main.py#L105))
- **Auth:** Public (stateless).
- **Output:** `200 OK` -> `{"message": "Successfully logged out"}`.

#### `POST /config/api-key`
- **Purpose:** Encrypts and persists third-party LLM provider API key.
- **Handler:** `save_api_key(req: ApiKeyRequest, email: str = Depends(get_current_user))` ([line 110](file:///bayora/services/auth_service/main.py#L110))
- **Auth:** Bearer JWT required in `Authorization` header.
- **Input:** JSON body: `{"api_key": "string"}`.
- **Output:** `200 OK` -> `{"status": "saved"}`.
- **Side Effects:** Upserts into MongoDB `bayora_auth.configs` with Fernet-encrypted value.
- **Consumers:** [frontend/src/routes/config.tsx](file:///frontend/src/routes/config.tsx#L66).

#### `GET /config/api-key`
- **Purpose:** Checks if an API key is stored and returns a safe masked preview.
- **Handler:** `get_api_key(email: str = Depends(get_current_user))` ([line 120](file:///bayora/services/auth_service/main.py#L120))
- **Auth:** Bearer JWT required.
- **Output:** `200 OK` -> `{"has_key": bool, "key_preview": "sk-1...abcd" | null}`.

#### `DELETE /config/api-key`
- **Purpose:** Deletes the stored encrypted API key.
- **Handler:** `delete_api_key(email: str = Depends(get_current_user))` ([line 128](file:///bayora/services/auth_service/main.py#L128))
- **Auth:** Bearer JWT required.
- **Output:** `200 OK` -> `{"status": "deleted"}`.

#### `PUT /config/settings`
- **Purpose:** Stores user audit parameters (provider, model, domain, severity, budget, system prompt).
- **Handler:** `save_settings(settings: ConfigSettings, email: str = Depends(get_current_user))` ([line 136](file:///bayora/services/auth_service/main.py#L136))
- **Auth:** Bearer JWT required.
- **Input:** JSON body matching `ConfigSettings` model.
- **Output:** `200 OK` -> `{"status": "saved"}`.
- **Consumers:** [frontend/src/routes/config.tsx](file:///frontend/src/routes/config.tsx#L54).

#### `GET /config/settings`
- **Purpose:** Fetches current saved audit parameters.
- **Handler:** `get_settings(email: str = Depends(get_current_user))` ([line 145](file:///bayora/services/auth_service/main.py#L145))
- **Auth:** Bearer JWT required.
- **Output:** `200 OK` -> JSON representation of `ConfigSettings`.

---

### 2.2 Session Manager (`:8000`)
Source: [bayora/services/session_manager/main.py](file:///bayora/services/session_manager/main.py)

#### `POST /session/start`
- **Purpose:** Creates a new test session, generates dynamic 32-byte Fernet `SESSION_KEY`, and logs start event.
- **Handler:** `start_session(user: dict = Depends(verify_token))` ([line 113](file:///bayora/services/session_manager/main.py#L113))
- **Auth:** Temporary no-op stub dependency (`verify_token` returns `{"user": "anonymous"}`).
- **Input:** None.
- **Output:** `200 OK` -> `{"session_id": "uuid", "session_key": "base64_key"}`.
- **Side Effects:** Stores key in `message_bus.session_keys`; publishes `SESSION_START` to Kafka `audit.events`.
- **Consumers:** Benchmark Service ([bayora/services/benchmark_service/main.py:158](file:///bayora/services/benchmark_service/main.py#L158)).
- **Tests:** [tests/integration/test_session_manager.py:14](file:///tests/integration/test_session_manager.py#L14).

#### `POST /session/infer`
- **Purpose:** HTTP fallback/direct entry point to submit red team prompts into the mediated bus.
- **Handler:** `infer(req: InferRequest, user: dict = Depends(verify_token))` ([line 127](file:///bayora/services/session_manager/main.py#L127))
- **Input:** JSON: `{"session_id": "string", "encrypted_prompt": "base64_string"}`.
- **Output:** `200 OK` -> `{"status": "queued_to_kafka"}`.
- **Side Effects:** Decrypts prompt with `RED_KEY`, re-encrypts with `LLM_KEY`, produces to `llm.requests`.
- **Errors:** `404 Not Found` if session does not exist.

#### `POST /session/end`
- **Purpose:** Closes session, flushes remaining unreleased batch to Blue Team, logs audit event, and purges keys.
- **Handler:** `end_session(session_id: str, user: dict = Depends(verify_token))` ([line 144](file:///bayora/services/session_manager/main.py#L144))
- **Query Param:** `session_id=UUID`.
- **Output:** `200 OK` -> `{"status": "ended_batch_released"}`.
- **Side Effects:** Destroys `session_keys[session_id]` and buffers; emits `SESSION_END` to `audit.events`.

#### `GET /session/{session_id}/status`
- **Purpose:** Checks if session is active or ended.
- **Handler:** `session_status(session_id: str, user: dict = Depends(verify_token))` ([line 161](file:///bayora/services/session_manager/main.py#L161))
- **Output:** `200 OK` -> `{"status": "active" | "ended_or_not_found"}`.

#### `GET /audit/verify/{session_id}`
- **Purpose:** Stub endpoint pointing to decentralized audit service.
- **Handler:** `verify_audit(session_id: str)` ([line 168](file:///bayora/services/session_manager/main.py#L168))
- **Output:** `200 OK` -> `{"valid": true, "chain_length": 0, "head_hash": "N/A", "message": "Forensic audit is now decentralized. Query the Audit Service at /verify for immutable proofs."}`.

---

### 2.3 Benchmark Service (`:8006`)
Source: [bayora/services/benchmark_service/main.py](file:///bayora/services/benchmark_service/main.py)

#### `POST /drills/run`
- **Purpose:** Primary orchestrator endpoint that initiates an automated adversarial safety drill.
- **Handler:** `run_drill(req: DrillRequest)` ([line 145](file:///bayora/services/benchmark_service/main.py#L145))
- **Input:** JSON: `{"drill_name": str, "dataset_name": Optional[str], "strategy": Optional[str], "count": int, "domain": Optional[str]}`.
- **Output:** `200 OK` -> `{"status": "drill_started", "session_id": str, "drill_name": str, "dataset_name": str}`.
- **Side Effects:** Starts session via HTTP on `:8000`, inserts record into PostgreSQL `benchmark_runs`, sends HTTP POST to `:8003/attack/stream`, spawns async session monitor task.
- **Consumers:** [frontend/src/routes/config.tsx](file:///frontend/src/routes/config.tsx#L69).

#### `GET /drills/{session_id}/status`
- **Purpose:** Retrieves real-time status and metrics of a running or completed drill.
- **Handler:** `get_drill_status(session_id: str)` ([line 193](file:///bayora/services/benchmark_service/main.py#L193))
- **Output:** `200 OK` -> Record from `benchmark_runs` table.
- **Consumers:** [frontend/src/routes/results.tsx](file:///frontend/src/routes/results.tsx#L59).

#### `POST /drills/{session_id}/cancel`
- **Purpose:** Aborts an in-progress drill.
- **Handler:** `cancel_drill(session_id: str)` ([line 199](file:///bayora/services/benchmark_service/main.py#L199))
- **Output:** `200 OK` -> `{"status": "cancelled", "session_id": str}`.
- **Side Effects:** Calls `:8003/attack/stop/{session_id}` and `:8000/session/end`.

#### `GET /drills/{session_id}/results`
- **Purpose:** Fetches finalized audit report.
- **Handler:** `get_drill_results(session_id: str)` ([line 225](file:///bayora/services/benchmark_service/main.py#L225))
- **Errors:** `400 Bad Request` if drill status is not `completed`.

#### `GET /leaderboard`
- **Purpose:** Returns historical benchmark rankings across models and datasets.
- **Handler:** `get_leaderboard()` ([line 234](file:///bayora/services/benchmark_service/main.py#L234))
- **Output:** `200 OK` -> Array of runs ordered by `created_at DESC LIMIT 50`.

#### `GET /datasets`
- **Purpose:** Lists available safety datasets from manifest.
- **Handler:** `get_datasets()` ([line 238](file:///bayora/services/benchmark_service/main.py#L238))
- **Output:** `200 OK` -> Array of dataset descriptor objects.

---

### 2.4 Audit Service (`:8005`)
Source: [bayora/services/audit_service/main.py](file:///bayora/services/audit_service/main.py)

#### `GET /verify`
- **Purpose:** Recomputes and validates the entire cryptographic SHA-256 hash chain of the audit log from genesis.
- **Handler:** `verify_audit()` ([line 153](file:///bayora/services/audit_service/main.py#L153))
- **Auth:** Public.
- **Output:** `200 OK` -> `{"valid": bool, "chain_length": int, "head_hash": "hex_string"}`.
- **Algorithm:** Real-time sequential verification across all rows in `audit_entries`.

---

### 2.5 Red Team Engine (`:8003`)
Source: [bayora/services/red_team/main.py](file:///bayora/services/red_team/main.py)

#### `POST /attack/generate`
- **Purpose:** Generates a fixed batch of encrypted adversarial prompts synchronously.
- **Handler:** `generate_attacks(req: GenerateRequest)` ([line 118](file:///bayora/services/red_team/main.py#L118))
- **Input:** JSON: `{"strategy": str, "count": int, "session_id": str}`.
- **Output:** `200 OK` -> `{"session_id": str, "strategy": str, "prompts": [base64_strings]}`.
- **Tests:** [tests/integration/test_pipelines.py:17](file:///tests/integration/test_pipelines.py#L17).

#### `POST /attack/stream`
- **Purpose:** Launches an asynchronous background streaming worker emitting attacks to Kafka `red.prompts`.
- **Handler:** `stream_attacks(req: StreamRequest, background_tasks: BackgroundTasks)` ([line 140](file:///bayora/services/red_team/main.py#L140))
- **Input:** JSON: `{"session_id": str, "count": int, "dataset_name": Optional[str], "strategy": Optional[str]}`.
- **Output:** `200 OK` -> `{"status": "streaming_started", "session_id": str, "target_count": int}`.

#### `POST /attack/stop/{session_id}`
- **Purpose:** Sets the cancellation event for an active streaming worker.
- **Handler:** `stop_stream(session_id: str)` ([line 159](file:///bayora/services/red_team/main.py#L159))
- **Output:** `200 OK` -> `{"status": "stop_signal_sent", "session_id": str}`.

---

### 2.6 Blue Team Defense (`:8001`)
Source: [bayora/services/blue_team/main.py](file:///bayora/services/blue_team/main.py)

#### `POST /evaluate/batch`
- **Purpose:** Synchronous HTTP evaluation of an encrypted response bundle using the LoRA classifier.
- **Handler:** `evaluate_batch(req: BatchEvaluationRequest)` ([line 110](file:///bayora/services/blue_team/main.py#L110))
- **Input:** JSON: `{"session_id": str, "encrypted_bundle": "base64_string"}`.
- **Output:** `200 OK` -> `{"session_id": str, "report": {"summary": {...}, "details": [...]}}`.
- **Tests:** [tests/integration/test_pipelines.py:34](file:///tests/integration/test_pipelines.py#L34).

---

### 2.7 LLM Proxy Sandbox (`:8002`)
Source: [bayora/services/llm_proxy/main.py](file:///bayora/services/llm_proxy/main.py)

#### `POST /llm/infer`
- **Purpose:** HTTP fallback endpoint for sandboxed inference.
- **Handler:** `infer(req: LLMRequest)` ([line 76](file:///bayora/services/llm_proxy/main.py#L76))
- **Input:** JSON: `{"session_id": str, "session_key": str, "encrypted_prompt": str}`.
- **Output:** `200 OK` -> `{"encrypted_response": str}`.

#### `POST /llm/session/end`
- **Purpose:** Explicitly destroys model instance and purges VRAM cache.
- **Handler:** `end_session()` ([line 87](file:///bayora/services/llm_proxy/main.py#L87))
- **Output:** `200 OK` -> `{"status": "memory_cleared"}`.

---

## 3. Real-Time WebSocket Interface (`:8011`)
Source: [bayora/services/audit_gateway/main.py](file:///bayora/services/audit_gateway/main.py)

### Connection Handshake
- **URL:** `ws://localhost:8011/ws/{session_id}?token={jwt_token}`
- **Authentication:** `token` query parameter decoded via `jwt.decode(token, JWT_SECRET, algorithms=["HS256"])`.
- **Failure:** Close code `4001` with reason `"Invalid token"` or `"Authentication failed"`.

### Inbound Client Messages
- Heartbeat Ping: `{"type": "ping"}` -> Server replies: `{"type": "pong"}`.

### Outbound Server Broadcasts

```mermaid
flowchart TD
    K[Kafka Consumer] -->|Topic: classifications| C[Event: classification]
    K -->|Topic: audit.events| A[Event: audit]
    K -->|Topic: session.progress| P[Event: progress]

    C --> WS[WebSocket Client (/audit)]
    A --> WS
    P --> WS
```

1. **Connected Ack:**
   `{"type": "connected", "session_id": "uuid", "user": "user@email.com"}`
2. **Classification Frame:**
   ```json
   {
     "type": "classification",
     "data": {
       "session_id": "uuid",
       "prompt_index": 0,
       "response_snippet": "I cannot help...",
       "is_harmful": false,
       "confidence": 0.98,
       "category": "hate_speech",
       "timestamp": 1728460000000000000
     },
     "timestamp": 1728460000000000000
   }
   ```
3. **Audit Log Frame:**
   ```json
   {
     "type": "audit",
     "data": {
       "event_type": "PROMPT_SENT",
       "source_namespace": "red-team",
       "session_id": "uuid",
       "payload_hash": "a1b2c3..."
     }
   }
   ```
4. **Session Progress Frame:**
   ```json
   {
     "type": "progress",
     "data": {
       "session_id": "uuid",
       "status": "running",
       "attacks_sent": 42,
       "responses_received": 40,
       "total_attacks": 100
     }
   }
   ```
