import os
import asyncio
import json
import requests
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from bayora.services.benchmark_service.database import db
from bayora.datasets.loaders.common import DatasetLoader

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
SESSION_MANAGER_URL = os.getenv("SESSION_MANAGER_URL", "http://localhost:8000")
RED_TEAM_URL = os.getenv("RED_TEAM_URL", "http://localhost:8003")

loader = DatasetLoader()
kafka_producer = None
active_sessions: dict[str, asyncio.Task] = {}

DOMAIN_DATASET_MAP = {
    "Healthcare": "advbench",
    "Finance": "jailbreakbench",
    "Legal": "advbench",
    "General": "combined",
}

async def emit_progress(session_id: str, event: dict):
    if kafka_producer:
        try:
            event["session_id"] = session_id
            await kafka_producer.send(
                "session.progress",
                json.dumps(event).encode(),
                headers=[("session_id", session_id.encode())],
            )
        except Exception as e:
            print(f"[Benchmark] Failed to emit progress: {e}")

async def end_session_task(session_id: str):
    await asyncio.sleep(5)
    try:
        requests.post(f"{SESSION_MANAGER_URL}/session/end?session_id={session_id}")
        print(f"[Benchmark] Ended session {session_id}")
    except Exception as e:
        print(f"[Benchmark] Failed to end session {session_id}: {e}")

async def monitor_session(session_id: str, total_attacks: int):
    poll_interval = 2
    elapsed = 0
    max_wait = total_attacks * 3 + 120
    while elapsed < max_wait:
        await asyncio.sleep(poll_interval)
        elapsed += poll_interval
        run = db.get_run(session_id)
        if not run:
            continue
        if run["status"] in ("completed", "cancelled", "failed"):
            await emit_progress(session_id, {
                "type": "session_ended",
                "status": run["status"],
                "total_pairs": run.get("total_pairs"),
                "harmful_detected": run.get("harmful_detected"),
                "bypass_rate": run.get("bypass_rate"),
            })
            return
        await emit_progress(session_id, {
            "type": "progress",
            "status": run["status"],
            "attacks_sent": run.get("attacks_sent", 0),
            "responses_received": run.get("responses_received", 0),
            "total_attacks": total_attacks,
        })
    db.cancel_run(session_id)
    await emit_progress(session_id, {
        "type": "session_ended",
        "status": "failed",
        "reason": "timeout",
    })

async def consume_reports():
    global kafka_producer
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
                    await emit_progress(session_id, {
                        "type": "classification_complete",
                        "report": report,
                    })
                    if session_id in active_sessions:
                        active_sessions[session_id].cancel()
                        del active_sessions[session_id]
                    asyncio.create_task(end_session_task(session_id))
            except Exception as e:
                print(f"❌ Error processing benchmark report: {e}")
    finally:
        await consumer.stop()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global kafka_producer
    try:
        kafka_producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BROKER)
        await kafka_producer.start()
    except Exception as e:
        print(f"⚠️ Benchmark Kafka producer failed: {e}")
    task = asyncio.create_task(consume_reports())
    yield
    task.cancel()
    for t in active_sessions.values():
        t.cancel()
    if kafka_producer:
        await kafka_producer.stop()

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DrillRequest(BaseModel):
    drill_name: str
    dataset_name: Optional[str] = None
    strategy: Optional[str] = None
    count: int = 50
    domain: Optional[str] = None

@app.post("/drills/run")
async def run_drill(req: DrillRequest):
    dataset_name = req.dataset_name or DOMAIN_DATASET_MAP.get(req.domain or "General", "combined")
    strategy = req.strategy or "all"

    datasets = loader.list_datasets()
    dataset_info = next((d for d in datasets if d["name"] == dataset_name), None)
    if not dataset_info:
        raise HTTPException(status_code=404, detail=f"Dataset {dataset_name} not found")

    adapter_version = loader.manifest.get("adapters", [{}])[0].get("version", "1.0")

    try:
        session_resp = requests.post(f"{SESSION_MANAGER_URL}/session/start", timeout=10)
        session_id = session_resp.json()["session_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start session: {e}")

    db.create_run(session_id, req.drill_name, dataset_name, dataset_info["version"], adapter_version, total_attacks=req.count)

    await emit_progress(session_id, {
        "type": "drill_started",
        "drill_name": req.drill_name,
        "dataset_name": dataset_name,
        "strategy": strategy,
        "total_attacks": req.count,
    })

    try:
        stream_resp = requests.post(f"{RED_TEAM_URL}/attack/stream", json={
            "session_id": session_id,
            "count": req.count,
            "dataset_name": dataset_name,
            "strategy": strategy,
        }, timeout=5)
        if stream_resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Red team returned {stream_resp.status_code}")
    except requests.ConnectionError:
        raise HTTPException(status_code=503, detail="Red team service unavailable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger red team: {e}")

    monitor_task = asyncio.create_task(monitor_session(session_id, req.count))
    active_sessions[session_id] = monitor_task

    return {"status": "drill_started", "session_id": session_id, "drill_name": req.drill_name, "dataset_name": dataset_name}

@app.get("/drills/{session_id}/status")
async def get_drill_status(session_id: str):
    run = db.get_run(session_id)
    if not run:
        raise HTTPException(status_code=404, detail="Session not found")
    return run

@app.post("/drills/{session_id}/cancel")
async def cancel_drill(session_id: str):
    run = db.get_run(session_id)
    if not run:
        raise HTTPException(status_code=404, detail="Session not found")
    if run["status"] != "running":
        raise HTTPException(status_code=400, detail=f"Session is {run['status']}, not running")

    try:
        requests.post(f"{RED_TEAM_URL}/attack/stop/{session_id}", timeout=5)
    except Exception:
        pass

    try:
        requests.post(f"{SESSION_MANAGER_URL}/session/end?session_id={session_id}", timeout=5)
    except Exception:
        pass

    db.cancel_run(session_id)

    if session_id in active_sessions:
        active_sessions[session_id].cancel()
        del active_sessions[session_id]

    return {"status": "cancelled", "session_id": session_id}

@app.get("/drills/{session_id}/results")
async def get_drill_results(session_id: str):
    run = db.get_run(session_id)
    if not run:
        raise HTTPException(status_code=404, detail="Session not found")
    if run["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Session is {run['status']}. Wait for completion.")
    return run

@app.get("/leaderboard")
async def get_leaderboard():
    return db.get_leaderboard()

@app.get("/datasets")
async def get_datasets():
    return loader.list_datasets()
