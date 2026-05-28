import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor

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
            # Create DB if not exists (requires connecting to default 'postgres' first)
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
                        session_id VARCHAR(255) NOT NULL,
                        drill_name VARCHAR(255),
                        dataset_name VARCHAR(255),
                        dataset_version VARCHAR(50),
                        adapter_version VARCHAR(50),
                        total_pairs INTEGER,
                        harmful_detected INTEGER,
                        bypass_rate FLOAT,
                        status VARCHAR(50) DEFAULT 'pending',
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            print("✅ Benchmark Database initialized.")
        except Exception as e:
            print(f"⚠️ Benchmark DB Init Error: {e}")

    def create_run(self, session_id, drill_name, dataset_name, dataset_version, adapter_version):
        if not self.conn: return
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO benchmark_runs (session_id, drill_name, dataset_name, dataset_version, adapter_version)
                VALUES (%s, %s, %s, %s, %s) RETURNING id;
            """, (session_id, drill_name, dataset_name, dataset_version, adapter_version))
            return cur.fetchone()[0]

    def update_run(self, session_id, report):
        if not self.conn: return
        summary = report.get("summary", {})
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE benchmark_runs 
                SET total_pairs = %s, harmful_detected = %s, bypass_rate = %s, status = 'completed'
                WHERE session_id = %s;
            """, (summary.get("total_pairs"), summary.get("harmful_detected"), summary.get("bypass_rate"), session_id))

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
