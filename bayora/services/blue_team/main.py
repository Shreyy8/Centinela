import os
import ast
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from cryptography.fernet import Fernet
from bayora.ml.classifiers.defense import DefenseClassifier
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
import json
import time

def get_key(env_var):
    key = os.getenv(env_var)
    if not key:
        return Fernet.generate_key()
    return key.encode()

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
BLUE_KEY = get_key("BLUE_KEY")
fernet = Fernet(BLUE_KEY)
classifier = DefenseClassifier()

consumer_task = None
kafka_producer = None

async def consume_blue_evaluations():
    consumer = AIOKafkaConsumer(
        "blue.evaluation",
        bootstrap_servers=KAFKA_BROKER,
        group_id="blue_team_group"
    )
    await consumer.start()
    print("🛡️  Blue Team listening on Kafka topic 'blue.evaluation'...")
    try:
        async for msg in consumer:
            headers = dict(msg.headers) if msg.headers else {}
            session_id = headers.get("session_id", b"Unknown").decode()
            encrypted_bundle = msg.value
            
            try:
                decrypted_bytes = fernet.decrypt(encrypted_bundle)
                responses = ast.literal_eval(decrypted_bytes.decode('utf-8'))
                
                pairs = [("Adversarial Prompt", resp) for resp in responses]
                report = classifier.evaluate_batch(pairs)
                
                print(f"\n[Blue Team] 🚨 Report for session {session_id}:")
                print(f"Total Pairs: {report['summary']['total_pairs']} | Harmful: {report['summary']['harmful_detected']} | Bypass Rate: {report['summary']['bypass_rate']:.2f}")
                
                # Emit per-classification events
                if kafka_producer:
                    for i, detail in enumerate(report.get("details", [])):
                        cls_event = {
                            "session_id": session_id,
                            "type": "classification",
                            "prompt_index": i,
                            "response_snippet": detail.get("response", "")[:200],
                            "is_harmful": detail.get("is_harmful", False),
                            "confidence": detail.get("confidence", 0.0),
                            "category": detail.get("category", "unknown"),
                            "timestamp": time.time_ns(),
                        }
                        await kafka_producer.send(
                            "classifications",
                            json.dumps(cls_event).encode(),
                            headers=[("session_id", session_id.encode())],
                        )

                if kafka_producer:
                    benchmark_msg = {
                        "session_id": session_id,
                        "report": report,
                        "timestamp": time.time_ns(),
                    }
                    await kafka_producer.send_and_wait(
                        "benchmark.reports",
                        json.dumps(benchmark_msg).encode('utf-8'),
                        headers=[("session_id", session_id.encode())]
                    )
            except Exception as e:
                print(f"❌ Failed to process blue evaluation for {session_id}: {e}")
    finally:
        await consumer.stop()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global consumer_task, kafka_producer
    try:
        kafka_producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
        await kafka_producer.start()
        consumer_task = asyncio.create_task(consume_blue_evaluations())
    except Exception as e:
        print(f"⚠️ Failed to start Kafka: {e}")
        
    yield
    
    if kafka_producer:
        await kafka_producer.stop()
    if consumer_task:
        consumer_task.cancel()

app = FastAPI(lifespan=lifespan)

class BatchEvaluationRequest(BaseModel):
    session_id: str
    encrypted_bundle: str

@app.post("/evaluate/batch")
def evaluate_batch(req: BatchEvaluationRequest):
    try:
        decrypted_bytes = fernet.decrypt(req.encrypted_bundle.encode())
        responses = ast.literal_eval(decrypted_bytes.decode('utf-8'))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decrypt bundle: {str(e)}")

    pairs = [("Adversarial Prompt", resp) for resp in responses]
    report = classifier.evaluate_batch(pairs)
    
    return {
        "session_id": req.session_id,
        "report": report
    }
