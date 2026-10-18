import os
import sys
import time
import subprocess
import signal
from dotenv import load_dotenv

# Load shared encryption keys from .env
load_dotenv()

# Ensure required environment variables exist
if not os.getenv("RED_KEY") or not os.getenv("BLUE_KEY") or not os.getenv("LLM_KEY"):
    from cryptography.fernet import Fernet
    os.environ.setdefault("RED_KEY", Fernet.generate_key().decode())
    os.environ.setdefault("BLUE_KEY", Fernet.generate_key().decode())
    os.environ.setdefault("LLM_KEY", Fernet.generate_key().decode())

os.environ.setdefault("JWT_SECRET", "supersecretkey")
os.environ.setdefault("SESSION_MANAGER_URL", "http://localhost:8000")
os.environ.setdefault("RED_TEAM_URL", "http://localhost:8003")
os.environ.setdefault("MOCK_LLM", "1")

SERVICES = [
    {"name": "Auth & Config Service", "module": "bayora.services.auth_service.main:app", "port": 8004},
    {"name": "Session Manager",       "module": "bayora.services.session_manager.main:app", "port": 8000},
    {"name": "Audit Service",         "module": "bayora.services.audit_service.main:app", "port": 8005},
    {"name": "Benchmark Service",     "module": "bayora.services.benchmark_service.main:app", "port": 8006},
    {"name": "Red Team Engine",       "module": "bayora.services.red_team.main:app", "port": 8003},
    {"name": "Blue Team Defense",     "module": "bayora.services.blue_team.main:app", "port": 8001},
    {"name": "LLM Sandbox Proxy",    "module": "bayora.services.llm_proxy.main:app", "port": 8002},
    {"name": "WebSocket Audit Gateway","module": "bayora.services.audit_gateway.main:app", "port": 8011},
]

def main():
    print("=" * 65)
    print("🚀 Starting Centinela Backend Microservices (Direct Python Runner)")
    print("=" * 65)

    processes = []
    
    try:
        for svc in SERVICES:
            cmd = [
                sys.executable, "-m", "uvicorn",
                svc["module"],
                "--host", "127.0.0.1",
                "--port", str(svc["port"])
            ]
            print(f"[*] Launching {svc['name']:<26} -> http://localhost:{svc['port']}")
            p = subprocess.Popen(cmd, env=os.environ.copy())
            processes.append((svc["name"], p))
            time.sleep(0.3)

        print("\n" + "=" * 65)
        print("✅ All backend microservices launched successfully!")
        print("Press Ctrl+C at any time to shut down all services.")
        print("=" * 65 + "\n")

        # Keep parent alive and monitor processes
        while True:
            time.sleep(1)
            for name, p in processes:
                if p.poll() is not None:
                    print(f"⚠️ Service '{name}' exited unexpectedly with code {p.returncode}")

    except KeyboardInterrupt:
        print("\n🛑 Shutting down all Centinela microservices...")
    finally:
        for name, p in processes:
            if p.poll() is None:
                p.terminate()
                try:
                    p.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    p.kill()
        print("👋 All services terminated cleanly.")

if __name__ == "__main__":
    main()
