# Centinela (Bayora) — Data Model & Storage Lifecycle

> **Document Type:** Database Schema, Storage Systems & Cryptographic Data Lifecycle  
> **Repository:** [Centinela (formerly Bayora)](https://github.com/Shreyy8/Centinela.git)  
> **Status:** Code-verified against database initialization scripts  

---

## 1. Storage Systems Overview

Centinela employs a polyglot persistence architecture configured for regulatory compliance and audit isolation:

| Datastore | Technology | Database / Instance | Key Entities | Resilience Pattern |
|---|---|---|---|---|
| **Audit Ledger** | PostgreSQL 16 | `bayora_audit` | `audit_entries` (SHA-256 Merkle chain) | In-memory chain fallback (`self.chain`) |
| **Benchmark Store**| PostgreSQL 16 | `bayora_benchmark` | `benchmark_runs` (Drill results & leaderboard) | In-memory runs fallback (`self._memory_runs`)|
| **Auth & Config** | MongoDB | `bayora_auth` | `users`, `configs` (Encrypted API keys) | Timeout-protected fallback (`demo_mode`) |
| **Volatile State** | In-Memory / Python | All Services | `session_keys`, `session_stores`, `active_sessions` | Explicit destruction via garbage collection |

---

## 2. Entity-Relationship & Schema Diagram

```mermaid
erDiagram
    USERS ||--o| CONFIGS : "owns"
    BENCHMARK_RUNS ||--o{ AUDIT_ENTRIES : "correlates via session_id"

    USERS {
        ObjectId _id PK
        string email UK "Indexed unique user email"
        string hashed_password "Bcrypt password hash"
        datetime created_at "Account creation timestamp"
    }

    CONFIGS {
        ObjectId _id PK
        string email FK "User email reference"
        string api_key_encrypted "Fernet-encrypted provider API key"
        string provider "OPENAI, ANTHROPIC, OLLAMA, CUSTOM"
        string model "Target model identifier"
        string domain "Healthcare, Finance, Legal, General"
        string severity "INFO, LOW, MEDIUM, HIGH, CRITICAL"
        int budget "Adversarial audit budget USD"
        string system_prompt "Target model system instructions"
        string organization "Auditee organization name"
        string auditor "Auditor full name & credentials"
        datetime updated_at "Last updated timestamp"
    }

    BENCHMARK_RUNS {
        int id PK "Serial auto-increment"
        string session_id UK "UUID4 session identifier"
        string drill_name "Human-readable drill description"
        string dataset_name "advbench, jailbreakbench, combined"
        string dataset_version "Dataset version identifier"
        string adapter_version "Defense LoRA adapter version"
        int total_attacks "Target attack count"
        int attacks_sent "Count of attacks emitted"
        int responses_received "Count of responses received"
        int total_pairs "Total evaluated pairs"
        int harmful_detected "Count of toxic/bypassed responses"
        float bypass_rate "harmful_detected / total_pairs (0.0 to 1.0)"
        string status "pending, running, completed, cancelled, failed"
        jsonb report "Detailed evaluation report and category stats"
        timestamp created_at "Run start timestamp"
        timestamp completed_at "Run completion timestamp"
    }

    AUDIT_ENTRIES {
        int id PK "Serial sequence number"
        string event_type "SESSION_START, PROMPT_SENT, RESPONSE_RECEIVED, etc."
        string source_namespace "session-manager, red-team, llm-sandbox, etc."
        string session_id "Correlating drill session UUID"
        string payload_hash "SHA-256 digest of payload"
        bigint timestamp_ns "Nanosecond Unix epoch timestamp"
        string prev_hash "64-char SHA-256 of preceding entry"
        string entry_hash "64-char SHA-256 of current entry state"
    }
```

---

## 3. Relational Schemas (PostgreSQL)

### 3.1 `bayora_audit.audit_entries`
Defined in [bayora/services/audit_service/main.py:44-55](file:///bayora/services/audit_service/main.py#L44-L55).

```sql
CREATE TABLE IF NOT EXISTS audit_entries (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    source_namespace VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    timestamp_ns BIGINT NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    entry_hash VARCHAR(64) NOT NULL
);
```

#### Fields & Forensic Constraints:
- `event_type`: Categorizes boundary activity (`SESSION_START`, `PROMPT_SENT`, `RESPONSE_RECEIVED`, `BATCH_RELEASED`, `SESSION_END`, `ISOLATION_BREACH`).
- `source_namespace`: Kubernetes namespace originating the action.
- `session_id`: Unique identifier binding entries to a specific drill.
- `payload_hash`: SHA-256 hash of the plaintext message payload (ensures plaintext content is never persisted in the audit database).
- `timestamp_ns`: Monotonic timestamp recorded via `time.time_ns()`.
- `prev_hash`: Pointer to the `entry_hash` of the preceding record (initialized to `SHA-256("genesis")`).
- `entry_hash`: Hash digest computed over the JSON representation of the entry:
  $$\text{entry\_hash} = \text{SHA256}(\text{JSON}(\text{event\_type}, \text{source\_namespace}, \text{session\_id}, \text{payload\_hash}, \text{timestamp\_ns}, \text{prev\_hash}))$$

### 3.2 `bayora_benchmark.benchmark_runs`
Defined in [bayora/services/benchmark_service/database.py:31-56](file:///bayora/services/benchmark_service/database.py#L31-L56).

```sql
CREATE TABLE IF NOT EXISTS benchmark_runs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    drill_name VARCHAR(255),
    dataset_name VARCHAR(255),
    dataset_version VARCHAR(50),
    adapter_version VARCHAR(50),
    total_attacks INTEGER DEFAULT 0,
    attacks_sent INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    total_pairs INTEGER,
    harmful_detected INTEGER,
    bypass_rate FLOAT,
    status VARCHAR(50) DEFAULT 'pending',
    report JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_benchmark_runs_session_id ON benchmark_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_runs_status ON benchmark_runs(status);
```

---

## 4. Document Store Schema (MongoDB `bayora_auth`)

Managed by Motor (AsyncIO MongoDB driver) in [bayora/services/auth_service/main.py](file:///bayora/services/auth_service/main.py).

### 4.1 Collection: `users`
```json
{
  "_id": { "$oid": "664fa1e2b4c19a0012345678" },
  "email": "sarah.chen@northwind.health",
  "hashed_password": "$2b$12$e8YkZ8Q8k3P.q8eF...bcrypt...",
  "created_at": { "$date": "2026-10-15T09:00:00Z" }
}
```

### 4.2 Collection: `configs`
```json
{
  "_id": { "$oid": "664fa1e2b4c19a0012345679" },
  "email": "sarah.chen@northwind.health",
  "api_key_encrypted": "gAAAAABl6Z8Q8k3P...fernet-ciphertext...",
  "provider": "OPENAI",
  "model": "gpt-4-turbo-preview",
  "domain": "Healthcare",
  "severity": "MEDIUM",
  "budget": 250,
  "system_prompt": "You are a helpful assistant specialized in security research.",
  "organization": "Northwind Health",
  "auditor": "Sarah Chen, CISO",
  "updated_at": { "$date": "2026-10-18T10:15:00Z" }
}
```

---

## 5. Data Lifecycle & Cryptographic Verification

```mermaid
flowchart TD
    Init[Drill Initialized: POST /drills/run] --> GenSession[Generate UUID4 & 32-byte Fernet Key]
    GenSession --> LogStart[Emit SESSION_START to audit.events]
    LogStart --> AuditPersist[Audit Service: Append to Merkle Chain]
    
    AuditPersist --> ExecDrill[Execute Attacks & Classify Responses]
    ExecDrill --> LogPrompt[Audit Service: Hash & Log PROMPT_SENT]
    ExecDrill --> LogResponse[Audit Service: Hash & Log RESPONSE_RECEIVED]
    ExecDrill --> LogBatch[Audit Service: Hash & Log BATCH_RELEASED]

    ExecDrill --> DrillEnd[Drill Completed: POST /session/end]
    DrillEnd --> LogEnd[Audit Service: Hash & Log SESSION_END]
    LogEnd --> PurgeKey[Purge In-Memory Key & Flush VRAM]
    
    subgraph "Verification Procedure: GET /verify"
        QueryLedger[SELECT * FROM audit_entries ORDER BY id ASC]
        QueryLedger --> Loop[Traverse sequentially from genesis hash]
        Loop --> ParityCheck{recomputed_hash == entry_hash && prev_hash == current_prev}
        ParityCheck -->|Parity Holds| IncLength[chain_length += 1, current_prev = entry_hash]
        ParityCheck -->|Discrepancy| TamperDetected[Return valid=False: Tampering detected]
        IncLength --> EndLoop{End of ledger?}
        EndLoop -->|No| Loop
        EndLoop -->|Yes| ValidReturn[Return valid=True, chain_length, head_hash]
    end
```
