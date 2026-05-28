import os
import asyncio
import json
from dotenv import load_dotenv
load_dotenv() # Load from .env file

import hashlib
import time
import psycopg2
from psycopg2.extras import RealDictCursor
import threading
from fastapi import FastAPI
from aiokafka import AIOKafkaConsumer

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")

class TamperEvidentLedger:
    def __init__(self):
        self.db_host = os.getenv("POSTGRES_HOST", "localhost")
        self.db_port = os.getenv("POSTGRES_PORT", "5432")
        self.db_user = os.getenv("POSTGRES_USER", "bayora")
        self.db_pass = os.getenv("POSTGRES_PASSWORD", "bayora_password")
        self.db_name = os.getenv("POSTGRES_DB", "bayora_audit")
        
        self.conn = None
        self.lock = threading.Lock()
        self._head_hash = hashlib.sha256(b"genesis").hexdigest()
        self.chain = [] # fallback memory chain
        
        self._init_db()

    def _init_db(self):
        try:
            self.conn = psycopg2.connect(
                host=self.db_host,
                port=self.db_port,
                user=self.db_user,
                password=self.db_pass,
                dbname=self.db_name
            )
            self.conn.autocommit = True
            
            with self.conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS audit_entries (
                        id SERIAL PRIMARY KEY,
                        event_type VARCHAR(255) NOT NULL,
                        source_namespace VARCHAR(255) NOT NULL,
                        session_id VARCHAR(255) NOT NULL,
                        payload_hash VARCHAR(64) NOT NULL,
                        timestamp_ns BIGINT NOT NULL,
                        prev_hash VARCHAR(64) NOT NULL,
                        entry_hash VARCHAR(64) NOT NULL
                    );
                """)
                cur.execute("SELECT entry_hash FROM audit_entries ORDER BY id DESC LIMIT 1;")
                row = cur.fetchone()
                if row:
                    self._head_hash = row[0]
                    print(f"✅ Audit Service recovered from DB. Head hash: {self._head_hash[:8]}...")
        except Exception as e:
            print(f"⚠️ Could not connect to PostgreSQL: {e}. Falling back to in-memory mode.")
            self.conn = None

    def append(self, event_type: str, source_ns: str, session_id: str, payload_hash: str):
        # Note: We receive the hash from session-manager, not the raw payload
        timestamp_ns = time.time_ns()
        
        with self.lock:
            entry = {
                "event_type": event_type,
                "source_namespace": source_ns,
                "session_id": session_id,
                "payload_hash": payload_hash,
                "timestamp_ns": timestamp_ns,
                "prev_hash": self._head_hash
            }
            
            entry_str = json.dumps(entry, sort_keys=True).encode("utf-8")
            entry_hash = hashlib.sha256(entry_str).hexdigest()
            entry["entry_hash"] = entry_hash
            
            if self.conn:
                try:
                    with self.conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO audit_entries 
                            (event_type, source_namespace, session_id, payload_hash, timestamp_ns, prev_hash, entry_hash)
                            VALUES (%(event_type)s, %(source_namespace)s, %(session_id)s, %(payload_hash)s, %(timestamp_ns)s, %(prev_hash)s, %(entry_hash)s)
                        """, entry)
                except Exception as e:
                    print(f"❌ Failed to persist audit log entry: {e}")
            else:
                self.chain.append(entry)
                
            self._head_hash = entry_hash
            return entry

    def verify(self):
        current_prev = hashlib.sha256(b"genesis").hexdigest()
        chain_length = 0
        
        with self.lock:
            if self.conn:
                try:
                    with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("SELECT * FROM audit_entries ORDER BY id ASC;")
                        for row in cur:
                            entry = {
                                "event_type": row["event_type"],
                                "source_namespace": row["source_namespace"],
                                "session_id": row["session_id"],
                                "payload_hash": row["payload_hash"],
                                "timestamp_ns": row["timestamp_ns"],
                                "prev_hash": row["prev_hash"]
                            }
                            if entry["prev_hash"] != current_prev:
                                return False, chain_length, current_prev
                                
                            entry_str = json.dumps(entry, sort_keys=True).encode("utf-8")
                            recomputed_hash = hashlib.sha256(entry_str).hexdigest()
                            
                            if recomputed_hash != row["entry_hash"]:
                                return False, chain_length, current_prev
                                
                            current_prev = recomputed_hash
                            chain_length += 1
                            
                    return True, chain_length, current_prev
                except Exception as e:
                    print(f"❌ Database error during verify: {e}")
                    return False, 0, current_prev
            else:
                for entry in self.chain:
                    if entry["prev_hash"] != current_prev:
                        return False, chain_length, current_prev
                    
                    entry_copy = {k: v for k, v in entry.items() if k != "entry_hash"}
                    entry_str = json.dumps(entry_copy, sort_keys=True).encode("utf-8")
                    recomputed_hash = hashlib.sha256(entry_str).hexdigest()
                    
                    if recomputed_hash != entry["entry_hash"]:
                        return False, chain_length, current_prev
                        
                    current_prev = recomputed_hash
                    chain_length += 1
                    
                return True, chain_length, current_prev

ledger = TamperEvidentLedger()
app = FastAPI()

@app.get("/verify")
async def verify_audit():
    valid, length, head = ledger.verify()
    return {"valid": valid, "chain_length": length, "head_hash": head}

async def consume_audit_events():
    consumer = AIOKafkaConsumer(
        "audit.events",
        bootstrap_servers=KAFKA_BROKER,
        group_id="audit_service_group"
    )
    await consumer.start()
    print("✅ Audit Service listening to audit.events...")
    try:
        async for msg in consumer:
            try:
                event = json.loads(msg.value.decode())
                ledger.append(
                    event["event_type"],
                    event["source_namespace"],
                    event["session_id"],
                    event["payload_hash"]
                )
                print(f"[Audit Service] Logged {event['event_type']} for {event['session_id']}")
            except Exception as e:
                print(f"[Audit Service] Error processing event: {e}")
    finally:
        await consumer.stop()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(consume_audit_events())
