# Centinela (Bayora) — Advanced AI Safety & Adversarial Resilience Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.29-blue)](https://kubernetes.io/)
[![Security: gVisor](https://img.shields.io/badge/Security-gVisor-green)](https://gvisor.dev/)
[![Messaging: Kafka](https://img.shields.io/badge/Messaging-Kafka-orange)](https://kafka.apache.org/)

**Centinela** (codenamed **Bayora**) is a production-grade, cloud-native orchestration platform designed for high-fidelity AI safety validation. It enables organizations to execute simultaneous adversarial **Red-Team** attacks and **Blue-Team** defensive classification within a zero-trust, multi-tenant environment.

Unlike traditional LLM testing harnesses, Centinela enforces strict logical and physical isolation between actors to prevent side-channel leaks, ensure non-repudiation of audit logs, and simulate real-world adversarial conditions.

---

## 🏗 Executive Summary

As Large Language Models (LLMs) are integrated into critical infrastructure, the need for rigorous, isolated safety testing is paramount. Centinela provides the "proving ground" for these models, featuring:

*   **Zero-Trust Orchestration:** No direct communication between Red and Blue teams; all traffic is mediated, encrypted, and audited.
*   **Kernel-Level Sandboxing:** Inference workloads run in **gVisor** (runsc) to mitigate container escape vulnerabilities.
*   **Cryptographic non-repudiation:** A Merkle-chained audit log ensures that every interaction is immutable and verifiable.
*   **Delayed Batch Delivery:** Blue teams receive response data only after session closure, preventing real-time prompt corpus leakage and ensuring unbiased classification.

---

## 🛡 Security Architecture

Centinela implements a "Defense-in-Depth" strategy across five distinct layers:

### 1. Workload Isolation (gVisor)
All LLM inference and untrusted code execution (Red Team generators) are encapsulated in gVisor. This provides a user-space kernel that intercepts syscalls, significantly reducing the attack surface of the host Linux kernel.

### 2. Network Segmentation (Istio & Cilium)
*   **Deny-All Default:** Every namespace has a default-deny network policy.
*   **mTLS Everywhere:** Istio enforces mutual TLS for all service-to-service communication.
*   **Egress Control:** Strict egress filters prevent LLM proxies or Red Team agents from "calling home" or exfiltrating data to unauthorized endpoints.

### 3. Data-in-Flight Protection (Kafka + Fernet)
All cross-team communication occurs over a **Mediated Message Bus (Kafka)**.
*   Payloads are symmetrically encrypted using **Fernet (AES-128-CBC)**.
*   Keys are rotated per-session and managed exclusively by the **Session Manager**.
*   **Dynamic Key Distribution:** Session keys are injected into Kafka headers only for the duration of a request/response cycle.

### 4. Runtime Security (Falco)
System-level monitoring via **Falco** detects anomalies such as:
*   Unexpected outbound DNS probes.
*   Unauthorized file access in `/etc` or `/proc`.
*   Execution of suspicious binaries within the sandbox.

### 5. Forensic Audit Trail
The **Audit Service** maintains a tamper-evident log. Every message (PROMPT_SENT, RESPONSE_RCVD, SESSION_END) is hashed and linked to the previous entry, creating a verifiable chain of custody for safety benchmarks.

---

## 🧩 Microservice Catalog

| Service | Responsibility | Technology |
| :--- | :--- | :--- |
<<<<<<< HEAD
| **Session Manager** | Orchestrates lifecycles, manages keys, and enforces "Delayed Batch" logic. | FastAPI, aiokafka |
| **LLM Proxy** | Unified gateway for model inference (Gemini, vLLM, LiteLLM). | FastAPI, vLLM, LiteLLM |
| **Red Team Service** | Generates adversarial payloads and probes safety boundaries. | PyTorch, Transformers |
| **Blue Team Service** | Real-time and post-session classification of LLM outputs. | Scikit-learn, PEFT (LoRA) |
| **Audit Service** | Maintains the Merkle-chained immutable event store. | PostgreSQL, Cryptography |
| **Benchmark Service** | High-level coordinator for automated safety scoring. | Python |
=======
| Network side-channels | ✅ Mitigated | Istio mTLS + NetworkPolicy |
| KV-cache leakage | ✅ Mitigated | `use_cache=False` + session teardown |
| Prompt corpus leakage | ✅ Mitigated | Delayed batch delivery |
| Syscall-level recon | ✅ Mitigated | gVisor + Seccomp allowlist |
>>>>>>> 3b54cfd1195f3480279c1746239bea5b8e371351

---

## 🛠 Technical Stack

*   **Language:** Python 3.11+ (FastAPI)
*   **Infrastructure:** Terraform, AWS EKS (Kubernetes 1.29)
*   **Messaging:** Confluent Kafka / AIOKafka
*   **Database:** PostgreSQL 16 (Audit Store)
*   **Inference:** vLLM, Google Generative AI, HuggingFace Transformers
*   **Observability:** Prometheus, Grafana, Falco
*   **Service Mesh:** Istio

---

## 🚀 Getting Started

### Prerequisites
*   Docker & Docker Compose
*   Terraform (for cloud deployment)
*   Kubernetes CLI (kubectl)
*   Python 3.10+

### Local Development (Quickstart)
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/centinela.git
    cd centinela
    ```
2.  **Environment Setup:**
    ```bash
    cp .env.example .env
    # Edit .env with your GOOGLE_API_KEY or other provider keys
    ```
3.  **Spin up the stack:**
    ```bash
    docker-compose up --build
    ```
4.  **Run a sample validation:**
    ```bash
    python bayora/scripts/isolation-test.sh
    ```

### Cloud Deployment (AWS)
Centinela is designed to scale on AWS EKS.
```bash
cd bayora/infra/terraform
terraform init
terraform apply -var="cluster_name=centinela-prod"
```

---

## 🧪 Testing & Validation

Centinela maintains a >90% coverage target for its core isolation logic.

*   **Integration Tests:** `pytest tests/integration`
*   **Security Probes:** `tests/integration/test_monitoring.py` (Validates Falco trigger-response)
*   **Model Benchmarks:** `pytest bayora/ml/evaluation/test_pipelines.py`

---

## 📉 Threat Model & Residual Risk

| Threat Vector | Mitigation Strategy | Residual Risk |
| :--- | :--- | :--- |
| **Container Escape** | gVisor (runsc) sandboxing | Low (Kernel Zero-days) |
| **Data Exfiltration** | Istio Egress Gateway + Deny-All NetPol | Low (DNS Tunneling) |
| **Audit Tampering** | Merkle-chained Chaining in Audit Service | Very Low |
| **Model Poisoning** | Blue Team delayed classification | Moderate |
| **Side-Channel (DRAM)** | Not yet mitigated | Moderate (Requires Intel TDX/AMD SEV) |

---

## 🗺 Roadmap

*   [ ] **Phase 1 (Current):** Core isolation, Kafka mediation, and basic Red/Blue team integration.
*   [ ] **Phase 2:** Integration of Confidential Computing (Intel TDX) for DRAM-level isolation.
*   [ ] **Phase 3:** Automated "Red-Team-in-the-Loop" RLHF safety tuning.
*   [ ] **Phase 4:** Multi-cloud support (GCP/Azure) via Terraform modules.

---

## 🤝 Contributing

We welcome contributions from the AI Safety and Cybersecurity communities. Please see `CONTRIBUTING.md` for our security disclosure policy and coding standards.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
