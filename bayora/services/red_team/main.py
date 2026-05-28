import os
import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from cryptography.fernet import Fernet
from bayora.ml.attack_generators.engine import AdversarialPromptEngine
from bayora.datasets.loaders.common import get_combined_dataset, DatasetLoader
from aiokafka import AIOKafkaProducer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
RED_KEY = os.getenv("RED_KEY", Fernet.generate_key().decode())
fernet = Fernet(RED_KEY.encode())

engine = AdversarialPromptEngine()
kafka_producer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global kafka_producer
    try:
        kafka_producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
        await kafka_producer.start()
        print("✅ Red Team Engine connected to Kafka")
    except Exception as e:
        print(f"⚠️ Could not connect to Kafka: {e}")
        kafka_producer = None
    
    yield
    
    if kafka_producer:
        await kafka_producer.stop()

app = FastAPI(lifespan=lifespan)

class StreamRequest(BaseModel):
    session_id: str
    count: int = 1000
    dataset_name: Optional[str] = None
    strategy: Optional[str] = None

async def stream_attacks_task(session_id: str, count: int, dataset_name: str = None, strategy_override: str = None):
    print(f"🚀 [Red Team] Starting active adversarial stream for session {session_id} ({count} prompts, Dataset: {dataset_name})")
    
    loader = DatasetLoader()
    if dataset_name:
        dataset = loader.load_dataset(dataset_name)
    else:
        dataset = get_combined_dataset()
        
    base_prompts = [item["prompt"] for item in dataset]
    if not base_prompts:
        print(f"⚠️ [Red Team] No prompts found for dataset {dataset_name}. Aborting.")
        return
    
    strategies = ["direct", "jailbreak", "roleplay", "pair", "gcg"]
    
    sent_count = 0
    while sent_count < count:
        # Generate a small batch to stream iteratively
        batch_size = min(10, count - sent_count) # Smaller batch for expensive PAIR
        
        # Determine strategy
        if strategy_override:
            strategy = strategy_override
        else:
            # Cycle through attack strategies to test different Blue Team defense vectors
            strategy = strategies[(sent_count // 50) % len(strategies)]
        
        if strategy == "pair":
            mutated_prompts = await engine.generate_batch_async(base_prompts, strategy, batch_size)
        else:
            mutated_prompts = engine.generate_batch(base_prompts, strategy, batch_size)
        
        for p in mutated_prompts:
            # Wrap in JSON envelope for multi-modal support
            payload = {
                "text": p,
                "media": [] # Placeholder for future image/audio attacks
            }
            payload_json = json.dumps(payload)
            encrypted_payload = fernet.encrypt(payload_json.encode())
            
            if kafka_producer:
                await kafka_producer.send_and_wait(
                    "red.prompts",
                    encrypted_payload,
                    headers=[("session_id", session_id.encode())]
                )
            sent_count += 1
            
        print(f"🌊 [Red Team] Streamed {sent_count}/{count} attacks (Strategy: {strategy})...")
        await asyncio.sleep(0.5) # Simulate human/distributed pacing
        
    print(f"🏁 [Red Team] Finished streaming {count} attacks for session {session_id}")

class GenerateRequest(BaseModel):
    strategy: str
    count: int = 10
    session_id: str

@app.post("/attack/generate")
async def generate_attacks(req: GenerateRequest):
    dataset = get_combined_dataset()
    base_prompts = [item["prompt"] for item in dataset]
    
    if req.strategy == "pair":
        mutated_prompts = await engine.generate_batch_async(base_prompts, req.strategy, req.count)
    else:
        mutated_prompts = engine.generate_batch(base_prompts, req.strategy, req.count)
    
    encrypted_prompts = []
    for p in mutated_prompts:
        payload = {"text": p, "media": []}
        payload_json = json.dumps(payload)
        encrypted_prompts.append(fernet.encrypt(payload_json.encode()).decode())
        
    return {
        "session_id": req.session_id,
        "strategy": req.strategy,
        "prompts": encrypted_prompts
    }

@app.post("/attack/stream")
async def stream_attacks(req: StreamRequest, background_tasks: BackgroundTasks):
    if not kafka_producer:
        raise HTTPException(status_code=503, detail="Kafka producer not initialized")
    
    # 5. Active Red Team Engine: Offload to a background task so it continuously
    # streams thousands of attacks into the Kafka bus without blocking the HTTP thread
    background_tasks.add_task(
        stream_attacks_task, 
        req.session_id, 
        req.count, 
        dataset_name=req.dataset_name, 
        strategy_override=req.strategy
    )
    return {
        "status": "streaming_started", 
        "session_id": req.session_id, 
        "target_count": req.count,
        "message": f"Background engine is streaming {req.count} attacks to Kafka topic 'red.prompts'."
    }
