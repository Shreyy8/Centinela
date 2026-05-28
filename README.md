# Bayora — Securing Adversarial AI Safety Testing Infrastructure

Bayora is a production-grade, cloud-native AI safety validation platform designed to run simultaneous adversarial red-team attacks and blue-team defenses against LLMs within a fully isolated multi-tenant environment.

## Architecture

The platform leverages multiple layers of isolation:
1.  **Kubernetes Namespaces:** Logical separation for `red-team`, `blue-team`, `llm-sandbox`, and `session-manager`.
2.  **gVisor (runsc):** User-space kernel sandboxing to prevent container escapes.
3.  **Network Policies:** Deny-all by default, with strict whitelisting for mediated communication.
4.  **Istio Service Mesh:** Mutual TLS (mTLS) and fine-grained Authorization Policies.
5.  **Mediated Message Bus (Kafka):** All cross-team communication is encrypted and routed through a central session manager.

## Data Flow

1.  **Red Team** generates adversarial prompts and encrypts them with `RED_KEY`.
2.  **Session Manager** consumes prompts, re-encrypts with `LLM_KEY`, and sends to **LLM Proxy**.
3.  **LLM Proxy** runs inference in a sandboxed environment, encrypts responses with `SESSION_KEY`.
4.  **Session Manager** stores encrypted responses until the session ends.
5.  **Blue Team** receives the full batch only *after* session closure, encrypted with `BLUE_KEY`.

## Security Features

*   **Tamper-Evident Audit Log:** Every cross-boundary event is recorded in a Merkle-chained log.
*   **Anomaly Detection:** Falco monitoring for DNS probes, unauthorized syscalls, and file access violations.
*   **Automatic Isolation Breach Response:** Immediate session termination upon detection of a security violation.
*   **Output Sandboxing:** Echo filters and system prompt stripping to prevent side-channel leaks.

## Threat Model

| Threat Vector | Status | Mitigation |
| :--- | :--- | :--- |
| Network side-channels | ✅ Mitigated | Istio mTLS + NetworkPolicy |
| KV-cache leakage | ✅ Mitigated | `use_cache=False` + session teardown |
| Prompt corpus leakage | ✅ Mitigated | Delayed batch delivery |
| Syscall-level recon | ✅ Mitigated | gVisor + Seccomp allowlist |
| Shared DRAM timing | ❌ Not mitigated | Requires Confidential Computing (Intel TDX/AMD SEV) |

## Deployment

To deploy the entire stack:
```bash
make deploy
```
*Requires: Terraform, Helm, Kubectl.*

## Testing

Comprehensive test suites are included:
*   `pytest bayora/services/session_manager/test_session_manager.py` (Session lifecycle)
*   `pytest bayora/services/llm_proxy/test_llm_proxy.py` (Inference isolation)
*   `pytest bayora/ml/evaluation/test_pipelines.py` (Red/Blue team pipelines)
*   `pytest bayora/monitoring/test_monitoring.py` (Anomaly detection)

## Residual Risk Roadmap

1.  **DRAM Isolation:** Integrate Intel TDX or AMD SEV for memory encryption.
2.  **Node-Level Isolation:** Implement dedicated node pools for each team to mitigate L3 cache side-channels.
3.  **Supply Chain Security:** Integrate Cosign for image signing and admission control.
