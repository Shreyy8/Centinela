import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Shell } from "@/components/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, WS_URL } from "../lib/api";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Live Audit" },
      { name: "description", content: "Live attack feed and resilience telemetry for the active security audit." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
  component: LiveAudit,
});

type Sev = "CRITICAL" | "HIGH" | "PASS";
const sevStyles: Record<Sev, string> = {
  CRITICAL: "bg-[#ffb4ab]/10 text-[#ffb4ab] border-[#ffb4ab]/20",
  HIGH: "bg-[#ffb786]/10 text-[#ffb786] border-[#ffb786]/20",
  PASS: "bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]/20",
};

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

function TopBar({ sessionId, status }: { sessionId?: string; status: string }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c909f]">AUDIT_ID:</span>
        <span className="font-mono text-[13px] text-[#adc6ff]">#{sessionId?.slice(0, 8) ?? "N/A"}</span>
      </div>
      <div className={"flex items-center gap-2 border px-3 py-1 rounded " + (
        status === "running" || status === "streaming" ? "bg-[#ffb4ab]/10 border-[#ffb4ab]/30" :
        status === "completed" ? "bg-[#adc6ff]/10 border-[#adc6ff]/30" :
        "bg-[#8c909f]/10 border-[#8c909f]/30"
      )}>
        <span className={"w-2 h-2 rounded-full animate-pulse " + (
          status === "running" || status === "streaming" ? "bg-[#ffb4ab]" :
          status === "completed" ? "bg-[#adc6ff]" : "bg-[#8c909f]"
        )} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-current">
          {status === "running" || status === "streaming" ? "Attacking" :
           status === "completed" ? "Completed" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}

