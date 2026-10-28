import os
import asyncio
from dotenv import load_dotenv
load_dotenv() # Load from .env file

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from cryptography.fernet import Fernet
from bayora.services.llm_proxy.inference import SandboxedInference
from bayora.services.llm_proxy.bus import LLMProxyBus
from contextlib import asynccontextmanager
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
inference_engine = SandboxedInference()
proxy_bus = LLMProxyBus(inference_engine)

consumer_task = None
producer = None

async def consume_llm_requests():
    consumer = AIOKafkaConsumer(
        "llm.requests",
        bootstrap_servers=KAFKA_BROKER,
        group_id="llm_proxy_group"
    )
    await consumer.start()
    print("🚀 LLM Proxy listening on Kafka topic 'llm.requests'...")
    try:
        async for msg in consumer:
            headers = dict(msg.headers) if msg.headers else {}
            
            raw_sid = headers.get("session_id") or headers.get(b"session_id", b"")
            session_id = raw_sid.decode() if isinstance(raw_sid, bytes) else str(raw_sid)

            # Decrypt session key if encrypted with LLM_KEY (Task 1.6 envelope)
            session_key = None
            if "session_key_enc" in headers or b"session_key_enc" in headers:
                enc_raw = headers.get("session_key_enc") or headers.get(b"session_key_enc")
                try:
                    session_key = proxy_bus.llm_fernet.decrypt(enc_raw).decode()
                except Exception as e:
                    print(f"❌ Failed to decrypt session_key_enc: {e}")
            elif "session_key" in headers or b"session_key" in headers:
                raw_k = headers.get("session_key") or headers.get(b"session_key")
                session_key = raw_k.decode() if isinstance(raw_k, bytes) else raw_k

            encrypted_payload = msg.value

            if session_id and session_key:
                try:
                    encrypted_resp = proxy_bus.process_request(encrypted_payload, session_key)
                    if producer:
                        await producer.send_and_wait(
                            "llm.responses", 
                            encrypted_resp,
                            headers=[("session_id", session_id.encode())]
                        )
                    print(f"✅ Processed request for session {session_id}")
                except Exception as e:
                    print(f"❌ Error processing message for {session_id}: {e}")
            else:
                print(f"⚠️ [LLM Proxy] Dropping message: session_id='{session_id}', has_key={bool(session_key)}")
    finally:
        await consumer.stop()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global producer, consumer_task
    try:
        producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
        await producer.start()
        consumer_task = asyncio.create_task(consume_llm_requests())
    except Exception as e:
        print(f"⚠️ Could not connect to Kafka: {e}. Running in HTTP mock mode only.")
        
    yield
    
    if producer:
        await producer.stop()
    if consumer_task:
        consumer_task.cancel()

app = FastAPI(lifespan=lifespan)

class LLMRequest(BaseModel):
    session_id: str
    session_key: str
    encrypted_prompt: str

class APIKeyConfig(BaseModel):
    api_key: str
    model_id: Optional[str] = "gemini-1.5-flash"

@app.post("/llm/infer")
def infer(req: LLMRequest):
    try:
        encrypted_response = proxy_bus.process_request(
            req.encrypted_prompt.encode(), 
            req.session_key
        )
        return {"encrypted_response": encrypted_response.decode()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/llm/session/end")
def end_session():
    proxy_bus.handle_session_end()
    return {"status": "memory_cleared"}

@app.post("/llm/config/api-key")
def configure_api_key(config: APIKeyConfig):
    """Dynamically set Gemini API key without restarting container."""
    success = inference_engine.set_api_key(config.api_key, config.model_id)
    if success:
        os.environ["GOOGLE_API_KEY"] = config.api_key
    else:
        os.environ.pop("GOOGLE_API_KEY", None)
    return {
        "status": "configured" if success else "failed",
        "model": inference_engine.model_id,
        "active_engine": "gemini" if inference_engine.gemini_model else "simulator"
    }

@app.get("/llm/status")
def get_status():
    return {
        "engine": "gemini" if inference_engine.gemini_model else ("vllm" if inference_engine.llm_engine else "simulator"),
        "model_id": inference_engine.model_id,
        "mock_mode": os.getenv("MOCK_LLM") == "1",
        "has_api_key": bool(os.getenv("GOOGLE_API_KEY"))
    }
