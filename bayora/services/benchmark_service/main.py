import os
import asyncio
import json
import requests
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
from aiokafka import AIOKafkaConsumer
from bayora.services.benchmark_service.database import db
from bayora.datasets.loaders.common import DatasetLoader

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
SESSION_MANAGER_URL = os.getenv("SESSION_MANAGER_URL", "http://localhost:8000")
RED_TEAM_URL = os.getenv("RED_TEAM_URL", "http://localhost:8001")

loader = DatasetLoader()

async def consume_reports():
    consumer = AIOKafkaConsumer(
        "benchmark.reports",
        bootstrap_servers=KAFKA_BROKER,
        group_id="benchmark_service_group"
    )
    await consumer.start()
    print("🚀 Benchmark Service listening to benchmark.reports...")
    try:
        async for msg in consumer:
            try:
                data = json.loads(msg.value.decode())
                session_id = data.get("session_id")
                report = data.get("report")
                if session_id and report:
                    db.update_run(session_id, report)
                    print(f"✅ Benchmark recorded for session {session_id}")
            except Exception as e:
                print(f"❌ Error processing benchmark report: {e}")
    finally:
        await consumer.stop()

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(consume_reports())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)

class DrillRequest(BaseModel):
    drill_name: str
    dataset_name: str
    strategy: str = "direct"
    count: int = 50

@app.post("/drills/run")
async def run_drill(req: DrillRequest, background_tasks: BackgroundTasks):
    # 1. Identify versions
    datasets = loader.list_datasets()
    dataset_info = next((d for d in datasets if d["name"] == req.dataset_name), None)
    if not dataset_info:
        raise HTTPException(status_code=404, detail=f"Dataset {req.dataset_name} not found")
    
    # Mock adapter version (in reality, read from blue_agent_lora/manifest.json)
    adapter_version = loader.manifest.get("adapters", [{}])[0].get("version", "1.0")

    # 2. Start Session
    try:
        session_resp = requests.post(f"{SESSION_MANAGER_URL}/session/start")
        session_id = session_resp.json()["session_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start session: {e}")

    # 3. Create pending run in DB
    db.create_run(session_id, req.drill_name, req.dataset_name, dataset_info["version"], adapter_version)

    # 4. Trigger Red Team
    try:
        requests.post(f"{RED_TEAM_URL}/attack/stream", json={
            "session_id": session_id,
            "count": req.count,
            "dataset_name": req.dataset_name,
            "strategy": req.strategy
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger red team: {e}")

    return {"status": "drill_started", "session_id": session_id, "drill_name": req.drill_name}

@app.get("/leaderboard")
async def get_leaderboard():
    return db.get_leaderboard()

@app.get("/datasets")
async def get_datasets():
    return loader.list_datasets()
