import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timezone

class BenchmarkDatabase:
    def __init__(self):
        self.host = os.getenv("POSTGRES_HOST", "localhost")
        self.port = os.getenv("POSTGRES_PORT", "5432")
        self.user = os.getenv("POSTGRES_USER", "bayora")
        self.password = os.getenv("POSTGRES_PASSWORD", "bayora_password")
        self.dbname = os.getenv("POSTGRES_DB", "bayora_benchmark")
        self.conn = None
        self._init_db()

    def _init_db(self):
        try:
            tmp_conn = psycopg2.connect(host=self.host, port=self.port, user=self.user, password=self.password, dbname="postgres")
            tmp_conn.autocommit = True
            with tmp_conn.cursor() as cur:
                cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{self.dbname}'")
                if not cur.fetchone():
                    cur.execute(f"CREATE DATABASE {self.dbname}")
            tmp_conn.close()

            self.conn = psycopg2.connect(host=self.host, port=self.port, user=self.user, password=self.password, dbname=self.dbname)
            self.conn.autocommit = True
            with self.conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS benchmark_runs (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(255) NOT NULL UNIQUE,
                        drill_name VARCHAR(255),
                        dataset_name VARCHAR(255),
                        dataset_version VARCHAR(50),
                        adapter_version VARCHAR(50),
                        total_attacks INTEGER DEFAULT 0,
                        attacks_sent INTEGER DEFAULT 0,
                        responses_received INTEGER DEFAULT 0,
                        total_pairs INTEGER,
                        harmful_detected INTEGER,
                        bypass_rate FLOAT,
                        status VARCHAR(50) DEFAULT 'pending',
                        report JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP
                    );
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_benchmark_runs_session_id ON benchmark_runs(session_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_benchmark_runs_status ON benchmark_runs(status);
                """)
            print("✅ Benchmark Database initialized.")
        except Exception as e:
            print(f"⚠️ Benchmark DB Init Error: {e}")

    def create_run(self, session_id, drill_name, dataset_name, dataset_version, adapter_version, total_attacks=0):
        if not self.conn: return None
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO benchmark_runs (session_id, drill_name, dataset_name, dataset_version, adapter_version, total_attacks, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, 'running', %s)
                ON CONFLICT (session_id) DO UPDATE SET status = 'running'
                RETURNING id;
            """, (session_id, drill_name, dataset_name, dataset_version, adapter_version, total_attacks, datetime.now(timezone.utc)))
            row = cur.fetchone()
            return row[0] if row else None

    def update_progress(self, session_id, attacks_sent=None, responses_received=None):
        if not self.conn: return
        sets = []
        params = []
        if attacks_sent is not None:
            sets.append("attacks_sent = %s")
            params.append(attacks_sent)
        if responses_received is not None:
            sets.append("responses_received = %s")
            params.append(responses_received)
        if not sets:
            return
        params.append(session_id)
        with self.conn.cursor() as cur:
            cur.execute(f"UPDATE benchmark_runs SET {', '.join(sets)} WHERE session_id = %s", tuple(params))

    def update_run(self, session_id, report):
        if not self.conn: return
        summary = report.get("summary", {})
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE benchmark_runs 
                SET total_pairs = %s, harmful_detected = %s, bypass_rate = %s,
                    status = 'completed', report = %s::jsonb, completed_at = %s
                WHERE session_id = %s;
            """, (
                summary.get("total_pairs"),
                summary.get("harmful_detected"),
                summary.get("bypass_rate"),
                json.dumps(report),
                datetime.now(timezone.utc),
                session_id,
            ))

    def cancel_run(self, session_id):
        if not self.conn: return
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE benchmark_runs SET status = 'cancelled', completed_at = %s
                WHERE session_id = %s AND status = 'running';
            """, (datetime.now(timezone.utc), session_id))

    def get_run(self, session_id):
        if not self.conn: return None
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM benchmark_runs WHERE session_id = %s", (session_id,))
            row = cur.fetchone()
            if row:
                row["created_at"] = str(row["created_at"]) if row.get("created_at") else None
                row["completed_at"] = str(row["completed_at"]) if row.get("completed_at") else None
            return dict(row) if row else None

    def get_runs_by_user(self, user_email, limit=20):
        if not self.conn: return []
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM benchmark_runs
                WHERE drill_name LIKE %s
                ORDER BY created_at DESC LIMIT %s
            """, (f"%{user_email}%", limit))
            rows = cur.fetchall()
            result = []
            for row in rows:
                d = dict(row)
                d["created_at"] = str(d["created_at"]) if d.get("created_at") else None
                d["completed_at"] = str(d["completed_at"]) if d.get("completed_at") else None
                result.append(d)
            return result

    def get_leaderboard(self):
        if not self.conn: return []
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT adapter_version, AVG(bypass_rate) as avg_bypass_rate, COUNT(*) as run_count
                FROM benchmark_runs 
                WHERE status = 'completed'
                GROUP BY adapter_version
                ORDER BY avg_bypass_rate ASC;
            """)
            return list(cur.fetchall())

db = BenchmarkDatabase()