function LiveAudit() {
  const navigate = useNavigate();
  const { session_id } = useSearch({ from: Route.id });
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [stats, setStats] = useState<AuditStats>({ total_attacks: 0, attacks_sent: 0, responses_received: 0, status: "disconnected" });
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [chartData, setChartData] = useState({ passing: 0, failing: 0, critical: 0, high: 0 });
  const [riskData, setRiskData] = useState<Record<string, { count: number; harmful: number }>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connectWs = useCallback(() => {
    if (!session_id) return;
    setWsStatus("connecting");

    const token = localStorage.getItem("token");
    if (!token) {
      navigate({ to: "/login", search: { redirect: "/audit" } as any });
      return;
    }

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
          const ts = new Date(d.timestamp / 1000000).toLocaleTimeString();
          setFeed((prev) => {
            const next = [{ sev, category: d.category || "Unknown", payload: d.response_snippet?.slice(0, 60) || "", ts }, ...prev];
            return next.slice(0, 200);
          });
          setChartData((prev) => ({
            ...prev,
            passing: d.is_harmful ? prev.passing : prev.passing + 1,
            failing: d.is_harmful ? prev.failing + 1 : prev.failing,
            critical: d.is_harmful ? prev.critical + 1 : prev.critical,
            high: !d.is_harmful ? prev.high : prev.high,
          }));
          setRiskData((prev) => {
            const cat = d.category || "Unknown";
            const current = prev[cat] || { count: 0, harmful: 0 };
            return { ...prev, [cat]: { count: current.count + 1, harmful: current.harmful + (d.is_harmful ? 1 : 0) } };
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
      } catch {}
    };

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 30000);
    ws.addEventListener("close", () => clearInterval(interval));
  }, [session_id, navigate]);

  useEffect(() => {
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
    } catch (e: any) {
      // ignore
    }
  };

  const handleInject = async () => {
    // Inject is a placeholder for live prompt injection during an audit
    // Would call POST /session/infer on session-manager
  };

  if (!session_id) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-[#8c909f] mb-4">dynamic_feed</span>
            <h2 className="text-xl font-semibold mb-2">No Active Audit</h2>
            <p className="text-[#c2c6d6] mb-4">Configure and start an audit to see live results.</p>
            <button onClick={() => navigate({ to: "/config" })} className="bg-[#3B82F6] text-white px-6 py-3 rounded-lg font-semibold">
              Go to Configuration
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell topBar={<TopBar sessionId={session_id} status={stats.status} />}>
      <div className="flex gap-4 h-[calc(100vh-48px-3rem)] min-h-[640px]">
        {/* Left: Attack Feed */}
        <section className="w-3/5 flex flex-col bg-[#0f1116] border border-[#424754] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#424754] flex justify-between items-center bg-[#1a1c22]">
            <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#adc6ff] text-[20px]">dynamic_feed</span>
              Attack Feed
            </h2>
            <span className="text-[11px] text-[#c2c6d6] bg-[#282a2f] px-2 py-1 rounded">
              Live Counter: {stats.attacks_sent || feed.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {feed.length === 0 && wsStatus === "connected" ? (
              <div className="flex items-center justify-center h-full text-[#8c909f] text-sm">
                <span className="animate-pulse">Waiting for attacks...</span>
              </div>
            ) : feed.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#8c909f] text-sm">
                {wsStatus === "connecting" ? "Connecting..." : "No data"}
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[#0f1116] z-10">
                  <tr className="text-left border-b border-[#424754]">
                    <th className="text-[10px] text-[#8c909f] py-2 font-bold uppercase tracking-wider">Severity</th>
                    <th className="text-[10px] text-[#8c909f] py-2 font-bold uppercase tracking-wider">Category</th>
                    <th className="text-[10px] text-[#8c909f] py-2 font-bold uppercase tracking-wider">Payload Snippet</th>
                    <th className="text-[10px] text-[#8c909f] py-2 font-bold uppercase tracking-wider text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {feed.map((e, i) => (
                    <tr key={i} className="hover:bg-[#1a1c22] transition-colors border-b border-[#424754]/30">
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${sevStyles[e.sev]}`}>{e.sev}</span>
                      </td>
                      <td className="py-3 text-sm font-medium">{e.category}</td>
                      <td className="py-3 font-mono text-[12px] text-[#c2c6d6]">{e.payload}</td>
                      <td className="py-3 text-sm text-[#c2c6d6] text-right font-mono">{e.ts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-4 py-3 bg-[#0f1116] border-t border-[#424754]">
            <div className="flex gap-2">
              <Input
                placeholder="Enter custom attack prompt..."
                className="bg-[#1a1c22] border-[#424754] text-[#e2e2e9] placeholder:text-[#8c909f] h-10"
              />
              <Button onClick={handleInject} className="bg-[#adc6ff] text-[#002d6d] hover:bg-[#adc6ff]/90 font-bold uppercase tracking-widest px-6 h-10">
                Inject
              </Button>
            </div>
          </div>
          <div className="px-4 py-3 bg-[#1a1c22] border-t border-[#424754] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8c909f] uppercase font-bold tracking-wider">Audit Chain Hash:</span>
              <span className="font-mono text-[12px] text-[#bea8ff]">0x{session_id.slice(0, 4)}...{session_id.slice(-4)}</span>
            </div>
            <div className={"flex items-center gap-1 font-mono text-[11px] " + (wsStatus === "connected" ? "text-[#adc6ff]" : "text-[#ffb786]")}>
              <span className="material-symbols-outlined text-[14px]">link</span>
              {wsStatus === "connected" ? "LIVE" : wsStatus === "connecting" ? "CONNECTING" : "DISCONNECTED"}
            </div>
          </div>
        </section>

        {/* Right: Insights */}
        <section className="w-2/5 flex flex-col gap-4">
          <div className="bg-[#1a1c22] border border-[#424754] p-4 rounded-lg flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2A2D35" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#adc6ff" strokeDasharray={`${resilience}, 100`} strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-[#adc6ff]">{resilience || "--"}</span>
                <span className="text-[10px] text-[#8c909f] uppercase font-bold tracking-tight">Resilience</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-[10px] text-[#8c909f] font-bold uppercase mb-3 tracking-wider">System Resilience</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0f1116] border border-[#424754] p-2 rounded">
                  <p className="text-[10px] text-[#8c909f] uppercase font-bold">Passes</p>
                  <p className="text-xl font-bold text-[#adc6ff] font-mono">{chartData.passing.toLocaleString()}</p>
                </div>
                <div className="bg-[#0f1116] border border-[#424754] p-2 rounded">
                  <p className="text-[10px] text-[#8c909f] uppercase font-bold">Failures</p>
                  <p className="text-xl font-bold text-[#ffb4ab] font-mono">{chartData.failing.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1c22] border border-[#424754] p-4 rounded-lg">
            <h3 className="text-[10px] text-[#8c909f] font-bold uppercase mb-4 tracking-wider">Attack Risk Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(riskData).length === 0 ? (
                <p className="text-sm text-[#8c909f]">No classifications yet</p>
              ) : (
                Object.entries(riskData).slice(0, 5).map(([label, data]) => {
                  const pct = Math.round((data.harmful / (data.count || 1)) * 100);
                  const state = pct >= 70 ? "High Risk" : pct >= 30 ? "Moderate" : "Secure";
                  const color = pct >= 70 ? "#ffb4ab" : pct >= 30 ? "#ffb786" : "#adc6ff";
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{label}</span>
                        <span className="font-bold" style={{ color }}>{state} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-[#282a2f] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-[#1a1c22] border border-[#424754] p-4 rounded-lg flex-1">
            <h3 className="text-[10px] text-[#8c909f] font-bold uppercase mb-4 tracking-wider">Severity Distribution</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" fill="none" r="14" stroke="#adc6ff" strokeDasharray={`${safePct} 100`} strokeWidth="4" />
                  <circle cx="16" cy="16" fill="none" r="14" stroke="#ffb4ab" strokeDasharray={`${criticalPct} 100`} strokeDashoffset={`-${safePct}`} strokeWidth="4" />
                  <circle cx="16" cy="16" fill="none" r="14" stroke="#ffb786" strokeDasharray={`${highPct} 100`} strokeDashoffset={`-${safePct + criticalPct}`} strokeWidth="4" />
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { c: "#ffb4ab", l: "Critical", v: `${criticalPct}%` },
                  { c: "#ffb786", l: "High", v: `${highPct}%` },
                  { c: "#adc6ff", l: "Safe", v: `${safePct}%` },
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.c }} />
                    <span className="flex-1">{s.l}</span>
                    <span className="font-mono">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => wsRef.current?.close()}
              className="bg-[#282a2f] border border-[#424754] py-4 rounded-lg font-bold uppercase tracking-widest text-sm text-[#e2e2e9] hover:bg-[#33353a] transition-all active:scale-95"
            >
              Pause Audit
            </button>
            <button
              onClick={handleStop}
              className="bg-[#ffb4ab] border border-[#ffb4ab]/50 py-4 rounded-lg font-bold uppercase tracking-widest text-sm text-[#690005] hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-[#ffb4ab]/10"
            >
              Stop Audit
            </button>
          </div>
        </section>
      </div>
    </Shell>
  );
}
