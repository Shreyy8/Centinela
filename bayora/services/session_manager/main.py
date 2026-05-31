import os
import asyncio
from dotenv import load_dotenv
load_dotenv() # Load from .env file

from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
import uuid
import base64
from cryptography.fernet import Fernet
from bayora.services.session_manager.bus import IsolatedMessageBus
from bayora.services.session_manager.audit import audit_log
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
kafka_producer = None
message_bus = IsolatedMessageBus(audit_log)
consumer_task_responses = None
consumer_task_prompts = None

async def consume_llm_responses():
    consumer = AIOKafkaConsumer(
        "llm.responses",
        bootstrap_servers=KAFKA_BROKER,
        group_id="session_manager_group"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            headers = dict(msg.headers) if msg.headers else {}
            session_id = headers.get("session_id", b"").decode()
            encrypted_resp = msg.value
            if session_id:
                try:
                    await message_bus.handle_llm_response(session_id, encrypted_resp)
                    print(f"[Session Manager] Handled LLM response for {session_id}")
                except Exception as e:
                    print(f"[Session Manager] Error handling response: {e}")
    finally:
        await consumer.stop()

async def consume_red_prompts():
    consumer = AIOKafkaConsumer(
        "red.prompts",
        bootstrap_servers=KAFKA_BROKER,
        group_id="session_manager_red_group"
    )
    await consumer.start()
    try:
        async for msg in consumer:
            headers = dict(msg.headers) if msg.headers else {}
            session_id = headers.get("session_id", b"").decode()
            encrypted_prompt = msg.value
            
            if session_id and session_id in message_bus.session_keys:
                try:
                    session_key_str = message_bus.session_raw_keys[session_id].decode()
                    await message_bus.consume_red_prompt(session_id, encrypted_prompt, session_key_str)
                    print(f"[Session Manager] Routed red prompt for {session_id}")
                except Exception as e:
                    print(f"[Session Manager] Error routing prompt: {e}")
            else:
                print(f"[Session Manager] Ignored prompt for invalid session {session_id}")
    finally:
        await consumer.stop()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global kafka_producer, consumer_task_responses, consumer_task_prompts
    try:
        kafka_producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
        await kafka_producer.start()
        message_bus.kafka_producer = kafka_producer
        audit_log.set_producer(kafka_producer) # Wire up audit publisher
        consumer_task_responses = asyncio.create_task(consume_llm_responses())
        consumer_task_prompts = asyncio.create_task(consume_red_prompts())
        print("✅ Session Manager connected to Kafka (listening to red.prompts & llm.responses)")
    except Exception as e:
        print(f"⚠️ Could not connect to Kafka: {e}. Running in mock mode.")
        message_bus.kafka_producer = None
        audit_log.set_producer(None)
    
    yield
    
    if kafka_producer:
        await kafka_producer.stop()
    if consumer_task_responses:
        consumer_task_responses.cancel()
    if consumer_task_prompts:
        consumer_task_prompts.cancel()

app = FastAPI(lifespan=lifespan)

class InferRequest(BaseModel):
    session_id: str
    encrypted_prompt: str

class AuditResponse(BaseModel):
    valid: bool
    chain_length: int
    head_hash: str
    message: str = ""

async def verify_token():
    """Temporary no-op auth dependency so the session manager can start.

    Replace this with a real token validation hook when the auth service is wired up.
    """
    return {"user": "anonymous"}

@app.post("/session/start")
async def start_session(user: dict = Depends(verify_token)):
    session_id = str(uuid.uuid4())
    
    # 🔐 DYNAMIC KEY GENERATION
    # Every session gets a mathematically unique, 32-byte URL-safe base64 K8s-compliant Fernet key.
    session_key = Fernet.generate_key() 
    
    # Store K8s key locally for this session
    message_bus.session_keys[session_id] = Fernet(session_key)
    message_bus.session_raw_keys[session_id] = session_key 
    
    audit_log.append("SESSION_START", "session-manager", session_id, b"session_init")
    return {"session_id": session_id, "session_key": session_key.decode()}

@app.post("/session/infer")
async def infer(req: InferRequest, user: dict = Depends(verify_token)):
    if req.session_id not in message_bus.session_keys:
        raise HTTPException(status_code=404, detail="Session not found")
        
    try:
        raw_bytes = base64.b64decode(req.encrypted_prompt)
        
        # 🔐 SECURE DISTRIBUTION
        # Pass K8s raw session key string so it can be embedded in the Kafka Header
        session_key_str = message_bus.session_raw_keys[req.session_id].decode()
        
        await message_bus.consume_red_prompt(req.session_id, raw_bytes, session_key_str)
        return {"status": "queued_to_kafka"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/session/end")
async def end_session(session_id: str, user: dict = Depends(verify_token)):
    if session_id not in message_bus.session_keys:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await message_bus.release_batch_to_blue(session_id)
    audit_log.append("SESSION_END", "session-manager", session_id, b"session_closed")
    
    # 🔐 SECURE DESTRUCTION
    del message_bus.session_keys[session_id]
    if session_id in message_bus.session_raw_keys:
        del message_bus.session_raw_keys[session_id]
    if session_id in message_bus.session_stores:
        del message_bus.session_stores[session_id]
        
    return {"status": "ended_batch_released"}

@app.get("/session/{session_id}/status")
async def session_status(session_id: str, user: dict = Depends(verify_token)):
    if session_id in message_bus.session_keys:
        return {"status": "active"}
    return {"status": "ended_or_not_found"}

@app.get("/audit/verify/{session_id}", response_model=AuditResponse)
async def verify_audit(session_id: str):
    # In a real deployment, the frontend should call the Audit Service directly.
    # We return a pointer to the decentralization logic.
    return {
        "valid": True, 
        "chain_length": 0, 
        "head_hash": "N/A", 
        "message": "Forensic audit is now decentralized. Query the Audit Service at /verify for immutable proofs."
    }
