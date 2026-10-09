#!/bin/bash
set -e

# Generate Fernet keys
RED_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
BLUE_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
LLM_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Create secret manifests
cat <<EOF > ../k8s/namespaces/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: red-team-key
  namespace: red-team
type: Opaque
data:
  FERNET_KEY: ${RED_KEY}
---
apiVersion: v1
kind: Secret
metadata:
  name: blue-team-key
  namespace: blue-team
type: Opaque
data:
  FERNET_KEY: ${BLUE_KEY}
---
apiVersion: v1
kind: Secret
metadata:
  name: llm-team-key
  namespace: llm-sandbox
type: Opaque
data:
  FERNET_KEY: ${LLM_KEY}
EOF

echo "Secrets generated at ../k8s/namespaces/secrets.yaml"
