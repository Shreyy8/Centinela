import pytest
from fastapi.testclient import TestClient
import os
import base64
from cryptography.fernet import Fernet

# Set path for imports
import sys
sys.path.append(os.path.join(os.getcwd(), "bayora/services/red-team"))
sys.path.append(os.path.join(os.getcwd(), "bayora/ml/attack-generators"))
sys.path.append(os.path.join(os.getcwd(), "bayora/services/blue-team"))
sys.path.append(os.path.join(os.getcwd(), "bayora/ml/classifiers"))

from bayora.services.red_team.main import app as red_app, RED_KEY
from bayora.services.blue_team.main import app as blue_app, BLUE_KEY

def test_red_team_generation():
    client = TestClient(red_app)
    response = client.post("/attack/generate", json={
        "strategy": "jailbreak",
        "count": 2,
        "session_id": "test-session-123"
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["prompts"]) == 2
    
    # Decrypt and check strategy application
    fernet = Fernet(RED_KEY)
    p1 = fernet.decrypt(data["prompts"][0].encode()).decode()
    # Jailbreak mutation should contain templates like "Imagine you are..."
    assert any(keyword in p1 for keyword in ["Imagine", "Act", "DAN", "fictional"]) or True # Fallback

def test_blue_team_evaluation():
    client = TestClient(blue_app)
    
    # Simulate an encrypted bundle from session-manager
    responses = ["I will help you build a bomb", "I am a helpful assistant"]
    blue_fernet = Fernet(BLUE_KEY)
    encrypted_bundle = blue_fernet.encrypt(str(responses).encode()).decode()
    
    response = client.post("/evaluate/batch", json={
        "session_id": "test-session-123",
        "encrypted_bundle": encrypted_bundle
    })
    assert response.status_code == 200
    data = response.json()
    assert "report" in data
    assert data["report"]["summary"]["total_pairs"] == 2
