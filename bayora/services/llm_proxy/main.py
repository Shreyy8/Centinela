import os
import asyncio
from dotenv import load_dotenv
load_dotenv() # Load from .env file

from fastapi import FastAPI, HTTPException
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
            session_id = headers.get("session_id", b"").decode()
            session_key = headers.get("session_key", b"").decode()
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
                    print(f"❌ Error processing message: {e}")
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

# HTTP Fallback/Mock endpoints are kept for the original integration_demo.py fallback
from pydantic import BaseModel
class LLMRequest(BaseModel):
    session_id: str
    session_key: str
    encrypted_prompt: str

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
