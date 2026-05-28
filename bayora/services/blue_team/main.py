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

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
BLUE_KEY = os.getenv("BLUE_KEY", Fernet.generate_key().decode())
fernet = Fernet(BLUE_KEY.encode())
classifier = DefenseClassifier() # Uses default organized path

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
                
                # Run evaluation
                pairs = [("Adversarial Prompt", resp) for resp in responses]
                report = classifier.evaluate_batch(pairs)
                
                print(f"\n[Blue Team] 🚨 Report for session {session_id}:")
                print(f"Total Pairs: {report['summary']['total_pairs']} | Harmful: {report['summary']['harmful_detected']} | Bypass Rate: {report['summary']['bypass_rate']:.2f}")
                
                # Publish to benchmark.reports
                if kafka_producer:
                    benchmark_msg = {
                        "session_id": session_id,
                        "report": report,
                        "timestamp": asyncio.get_event_loop().time() # Or real time
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

# HTTP fallback for the mock demo
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
