# Standard libs only
import os
import base64
from cryptography.fernet import Fernet

import json

# The LLM Proxy uses LLM_KEY to decrypt requests and SESSION_KEY to encrypt responses
def get_key(env_var):
    key = os.getenv(env_var)
    if not key:
        return Fernet.generate_key()
    return key.encode()

LLM_KEY = get_key("LLM_KEY")

class LLMProxyBus:
    def __init__(self, inference_engine):
        self.inference_engine = inference_engine
        self.llm_fernet = Fernet(LLM_KEY)
        self.current_session_fernet = None
        
        # Mock Kafka
        self.kafka_topics = {
            "llm.requests": [],
            "llm.responses": []
        }

    def process_request(self, encrypted_req: bytes, session_key: str):
        """
        1. Decrypt with LLM_KEY
        2. Parse JSON envelope (multi-modal support)
        3. Infer
        4. Encrypt with SESSION_KEY
        5. Produce to llm.responses
        """
        # Decrypt
        try:
            plaintext_bytes = self.llm_fernet.decrypt(encrypted_req)
            plaintext = plaintext_bytes.decode('utf-8')
        except Exception:
            raise ValueError("Failed to decrypt request with LLM_KEY")

        # Parse JSON envelope
        try:
            payload = json.loads(plaintext)
            prompt_text = payload.get("text", "")
            media = payload.get("media", [])
        except json.JSONDecodeError:
            # Fallback for backward compatibility with plain text prompts
            prompt_text = plaintext
            media = []

        # Infer
        response_text = self.inference_engine.infer(prompt_text, media=media)

        # Encrypt with SESSION_KEY
        session_fernet = Fernet(session_key.encode())
        encrypted_resp = session_fernet.encrypt(response_text.encode('utf-8'))

        # Produce
        self.kafka_topics["llm.responses"].append(encrypted_resp)
        return encrypted_resp

    def handle_session_end(self):
        self.inference_engine.end_session()
        self.inference_engine.reload()
