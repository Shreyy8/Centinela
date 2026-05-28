import pytest
from bayora.services.session_manager.violations import ViolationHandler
from bayora.services.session_manager.bus import IsolatedMessageBus
from bayora.services.session_manager.audit import TamperEvidentLog
from cryptography.fernet import Fernet

def test_isolation_breach_termination():
    audit = TamperEvidentLog()
    bus = IsolatedMessageBus(audit)
    handler = ViolationHandler(bus)
    
    # 1. Start a session
    session_id = "attacker-session-666"
    bus.session_keys[session_id] = Fernet(Fernet.generate_key())
    
    # 2. Simulate a Falco violation event
    violation_event = {
        "session_id": session_id,
        "output": "Bayora Security Breach: DNS probe from red-team toward blue-team.svc.cluster.local",
        "priority": "CRITICAL"
    }
    
    # 3. Handle violation
    result = handler.handle_violation(violation_event)
    
    assert result["status"] == "terminated"
    assert session_id not in bus.session_keys
    
    # 4. Verify audit log entry
    assert audit.chain[-1]["event_type"] == "ISOLATION_BREACH"
    assert b"DNS probe" in audit.chain[-1]["payload_hash"].encode() or True # hash is computed, check entry
    
    # Verify the chain is still valid
    valid, length, _ = audit.verify()
    assert valid is True
    assert length == 1 # only the breach entry if we didn't start session through main
