import os
import base64
from cryptography.fernet import Fernet

RED_KEY = os.getenv("RED_KEY", Fernet.generate_key().decode())
BLUE_KEY = os.getenv("BLUE_KEY", Fernet.generate_key().decode())
LLM_KEY = os.getenv("LLM_KEY", Fernet.generate_key().decode())

class IsolatedMessageBus:
    def __init__(self, audit_log, kafka_producer=None, batch_size=5):
        self.audit_log = audit_log
        self.red_fernet = Fernet(RED_KEY.encode())
        self.blue_fernet = Fernet(BLUE_KEY.encode())
        self.llm_fernet = Fernet(LLM_KEY.encode())
        self.kafka_producer = kafka_producer
        self.batch_size = batch_size
        
        self.session_stores = {} # session_id -> list of encrypted responses
        self.unreleased_stores = {} # session_id -> list of unreleased encrypted responses
        self.session_keys = {}   # session_id -> Fernet instance
        self.session_raw_keys = {} # session_id -> raw bytes string

    async def produce(self, topic: str, message: bytes, headers=None):
        if self.kafka_producer and hasattr(self.kafka_producer, "send_and_wait"):
            await self.kafka_producer.send_and_wait(topic, message, headers=headers)
        elif isinstance(self.kafka_producer, dict):
            # Mock behavior for testing
            if topic not in self.kafka_producer:
                self.kafka_producer[topic] = []
            self.kafka_producer[topic].append(message)
            print(f"[MOCK KAFKA] Produced to {topic}: {message[:20]}...")
        else:
            print(f"[MOCK KAFKA] Produced to {topic}: {message[:20]}...")

    async def consume_red_prompt(self, session_id: str, encrypted_payload: bytes, session_key_str: str):
        # 1. Decrypt with RED_KEY
        try:
            plaintext = self.red_fernet.decrypt(encrypted_payload)
        except Exception as e:
            raise ValueError("Failed to decrypt red prompt")

        # 2. Re-encrypt with LLM_KEY
        llm_encrypted = self.llm_fernet.encrypt(plaintext)

        # 3. Publish to llm.requests
        headers = [
            ("session_id", session_id.encode()),
            ("session_key", session_key_str.encode())
        ]
        await self.produce("llm.requests", llm_encrypted, headers=headers)
        
        # 4. Audit Log
        self.audit_log.append("PROMPT_SENT", "red-team", session_id, plaintext)

    async def handle_llm_response(self, session_id: str, encrypted_response: bytes):
        # 1. Decrypt with SESSION_KEY
        session_fernet = self.session_keys.get(session_id)
        if not session_fernet:
            # Gracefully ignore responses for ended or non-existent sessions
            print(f"[Session Manager] Info: Received response for ended/invalid session {session_id}. Ignoring.")
            return
            
        try:
            plaintext = session_fernet.decrypt(encrypted_response)
        except Exception:
            raise ValueError("Failed to decrypt LLM response")
            
        # 2. Store encrypted response in session store (encrypted with SESSION_KEY)
        if session_id not in self.session_stores:
            self.session_stores[session_id] = []
            self.unreleased_stores[session_id] = []
        
        self.session_stores[session_id].append(encrypted_response)
        self.unreleased_stores[session_id].append(encrypted_response)
        
        # 3. Audit Log
        self.audit_log.append("RESPONSE_RECEIVED", "llm-sandbox", session_id, plaintext)

        # 4. Check for batch release
        if len(self.unreleased_stores[session_id]) >= self.batch_size:
            await self.release_unreleased_batch(session_id)

    async def release_unreleased_batch(self, session_id: str):
        if session_id not in self.unreleased_stores or not self.unreleased_stores[session_id]:
            return
            
        session_fernet = self.session_keys[session_id]
        batch_plaintext = []
        
        # Decrypt the current unreleased batch
        for encrypted_resp in self.unreleased_stores[session_id]:
            batch_plaintext.append(session_fernet.decrypt(encrypted_resp).decode('utf-8'))
            
        # Re-encrypt bundle with BLUE_KEY
        bundle_bytes = str(batch_plaintext).encode('utf-8')
        blue_encrypted = self.blue_fernet.encrypt(bundle_bytes)
        
        # Produce to blue.evaluation
        headers = [("session_id", session_id.encode())]
        await self.produce("blue.evaluation", blue_encrypted, headers=headers)

        # Audit Log
        self.audit_log.append("BATCH_RELEASED", "session-manager", session_id, bundle_bytes)

        # Clear unreleased store for this session
        self.unreleased_stores[session_id] = []

    async def release_batch_to_blue(self, session_id: str):
        # Flush any remaining unreleased responses
        await self.release_unreleased_batch(session_id)
