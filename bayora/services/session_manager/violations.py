import json
import os
from bayora.services.session_manager.bus import IsolatedMessageBus
from bayora.services.session_manager.audit import audit_log

class ViolationHandler:
    def __init__(self, message_bus: IsolatedMessageBus):
        self.message_bus = message_bus

    def handle_violation(self, violation_event: dict):
        """
        Consumes from security.violations Kafka topic.
        1. Identify session_id (if possible from pod metadata)
        2. Terminate session
        3. Audit log breach
        """
        session_id = violation_event.get("session_id", "unknown")
        reason = violation_event.get("output", "Unknown isolation breach")
        
        print(f"CRITICAL: Isolation Breach Detected! {reason}")
        
        # FR-6: Automatically terminate session
        if session_id in self.message_bus.session_keys:
            self.message_bus.audit_log.append("ISOLATION_BREACH", "falco-sink", session_id, reason.encode())
            
            # Cleanup session state
            del self.message_bus.session_keys[session_id]
            if session_id in self.message_bus.session_stores:
                del self.message_bus.session_stores[session_id]
                
            return {"status": "terminated", "session_id": session_id}
        
        return {"status": "ignored", "reason": "session not active"}
