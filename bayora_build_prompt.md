# Bayora Hackathon — Master Build Prompt
## Securing Adversarial AI Safety Testing Infrastructure

---

## Role & Objective

You are a senior ML infrastructure engineer building a production-grade, cloud-native AI safety validation platform called **Bayora**. The platform runs simultaneous adversarial red-team attacks and blue-team defenses against a client LLM — all inside the same cloud environment — without any cross-contamination between teams or the model under test.

Your goal is to architect, implement, and deploy a **fully isolated multi-tenant execution system** where:

1. The red team's attack payloads are never observable by the blue team before a session ends
2. The blue team's classifier logic is never inferable by the red team
3. The client LLM remains in a clean, uncontaminated state throughout every evaluation session

> **Core constraint:** Standard multi-tenant security (firewalls, RBAC, container isolation) is insufficient here because the adversarial agent is *inside the perimeter by design*. The solution must re-architect isolation at the system level — not patch it at the configuration level. Every safety finding must be forensically defensible: if isolation is compromised, the entire evaluation output is invalid.

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│              Orchestration Layer                │
│         (Kubernetes + Istio Service Mesh)       │
└────────┬──────────────┬──────────────┬──────────┘
         │              │              │
   ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼──────┐
   │  Red Team │  │ Blue Team │  │  LLM Pod  │
   │ Namespace │  │ Namespace │  │ Namespace │
   │  (gVisor) │  │  (gVisor) │  │  (gVisor) │
   └─────┬─────┘  └─────┬─────┘  └────┬──────┘
         │              │              │
   ┌─────▼──────────────▼──────────────▼──────┐
   │         Encrypted Message Bus            │
   │       (Apache Kafka + mTLS)              │
   └─────────────────────┬────────────────────┘
                         │
   ┌─────────────────────▼────────────────────┐
   │        Audit & Provenance Layer          │
   │  (Immutable log → Merkle Tree hash)      │
   └──────────────────────────────────────────┘
```

### Data Flow (per session)

1. Red-team service generates N adversarial prompts → encrypts with `LLM_KEY` → publishes to `red.prompts`
2. Session-manager consumes → validates session state → re-encrypts → publishes to `llm.requests`
3. LLM proxy decrypts → runs inference → encrypts response with `SESSION_KEY` → publishes to `llm.responses`
4. Session-manager stores encrypted pair in session store → appends audit entry
5. On session end: session-manager decrypts batch → re-encrypts with `BLUE_KEY` → publishes to `blue.evaluation`
6. Blue-team service decrypts → runs classifier → writes report to database

---

## Project Structure

```
bayora/
├── infra/
│   ├── terraform/              # Cloud provisioning (AWS/GCP/Azure)
│   ├── k8s/
│   │   ├── namespaces/         # red, blue, llm, session-manager, kafka
│   │   ├── network-policies/   # strict ingress/egress whitelists
│   │   ├── pod-security/       # seccomp profiles, RuntimeClass
│   │   └── istio/              # mTLS, AuthorizationPolicy, PeerAuthentication
│   └── gvisor/                 # runsc runtime configs
│
├── services/
│   ├── red-team/               # Attack orchestration FastAPI service
│   ├── blue-team/              # Defense classifier FastAPI service
│   ├── llm-proxy/              # Sandboxed inference wrapper
│   ├── session-manager/        # Controls test lifecycle + message routing
│   └── audit-service/          # Tamper-evident Merkle log collector
│
├── datasets/
│   ├── loaders/                # AdvBench, JailbreakBench, HarmBench, ToxiGen, HH-RLHF
│   └── preprocessing/          # Normalise to common schema
│
├── ml/
│   ├── classifiers/            # Blue team defense models (LoRA fine-tuned)
│   ├── attack-generators/      # Red team prompt mutation engines
│   └── evaluation/             # Scoring and reporting pipelines
│
└── monitoring/
    ├── falco-rules/             # Custom anomaly detection rules
    └── dashboards/              # Grafana + Jaeger configs
