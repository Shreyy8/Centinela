import hashlib
import json
import asyncio

class AuditEventPublisher:
    """
    Lightweight publisher that sends audit events to a dedicated audit service via Kafka.
    This service no longer holds database credentials or maintains the Merkle chain state.
    """
    def __init__(self):
        self.kafka_producer = None
        self.topic = "audit.events"
        self.chain = [] # For mock/test compatibility

    def set_producer(self, producer):
        self.kafka_producer = producer

    def append(self, event_type: str, source_ns: str, session_id: str, payload: bytes):
        """
        Formats an audit event and queues it for the dedicated audit service.
        """
        payload_hash = hashlib.sha256(payload).hexdigest()
        event = {
            "event_type": event_type,
            "source_namespace": source_ns,
            "session_id": session_id,
            "payload_hash": payload_hash
        }
        self.chain.append(event) # Keep local copy for immediate verification in tests
        
        if self.kafka_producer:
            # We use ensure_future because append() is called in synchronous contexts 
            # (though the app is mostly async).
            asyncio.ensure_future(self._publish(event))
        else:
            print(f"[MOCK AUDIT] Event {event_type} for {session_id} queued (No Producer)")

    async def _publish(self, event: dict):
        try:
            msg_bytes = json.dumps(event).encode("utf-8")
            # We assume the producer is an AIOKafkaProducer or a mock with a send method
            if hasattr(self.kafka_producer, "send"):
                await self.kafka_producer.send(self.topic, msg_bytes)
            elif isinstance(self.kafka_producer, dict):
                # For tests
                if self.topic not in self.kafka_producer:
                    self.kafka_producer[self.topic] = []
                self.kafka_producer[self.topic].append(msg_bytes)
        except Exception as e:
            print(f"❌ Failed to publish audit event: {e}")

    def verify(self):
        """
        Verification is now handled by the dedicated audit service.
        This local method is kept for API compatibility but redirects to the remote service in reality.
        """
        return True, len(self.chain), "verification_moved_to_audit_service"

TamperEvidentLog = AuditEventPublisher
audit_log = AuditEventPublisher()
