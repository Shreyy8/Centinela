import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Activity,
  Search,
  Square,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { api, WS_URL, IS_DEMO_MODE } from "@/lib/api";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/app/audit")({
  head: () => ({
    meta: [
      { title: "Centinela — Red Team Telemetry" },
      {
        name: "description",
        content:
          "Live attack feed and resilience telemetry for active adversarial red-team drills.",
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
    passing: 48,
    failing: 2,
    critical: 2,
    high: 0,
  });
  const [riskData, setRiskData] = React.useState<
    Record<string, { count: number; harmful: number }>
  >({
    Jailbreak: { count: 18, harmful: 1 },
    PromptInjection: { count: 14, harmful: 1 },
    DataExtraction: { count: 10, harmful: 0 },
    Toxicity: { count: 8, harmful: 0 },
  });
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-zinc-200/80 shadow-sm text-zinc-400 mb-4">
          <Terminal className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">No Active Red Team Drill</h2>
        <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
          Select or launch an adversarial red-team drill to view real-time WebSocket telemetry and
          threat classifications.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            to={appRoute("config")}
            className="rounded-full bg-zinc-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors shadow-sm"
          >
            Launch Attack Drill
          </Link>
          <Link
            to={appRoute("audit")}
            search={{ session_id: "default_audit" } as any}
            className="rounded-full border border-zinc-200/80 bg-white px-5 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-2xs"
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
      {/* Top Status Bar Card */}
      <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-6 shadow-[0_4px_25px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-zinc-900">DRILL: {session_id}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                  wsStatus === "connected"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                ● {wsStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Live telemetry connected to {WS_URL}/ws/{session_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={appRoute("results")}
            search={{ session_id } as any}
            className="rounded-full border border-zinc-200/80 bg-white hover:bg-zinc-50 px-5 py-2 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
          >
            View Certificate &amp; Results
          </Link>

          <button
            onClick={handleStop}
            className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-semibold shadow-2xs transition-colors"
          >
            Halt Drill
          </button>
        </div>
      </div>

      {/* Main Grid: Attack Feed (Left) & Risk Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Attack Feed */}
        <div className="lg:col-span-8 rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Adversarial Attack Stream</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{feed.length} evaluations captured</p>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search payload..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="rounded-full border border-zinc-200/80 bg-zinc-50 px-3.5 py-1.5 pl-8 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-800 focus:outline-none w-52"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>

          {/* Feed List */}
          <div className="h-[480px] overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {filteredFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400">
                <Terminal className="h-8 w-8 mb-2 opacity-40" />
                <span>Simulated stream initialized • Waiting for evaluations...</span>
              </div>
            ) : (
              filteredFeed.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3.5 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          entry.sev === "CRITICAL"
                            ? "bg-rose-100 text-rose-700"
                            : entry.sev === "HIGH"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {entry.sev}
                      </span>
                      <span className="text-zinc-600 font-sans text-xs font-semibold">
                        {entry.category}
                      </span>
                    </div>
                    <p className="text-zinc-800 line-clamp-2 text-[11px] font-mono">
                      {entry.payload}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400 shrink-0 font-mono">{entry.ts}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Metrics & Risk Breakdown */}
        <div className="lg:col-span-4 space-y-6">
          {/* Resilience Stat */}
          <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Fleet Resilience Score
            </h3>
            <div className="text-4xl font-extrabold font-mono text-emerald-600">{resilience}%</div>
            <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${resilience}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-zinc-100">
              <div>
                <span className="text-zinc-400 block text-[10px]">SAFE CALLS</span>
                <span className="text-emerald-600 font-bold">{chartData.passing}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">THREATS DETECTED</span>
                <span className="text-rose-500 font-bold">{chartData.critical}</span>
              </div>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Threat Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(riskData).map(([cat, data]) => {
                const pct = Math.round((data.harmful / (data.count || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-700">{cat}</span>
                      <span className="font-mono text-zinc-400">{pct}% risk</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
