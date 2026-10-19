import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Activity,
  Search,
  Pause,
  Square,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { api, WS_URL, IS_DEMO_MODE } from "@/lib/api";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/app/audit")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Live Audit Telemetry" },
      {
        name: "description",
        content: "Live attack feed and resilience telemetry for the active security audit.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
  component: LiveAuditPage,
});

type Sev = "CRITICAL" | "HIGH" | "PASS";

interface AuditEvent {
  type: string;
  data?: any;
  timestamp?: number;
}

interface FeedEntry {
  sev: Sev;
  category: string;
  payload: string;
  ts: string;
}

interface AuditStats {
  total_attacks: number;
  attacks_sent: number;
  responses_received: number;
  total_pairs?: number;
  harmful_detected?: number;
  bypass_rate?: number;
  status: string;
}

function LiveAuditPage() {
  const navigate = useNavigate();
  const { session_id } = Route.useSearch();
  const [feed, setFeed] = React.useState<FeedEntry[]>([]);
  const [filterCategory, setFilterCategory] = React.useState<string>("ALL");
  const [searchFilter, setSearchFilter] = React.useState<string>("");
  const [stats, setStats] = React.useState<AuditStats>({
    total_attacks: 0,
    attacks_sent: 0,
    responses_received: 0,
    status: "disconnected",
  });
  const [wsStatus, setWsStatus] = React.useState<"connecting" | "connected" | "disconnected">(
    "disconnected",
  );
  const [chartData, setChartData] = React.useState({
    passing: 0,
    failing: 0,
    critical: 0,
    high: 0,
  });
  const [riskData, setRiskData] = React.useState<
    Record<string, { count: number; harmful: number }>
  >({});
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connectWs = React.useCallback(() => {
    if (!session_id) return;
    setWsStatus("connecting");

    const token = localStorage.getItem("token") || "demo_token";
    const ws = new WebSocket(`${WS_URL}/ws/${session_id}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");
    ws.onclose = () => {
      setWsStatus("disconnected");
      reconnectTimer.current = setTimeout(connectWs, 3000);
    };
    ws.onerror = () => setWsStatus("disconnected");

    ws.onmessage = (event) => {
      try {
        const msg: AuditEvent = JSON.parse(event.data);
        if (msg.type === "pong" || msg.type === "connected") return;

        if (msg.type === "classification" && msg.data) {
          const d = msg.data;
          const sev: Sev = d.is_harmful ? "CRITICAL" : "PASS";
          const ts = new Date((d.timestamp || Date.now()) / 1000000).toLocaleTimeString();
          setFeed((prev) => [
            {
              sev,
              category: d.category || "General",
              payload: d.response_snippet?.slice(0, 80) || d.payload || "",
              ts,
            },
            ...prev.slice(0, 200),
          ]);
          setChartData((prev) => ({
            ...prev,
            passing: d.is_harmful ? prev.passing : prev.passing + 1,
            failing: d.is_harmful ? prev.failing + 1 : prev.failing,
            critical: d.is_harmful ? prev.critical + 1 : prev.critical,
            high: !d.is_harmful ? prev.high : prev.high,
          }));
          setRiskData((prev) => {
            const cat = d.category || "General";
            const current = prev[cat] || { count: 0, harmful: 0 };
            return {
              ...prev,
              [cat]: {
                count: current.count + 1,
                harmful: current.harmful + (d.is_harmful ? 1 : 0),
              },
            };
          });
        }

        if (msg.type === "progress" && msg.data) {
          setStats((prev) => ({ ...prev, ...msg.data }));
        }

        if (msg.type === "audit" && msg.data) {
          const d = msg.data;
          if (d.event_type === "PROMPT_SENT") {
            setStats((prev) => ({ ...prev, attacks_sent: prev.attacks_sent + 1 }));
          }
          if (d.event_type === "RESPONSE_RECEIVED") {
            setStats((prev) => ({ ...prev, responses_received: prev.responses_received + 1 }));
          }
        }
      } catch {
        // ignore malformed message
      }
    };

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 30000);
    ws.addEventListener("close", () => clearInterval(interval));
  }, [session_id]);

  React.useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  const totalEval = chartData.passing + chartData.failing || 1;
  const resilience = Math.round((chartData.passing / totalEval) * 100);
  const criticalPct = Math.round((chartData.critical / totalEval) * 100);
  const highPct = Math.round((chartData.high / totalEval) * 100);
  const safePct = Math.round((chartData.passing / totalEval) * 100);

  const handleStop = async () => {
    if (!session_id) return;
    try {
      await api.post(`/drills/${session_id}/cancel`, {}, "http://localhost:8006");
      wsRef.current?.close();
    } catch {
      // ignore
    }
  };

  // If no session_id is provided, show clean empty state
  if (!session_id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 text-white/50 mb-4">
          <Terminal className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-white">No Active Audit Session</h2>
        <p className="mt-2 text-xs text-white/50 leading-relaxed">
          Select or launch an adversarial red-team drill to view real-time WebSocket telemetry and
          threat classifications.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to={appRoute("config")}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
          >
            Configure New Audit
          </Link>
          <Link
            to={appRoute("audit")}
            search={{ session_id: "default_audit" } as any}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white hover:bg-white/[0.08]"
          >
            Load Sample Drill
          </Link>
        </div>
      </div>
    );
  }

  const filteredFeed = feed.filter((entry) => {
    const matchesCat = filterCategory === "ALL" || entry.category === filterCategory;
    const matchesSearch =
      !searchFilter ||
      entry.payload.toLowerCase().includes(searchFilter.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Status Bar */}
      <div className="rounded-2xl border border-white/5 bg-[#090b10] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white">SESSION: {session_id}</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${
                  wsStatus === "connected"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                ● {wsStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Live stream connected to {WS_URL}/ws/{session_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={appRoute("results")}
            search={{ session_id } as any}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors"
          >
            View Certificate &amp; Results
          </Link>

          <button
            onClick={handleStop}
            className="rounded-xl bg-red-600/80 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors"
          >
            Halt Drill
          </button>
        </div>
      </div>

      {/* Main Grid: Attack Feed (Left) & Risk Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Attack Feed */}
        <div className="lg:col-span-8 rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-white">Adversarial Attack Stream</h2>
              <p className="text-xs text-white/50">{feed.length} evaluations captured</p>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search payload..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 pl-8 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none w-48"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-white/40" />
            </div>
          </div>

          {/* Feed List */}
          <div className="h-[480px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {filteredFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-white/40">
                <Terminal className="h-8 w-8 mb-2 opacity-50" />
                <span>Waiting for telemetry stream...</span>
              </div>
            ) : (
              filteredFeed.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          entry.sev === "CRITICAL"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : entry.sev === "HIGH"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {entry.sev}
                      </span>
                      <span className="text-white/60 font-sans text-xs">{entry.category}</span>
                    </div>
                    <p className="text-white/80 line-clamp-2 text-[11px] font-mono">
                      {entry.payload}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0">{entry.ts}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Metrics & Donut */}
        <div className="lg:col-span-4 space-y-6">
          {/* Resilience Stat */}
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-4">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Resilience Score
            </h3>
            <div className="text-4xl font-light font-mono text-emerald-400">{resilience}%</div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${resilience}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-white/5">
              <div>
                <span className="text-white/40 block text-[10px]">SAFE CALLS</span>
                <span className="text-emerald-400 font-semibold">{chartData.passing}</span>
              </div>
              <div>
                <span className="text-white/40 block text-[10px]">HARMFUL DETECTED</span>
                <span className="text-red-400 font-semibold">{chartData.critical}</span>
              </div>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-4">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Threat Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(riskData).length === 0 ? (
                <div className="text-xs text-white/40 italic">Awaiting evaluations...</div>
              ) : (
                Object.entries(riskData).map(([cat, data]) => {
                  const pct = Math.round((data.harmful / (data.count || 1)) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/70">{cat}</span>
                        <span className="font-mono text-white/50">{pct}% risk</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