```

---

## Section 01 — Functional Requirements

### FR-1: Tenant Isolation

Build three completely isolated execution environments (namespaces): `red-team`, `blue-team`, and `llm-sandbox`. Each namespace must have its own:

- Network policy (deny-all by default, narrow whitelist)
- Kubernetes secrets scoped to a single service account
- RuntimeClass (`gvisor-sandboxed`)
- Resource quota and LimitRange

No pod in any namespace may initiate a direct connection to a pod in another namespace. All cross-namespace communication must route exclusively through the `session-manager` service on port 8443.

### FR-2: Mediated Message Bus

Implement an encrypted Kafka message bus with the following topic classes:

| Topic | Producer | Consumer | Encryption Key |
|-------|----------|----------|----------------|
| `red.prompts` | Red-team service | Session-manager | `RED_KEY` |
| `llm.requests` | Session-manager | LLM proxy | `LLM_KEY` |
| `llm.responses` | LLM proxy | Session-manager | `SESSION_KEY` |
| `blue.evaluation` | Session-manager | Blue-team service | `BLUE_KEY` |
| `security.violations` | Falco sink | Violation handler | `AUDIT_KEY` |

The `blue.evaluation` topic must only receive data *after* a session is formally concluded by the session-manager. Real-time prompt streaming to the blue team is forbidden by architecture, not just policy.

### FR-3: LLM Session Sandboxing

The LLM inference pod must:

- Load a fresh model instance per session (`use_cache=False`, `torch_dtype=float16`)
- Explicitly destroy the model on session end (`del model` + `torch.cuda.empty_cache()`)
- Never retain state across session boundaries

Session lifecycle API:

```
POST /session/start     → creates session ID, allocates LLM Job
POST /session/infer     → routes prompt through mediated bus
POST /session/end       → triggers batch release, closes Merkle chain
GET  /session/{id}/status
```

### FR-4: Tamper-Evident Audit Log

Every cross-boundary event must be appended to a Merkle-chained audit log. Each entry must contain:

- `event_type` — e.g., PROMPT_SENT, RESPONSE_RECEIVED, SESSION_END, ISOLATION_BREACH
- `source_namespace` — red-team | blue-team | llm-sandbox | session-manager
- `session_id` — UUID
- `payload_hash` — SHA-256 of the actual payload (never plaintext)
- `timestamp_ns` — nanosecond-precision UNIX timestamp
- `prev_hash` — hash of the previous entry (chain link)
- `entry_hash` — SHA-256 of the full entry

Expose a verification endpoint: `GET /audit/verify/{session_id}` that recomputes and validates the full chain, returning pass/fail with chain length and head hash.

### FR-5: ML Pipelines

**Red-team service** (`POST /attack/generate`):
- Load adversarial prompts from AdvBench and JailbreakBench
- Support four attack strategies: `direct`, `jailbreak`, `injection`, `roleplay`
- Accept `{strategy, count, session_id}` and return encrypted prompt batch

**Blue-team service** (`POST /evaluate/batch`):
- Fine-tune a toxicity classifier on HarmBench + ToxiGen + HH-RLHF
- Accept session results bundle (received only after session end)
- Return structured report: bypass rate, per-category harm scores, flagged pairs

### FR-6: Anomaly Detection

Deploy Falco with custom rules to detect and block:

- Any network connection from `red-team` namespace toward `blue-team` CIDR
- Any invocation of `ptrace` or `perf_event_open` syscalls
- Any file read/write outside permitted paths within each container

Violations must:
1. Trigger an event on `security.violations` Kafka topic
2. Automatically terminate the active session with `ISOLATION_BREACH` status
3. Append a BREACH entry to the Merkle audit log

---

## Section 02 — Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Inference latency (end-to-end through mediated bus) | p95 < 2 seconds |
| NFR-02 | Cloud portability | AWS EKS, GCP GKE, Azure AKS — no modification |
| NFR-03 | Concurrent sessions | 10 simultaneous sessions minimum |
| NFR-04 | Service availability | 99.5% uptime; 2+ replicas + pod disruption budget |
| NFR-05 | Audit event coverage | 100% of cross-boundary events captured |
| NFR-06 | Deploy time | Single `make deploy` command; cold-start under 15 minutes |
| NFR-07 | Kafka durability | Replication factor 3 across all topics |

---

## Section 03 — System Design

### Isolation Layers (outermost to innermost)

**Layer 1 — Kubernetes NetworkPolicy**
Strict ingress/egress whitelist per namespace. Red and blue namespaces may only reach session-manager on port 8443. Deny-all is the default; every permitted route is an explicit exception.

**Layer 2 — Istio mTLS**
All service-to-service communication is mutually authenticated TLS. `PeerAuthentication` policy set to `STRICT` cluster-wide. `AuthorizationPolicy` enforces source principal matching — a service can only be called by the specific service account that is permitted to call it.

**Layer 3 — gVisor (runsc)**
Every pod in all three tenant namespaces uses `RuntimeClass: gvisor-sandboxed`. The user-space kernel intercepts all syscalls, preventing container escape to the host kernel. Containers cannot observe host processes or memory.

**Layer 4 — Seccomp**
Custom allowlist profile: approximately 20 required syscalls permitted. Explicitly blocked: `ptrace`, `perf_event_open`, `process_vm_readv`, `kexec_load`, all mount syscalls. This eliminates timing side-channel tooling and process inspection.

**Layer 5 — Message Encryption**
Each team holds a unique Fernet key stored in Kubernetes Secrets with RBAC scoped to their service account only. The session-manager holds all three keys but runs in its own isolated namespace with no direct network access to tenant namespaces. Plaintext never traverses the Kafka bus.

### Threat Model

| Threat Vector | Status | Mitigation |
|---------------|--------|------------|
| Network side-channels | ✅ Mitigated | Istio mTLS + NetworkPolicy |
| KV-cache leakage between sessions | ✅ Mitigated | `use_cache=False` + explicit session teardown |
| Prompt corpus leakage to blue team | ✅ Mitigated | Delayed batch delivery via session lifecycle |
| Syscall-level reconnaissance | ✅ Mitigated | gVisor + seccomp allowlist |
| CPU cache timing side-channels | ⚠️ Partial | Seccomp blocks `perf_event_open`; hardware L3 cache shared across nodes requires dedicated node pools to fully close |
| Shared DRAM on same physical host | ❌ Not mitigated | Requires confidential computing (Intel TDX or AMD SEV) |
| Compromised Kubernetes control plane | ❌ Not mitigated | Outside scope; requires separate K8s hardening programme |
| Supply-chain attacks on base images | ❌ Not mitigated | Requires image signing (Cosign/Sigstore) and admission control |

> Document this table honestly in your submission. Judges reward intellectual rigour over overclaiming.

---

## Section 04 — Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Orchestration | Kubernetes + Helm | 1.29+ / Helm 3 |
| Infrastructure as Code | Terraform | 1.7+ |
| Service Mesh | Istio (mTLS STRICT) | 1.20 |
| Container Runtime | gVisor (runsc) | Latest stable |
| Syscall Filtering | Seccomp allowlist | Custom profile |
| Message Bus | Apache Kafka (Strimzi operator) | 3.6 |
| Encryption | Fernet (AES-128-CBC) | cryptography 42+ |
| ML Framework | HuggingFace Transformers + PyTorch | 4.40+ / 2.x |
| Fine-tuning | PEFT / LoRA | 0.10+ |
| Backend Services | FastAPI + Python | 3.11 |
| Datasets | AdvBench, JailbreakBench, HarmBench, ToxiGen, HH-RLHF | — |
| Audit Storage | PostgreSQL + Merkle layer | 16 |
| Anomaly Detection | Falco | 0.37 |
| Observability | Prometheus + Grafana + Jaeger | Latest stable |
| Cloud Targets | AWS EKS, GCP GKE, Azure AKS | — |

---

## Section 05 — Task Breakdown by Phase

### Phase 1 — Isolation Infrastructure
**Weeks 1–2 | Infra Engineer + Security Engineer | Critical path**

- [ ] **[CRITICAL]** Provision EKS/GKE cluster with Terraform. Enable node auto-provisioning, configure VPC with private subnets, enable Pod Security Standards at "restricted" level.
- [ ] **[CRITICAL]** Create four Kubernetes namespaces: `red-team`, `blue-team`, `llm-sandbox`, `session-manager`. Apply resource quotas and LimitRanges to each.
- [ ] **[CRITICAL]** Write and apply NetworkPolicy manifests for all four namespaces. Deny all ingress/egress by default, then add narrow whitelist rules. Test with `kubectl exec` and verify cross-namespace connections are refused.
- [ ] **[CRITICAL]** Install gVisor on all tenant nodes. Create RuntimeClass manifest for `runsc`. Apply RuntimeClass to all pods in the three tenant namespaces. Verify with `dmesg` that gVisor's user-space kernel is active.
- [ ] **[HIGH]** Author custom seccomp JSON profile. Allowlist minimal syscalls, explicitly deny `ptrace`, `perf_event_open`, `process_vm_readv`, all mount calls. Attach as annotation on all tenant pods.
- [ ] **[HIGH]** Install Istio with strict PeerAuthentication (mTLS STRICT) cluster-wide. Write AuthorizationPolicy for each namespace specifying permitted source principals. Verify mTLS handshake in Kiali dashboard.
- [ ] **[HIGH]** Generate three Fernet encryption keys (RED, BLUE, LLM). Store as Kubernetes Secrets with RBAC: each secret bound to a single service account in its respective namespace. Session-manager service account bound to all three secrets.
- [ ] **[HIGH]** Write an isolation test suite: attempt DNS resolution of blue-team service from red-team pod, attempt direct TCP from red-team to llm-sandbox, attempt ptrace from within a container. All must fail. Add to CI.

---

### Phase 2 — Message Bus & Session Manager
**Week 2 | Infra Engineer + Backend Engineer | Critical path**

- [ ] **[CRITICAL]** Deploy Kafka via Strimzi operator inside a dedicated `kafka` namespace. Configure 3-broker cluster with replication factor 3. Create topics: `red.prompts`, `llm.requests`, `llm.responses`, `blue.evaluation`, `security.violations`.
- [ ] **[CRITICAL]** Build session-manager FastAPI service. Implement `POST /session/start` (creates session ID, allocates LLM Job, initialises Merkle log head), `POST /session/end` (triggers batch release, closes Merkle chain), `GET /session/{id}/status`.
- [ ] **[CRITICAL]** Implement the `IsolatedMessageBus` class: consume from `red.prompts`, decrypt with `LLM_KEY`, re-encrypt with `SESSION_KEY`, produce to `llm.requests`. Verify no plaintext leaves the bus at any point with Wireshark/tcpdump on the Kafka pod.
- [ ] **[CRITICAL]** Implement delayed blue-team delivery: session-manager holds all LLM responses in encrypted session store (Redis or PostgreSQL). On session end, batch decrypt and re-encrypt with `BLUE_KEY`, produce single bundle to `blue.evaluation`.
- [ ] **[HIGH]** Build the `TamperEvidentLog` class: `append()` method (hash entry, chain to previous), `verify()` method (walk chain, recompute hashes), expose as `GET /audit/verify/{session_id}`. Back with PostgreSQL + write-ahead log archiving.
- [ ] **[HIGH]** Write session lifecycle integration tests: full flow from attack prompt submission → LLM inference → session end → blue-team receipt. Assert correct sequencing, encryption at each stage, and audit log completeness.
- [ ] **[MEDIUM]** Implement Kubernetes Job template for LLM pods: one Job per session, uses gVisor RuntimeClass, mounts model weights as ReadOnly PVC, terminates after `POST /session/end` is acknowledged.

---

### Phase 3 — LLM Proxy & Inference Sandbox
**Weeks 2–3 | ML Engineer + Backend Engineer | High priority**

- [ ] **[CRITICAL]** Build `SandboxedInference` class: load model with `use_cache=False` and `torch_dtype=float16`, implement `infer(prompt)` with `max_new_tokens=256` and deterministic sampling, implement `end_session()` with explicit `del model` and `torch.cuda.empty_cache()`.
- [ ] **[HIGH]** Implement output sandboxing: strip any tokens that reproduce system prompts, filter any content matching the red-team prompt verbatim (prevents prompt echo side-channel), enforce strict max response length at tokenizer level.
- [ ] **[HIGH]** Wrap inference in a Kafka consumer loop: consume from `llm.requests`, decrypt, call `SandboxedInference.infer()`, encrypt response, produce to `llm.responses`. Implement dead-letter queue for failed inferences.
- [ ] **[HIGH]** Write LLM contamination tests: run two sequential sessions with the same model. Assert that session 2 has no knowledge of session 1 prompts (test by injecting a unique secret in session 1 and checking session 2 outputs contain no trace of it).
- [ ] **[MEDIUM]** Benchmark inference latency through full mediated path. Target: p95 under 2 seconds. Profile bottlenecks — Kafka overhead, encryption cost, model load time. Implement model pre-warming if session cold-start exceeds 5 seconds.

---

### Phase 4 — ML Pipelines (Red & Blue Teams)
**Week 3 | ML Engineer | High priority**

- [ ] **[HIGH]** Build dataset loaders for AdvBench, JailbreakBench, HarmBench, ToxiGen, HH-RLHF. Normalise to a common schema: `{id, prompt, label, category, source}`. Cache preprocessed versions in a versioned data store (S3/GCS bucket).
- [ ] **[HIGH]** Build `AdversarialPromptEngine`: implement four strategy classes — `DirectAttack`, `JailbreakMutation`, `PromptInjection`, `RoleplayObfuscation`. Each class takes base prompts from AdvBench and transforms them. Expose via `POST /attack/generate`.
- [ ] **[HIGH]** Fine-tune a base toxicity classifier (`unitary/toxic-bert` or similar) on HarmBench + ToxiGen using LoRA/PEFT for efficiency. Achieve at least 85% F1 on the HarmBench validation split before deploying to blue-team service.
- [ ] **[HIGH]** Build `DefenseClassifier` batch evaluation pipeline: accept session bundle from Kafka, run classifier on all prompt-response pairs, compute bypass rate, per-category harm scores, confidence distribution. Write structured JSON report to PostgreSQL.
- [ ] **[MEDIUM]** Implement evaluation scoring API: `GET /report/{session_id}` returns bypass rate, attack strategy breakdown, top-5 most harmful responses, and classifier confidence histogram. This is the primary output judges will inspect.
- [ ] **[MEDIUM]** Write ML pipeline tests: verify blue-team classifier cannot be called during an active session, verify attack strategy diversity (generated batches have >3 distinct strategy types), verify report completeness.

---

### Phase 5 — Anomaly Detection & Monitoring
**Weeks 3–4 | Security Engineer + DevOps Engineer | Medium priority**

- [ ] **[HIGH]** Deploy Falco DaemonSet with a custom rules file. Write three critical rules: cross-namespace DNS probe, blocked syscall invocation, and unauthorised file access outside permitted paths. Route all alerts to the `security.violations` Kafka topic.
- [ ] **[HIGH]** Build a violation handler in session-manager: consume from `security.violations`, match alerts to active sessions, call `session.terminate(reason=ISOLATION_BREACH)`, update audit log with BREACH event, notify via webhook.
- [ ] **[MEDIUM]** Deploy Prometheus + Grafana. Create a Bayora security dashboard with panels for: active sessions, isolation violation rate, Kafka consumer lag per topic, inference p95 latency, audit chain verification pass rate.
- [ ] **[MEDIUM]** Implement Jaeger distributed tracing across session-manager, LLM proxy, red-team, and blue-team services. Every request must carry a trace ID that appears in both the Jaeger UI and the audit log for correlation.
- [ ] **[LOW]** Write a red-team penetration test script: attempt to exfiltrate blue-team classifier weights from the red-team namespace via DNS tunnelling, timing side-channels, and shared volume probing. Document which attacks succeed and which fail.

---

### Phase 6 — Demo, Documentation & Submission
**Week 4 | All Engineers | Delivery**

- [ ] **[HIGH]** Record a 5-minute demo video: (1) run a complete session — attack generation, LLM inference, session end, blue-team evaluation; (2) demonstrate an attempted cross-namespace connection being blocked in real time; (3) show audit chain verification passing.
- [ ] **[HIGH]** Write the architecture README: isolation model diagram, data flow walkthrough, threat model table, and known limitations. Be explicit about residual risks — judges penalise overclaiming.
- [ ] **[HIGH]** Ensure one-command deploy works from scratch: `make deploy` runs Terraform init/apply, then Helm installs in dependency order, then a smoke test confirms all services healthy. Test on a clean cloud account with zero pre-existing state.
- [ ] **[MEDIUM]** Write the residual risk roadmap: for each unmitigated threat, describe the technology required (e.g., Intel TDX for DRAM isolation), effort estimate, and priority. This demonstrates engineering maturity and directly addresses Objective 06.
- [ ] **[MEDIUM]** Final checklist: all six hackathon objectives mapped to specific components in the README, CI pipeline green, audit chain verify endpoint returning 200 on a completed session, Grafana dashboard accessible at a public URL.

---

## Section 06 — Hackathon Objective Mapping

| Objective | Description | Components |
|-----------|-------------|------------|
| 01 | Isolate without breaking function | Namespaces, gVisor, Seccomp, NetworkPolicy, Istio |
| 02 | Prevent information leakage | Encrypted Kafka bus, delayed blue-team delivery, output sandboxing |
| 03 | Guarantee audit integrity | Merkle-chained log, PostgreSQL WAL archiving, `GET /audit/verify` endpoint |
| 04 | Build for deployability | Terraform + Helm, `make deploy`, multi-cloud Kubernetes manifests |
| 05 | Address LLM-native threats | `use_cache=False`, session teardown, prompt echo filter, per-session Job isolation |
| 06 | Quantify residual risk | Threat model table, residual risk roadmap, pentest results |

---

## Appendix — Datasets

| Dataset | URL | Use |
|---------|-----|-----|
| AdvBench | https://github.com/llm-attacks/llm-attacks | Red-team baseline — 500+ harmful instruction prompts |
| JailbreakBench | https://jailbreakbench.github.io | Jailbreak library with success/failure labels |
| HarmBench | https://www.harmbench.org | Standardised safety evaluation across harm categories |
| ToxiGen | https://github.com/microsoft/ToxiGen | Toxic/benign statements for classifier training |
| Lakera Gandalf | https://huggingface.co/datasets/Lakera/gandalf_ignore_instructions | Real-world prompt injection attempts |
| NVD/CVE Feeds | https://nvd.nist.gov/vuln/search | Docker/Kubernetes CVEs for threat modelling |
| DARPA CADETS | https://github.com/darpa-i2o/Transparent-Computing | System-level provenance logs for audit design |
| Anthropic HH-RLHF | https://huggingface.co/datasets/Anthropic/hh-rlhf | Helpful/harmless pairs for classifier fine-tuning |

---

## Appendix — Recommended Team Split

| Role | Phases | Responsibilities |
|------|--------|-----------------|
| Infrastructure Engineer | 1, 2, 6 | Kubernetes, gVisor, Kafka, Terraform, Helm |
| Security Engineer | 1, 5, 6 | Seccomp, Falco, Istio, audit chain, threat model |
| ML Engineer | 3, 4, 6 | Classifiers, attack generators, dataset pipelines, fine-tuning |
| Backend / DevOps Engineer | 2, 3, 5, 6 | Session manager, FastAPI services, Grafana, Jaeger, CI/CD |

---

*Bayora Hackathon — Build Prompt v1.0*
