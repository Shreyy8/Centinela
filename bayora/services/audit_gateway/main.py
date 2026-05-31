import os
import json
import asyncio
import jwt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from aiokafka import AIOKafkaConsumer
from collections import defaultdict

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
JWT_ALGORITHM = "HS256"
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")

sessions: dict[str, set[WebSocket]] = defaultdict(set)


async def broadcast(session_id: str, event: dict):
    payload = json.dumps(event)
    dead = set()
    for ws in sessions.get(session_id, set()):
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    sessions[session_id] -= dead


async def consume_audit_events():
    while True:
        try:
            consumer = AIOKafkaConsumer(
                "audit.events", "classifications", "session.progress",
                bootstrap_servers=KAFKA_BROKER,
                group_id="audit_gateway_group",
            )
            await consumer.start()
            try:
                async for msg in consumer:
                    try:
                        event = json.loads(msg.value.decode())
                        session_id = event.get("session_id") or event.get("sessionId")
                        if session_id and session_id in sessions:
                            topic_map = {
                                "audit.events": "audit",
                                "classifications": "classification",
                                "session.progress": "progress",
                            }
                            await broadcast(session_id, {
                                "type": topic_map.get(msg.topic, msg.topic),
                                "data": event,
                                "timestamp": event.get("timestamp"),
                            })
                            if msg.topic == "session.progress" and event.get("status") in ("completed", "failed"):
                                dead = sessions.pop(session_id, set())
                                for ws in dead:
                                    try:
                                        await ws.close()
                                    except Exception:
                                        pass
                    except Exception as e:
                        print(f"[Audit Gateway] Error processing message: {e}")
            finally:
                await consumer.stop()
        except Exception as e:
            print(f"[Audit Gateway] Kafka unavailable ({e}), retrying in 5s")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(consume_audit_events())
    yield
    task.cancel()
    for s in list(sessions.values()):
        for ws in s:
            try:
                await ws.close()
            except Exception:
                pass
    sessions.clear()


app = FastAPI(title="Centinela Audit Gateway", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_email = payload.get("sub")
        if not user_email:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await websocket.accept()
    sessions[session_id].add(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "session_id": session_id,
            "user": user_email,
        }))
        while True:
            msg = await websocket.receive_text()
            try:
                data = json.loads(msg)
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        sessions[session_id].discard(websocket)
        if not sessions[session_id]:
            del sessions[session_id]
