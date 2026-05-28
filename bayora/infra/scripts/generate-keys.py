import base64
from cryptography.fernet import Fernet
import os

def generate_k8s_secret(name: str, namespace: str, data: dict):
    yaml_lines = [
        "apiVersion: v1",
        "kind: Secret",
        "metadata:",
        f"  name: {name}",
        f"  namespace: {namespace}",
        "type: Opaque",
        "data:"
    ]
    for k, v in data.items():
        b64_val = base64.b64encode(v.encode('utf-8')).decode('utf-8')
        yaml_lines.append(f"  {k}: {b64_val}")
    return "\n".join(yaml_lines)

def main():
    print("Generating secure Cryptographic Keys for Bayora Multi-Tenant Isolation...")
    red_key = Fernet.generate_key().decode('utf-8')
    blue_key = Fernet.generate_key().decode('utf-8')
    llm_key = Fernet.generate_key().decode('utf-8')

    secrets = [
        # Red Team only gets the RED_KEY
        generate_k8s_secret("red-team-keys", "red-team", {"RED_KEY": red_key}),
        
        # Blue Team only gets the BLUE_KEY
        generate_k8s_secret("blue-team-keys", "blue-team", {"BLUE_KEY": blue_key}),
        
        # LLM Proxy only gets the LLM_KEY
        generate_k8s_secret("llm-proxy-keys", "llm-sandbox", {"LLM_KEY": llm_key}),
        
        # Session Manager holds all three keys to mediate the message bus
        generate_k8s_secret("session-manager-keys", "session-manager", {
            "RED_KEY": red_key,
            "BLUE_KEY": blue_key,
            "LLM_KEY": llm_key
        })
    ]

    output_dir = os.path.join(os.path.dirname(__file__), "..", "k8s", "namespaces")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "secrets.yaml")

    with open(output_path, "w") as f:
        f.write("\n---\n".join(secrets))
        
    print(f"✅ Generated Kubernetes Secrets manifest at: {os.path.abspath(output_path)}")
    print("These secrets are scoped strictly by namespace to prevent cross-contamination.")

if __name__ == "__main__":
    main()
