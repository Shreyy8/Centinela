import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Shell } from "@/components/Shell";
import { api } from "../lib/api";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Results & Certification" },
      { name: "description", content: "Review audit results, attack log and download the signed safety certificate." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
  component: Results,
});

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "PASS";
const sevStyles: Record<string, string> = {
  CRITICAL: "bg-[#ffb4ab]/20 text-[#ffb4ab]",
  HIGH: "bg-[#93000a]/40 text-[#ffdad6]",
  MEDIUM: "bg-[#df7412]/30 text-[#ffb786]",
  LOW: "bg-[#8c909f] text-[#e2e2e9]",
  PASS: "bg-[#adc6ff]/10 text-[#adc6ff]",
};

interface RunResult {
  session_id: string;
  drill_name: string;
  dataset_name: string;
  adapter_version: string;
  total_pairs: number;
  harmful_detected: number;
  bypass_rate: number;
  status: string;
  total_attacks: number;
  attacks_sent: number;
  responses_received: number;
  created_at: string;
  completed_at: string;
}

function Results() {
  const navigate = useNavigate();
  const { session_id } = useSearch({ from: Route.id });
  const [run, setRun] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!session_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    api.get(`/drills/${session_id}/status`, "http://localhost:8006")
      .then((data) => {
        setRun(data as RunResult);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [session_id]);

  const total = run?.attacks_sent || run?.total_attacks || 0;
  const harmful = run?.harmful_detected || 0;
  const safe = Math.max(0, (run?.total_pairs || 0) - harmful);
  const safetyScore = run?.total_pairs ? Math.round((safe / run.total_pairs) * 100) : null;
  const isComplete = run?.status === "completed";

  if (!session_id) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-[#8c909f] mb-4">summarize</span>
            <h2 className="text-xl font-semibold mb-2">No Results Selected</h2>
            <p className="text-[#c2c6d6] mb-4">Complete an audit and view results here.</p>
            <button onClick={() => navigate({ to: "/config" })} className="bg-[#3B82F6] text-white px-6 py-3 rounded-lg font-semibold">
              Configure Audit
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <span className="animate-pulse text-[#8c909f]">Loading results...</span>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-[#ffb4ab] mb-4">error</span>
            <h2 className="text-xl font-semibold mb-2">Failed to Load Results</h2>
            <p className="text-[#c2c6d6]">{error}</p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      topBar={
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-mono text-[#c2c6d6]">SESSION: {session_id.slice(0, 8)}...</span>
          <span className="h-4 w-px bg-[#424754]" />
          <span className={"text-[13px] font-mono " + (isComplete ? "text-[#adc6ff]" : "text-[#ffb786]")}>
            STATUS: {run?.status?.toUpperCase() || "UNKNOWN"}
          </span>
        </div>
      }
      sidebarFooter={
        <div className="px-4 py-2 bg-[#4d8eff]/10 rounded mb-4">
          <div className="flex items-center gap-2 text-[#adc6ff] mb-1">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="text-[12px] font-semibold tracking-[0.05em]">
              {isComplete ? "Audit Finalized" : "Audit Pending"}
            </span>
          </div>
          {isComplete && (
            <button onClick={() => setDrawerOpen(true)} className="text-[13px] text-[#e2e2e9] hover:underline cursor-pointer">
              View History Deltas
            </button>
          )}
        </div>
      }
    >
      <div className="relative z-10">
        {/* Summary header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 glass-panel p-6 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-[#c2c6d6]">Audit Session</span>
                <span className="font-mono text-[#adc6ff] text-[13px]">#{session_id.slice(0, 12)}</span>
              </div>
              <h2 className="text-[32px] leading-[40px] font-bold tracking-tight">{run?.drill_name || "Audit Results"}</h2>
              <p className="text-sm text-[#c2c6d6] mt-1">Dataset: {run?.dataset_name || "N/A"}</p>
            </div>
            <div className="flex flex-col items-end gap-4">
              <div className={"border px-4 py-2 rounded-full flex items-center gap-2 " + (isComplete ? "bg-[#adc6ff]/10 text-[#adc6ff] border-[#adc6ff]" : "bg-[#ffb786]/10 text-[#ffb786] border-[#ffb786]")}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isComplete ? "check_circle" : "pending"}
                </span>
                <span className="font-bold tracking-tight">{isComplete ? "CERTIFIED" : run?.status?.toUpperCase() || "PENDING"}</span>
              </div>
              {run?.completed_at && (
                <div className="text-right">
                  <span className="text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6] block">COMPLETED</span>
                  <span className="text-[13px] font-mono">{new Date(run.completed_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col justify-center items-center text-center">
            <span className="text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6] mb-1">SAFETY SCORE</span>
            <div className="relative h-24 w-24 flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" fill="transparent" r="44" stroke="#1A1D24" strokeWidth="8" />
                {safetyScore !== null && (
                  <circle cx="48" cy="48" fill="transparent" r="44" stroke="#3B82F6" strokeDasharray="276" strokeDashoffset={276 - (276 * safetyScore) / 100} strokeWidth="8" />
                )}
              </svg>
              <span className="text-[32px] font-bold">{safetyScore ?? "--"}</span>
            </div>
            <span className="text-[13px] text-[#adc6ff] mt-2">{run?.total_pairs || 0} evaluations</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard icon="bolt" iconBg="bg-[#33353a]" iconColor="text-[#adc6ff]" value={total.toLocaleString()} label="ATTACKS SENT" />
          <StatCard icon="gpp_maybe" iconBg="bg-[#ffb4ab]/10" iconColor="text-[#ffb4ab]" value={harmful.toLocaleString()} valueColor="text-[#ffb4ab]" label="HARMFUL DETECTED" />
          <StatCard icon="draw" iconBg="bg-[#df7412]/20" iconColor="text-[#ffb786]" value={run?.bypass_rate != null ? `${(run.bypass_rate * 100).toFixed(1)}%` : "--"} valueColor="text-[#ffb786]" label="BYPASS RATE" />
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          {/* Attack log */}
          <div className="lg:col-span-6 glass-panel rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#424754] flex items-center justify-between bg-[#282a2f]/30">
              <h3 className="text-base font-semibold">Audit Summary</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-[#111318] border border-[#424754] rounded-lg p-4">
                  <p className="text-[11px] font-bold text-[#8c909f] uppercase tracking-wider mb-1">Drill Name</p>
                  <p className="text-sm font-semibold">{run?.drill_name || "N/A"}</p>
                </div>
                <div className="bg-[#111318] border border-[#424754] rounded-lg p-4">
                  <p className="text-[11px] font-bold text-[#8c909f] uppercase tracking-wider mb-1">Dataset</p>
                  <p className="text-sm font-semibold">{run?.dataset_name || "N/A"}</p>
                </div>
                <div className="bg-[#111318] border border-[#424754] rounded-lg p-4">
                  <p className="text-[11px] font-bold text-[#8c909f] uppercase tracking-wider mb-1">Total Pairs</p>
                  <p className="text-sm font-semibold font-mono">{run?.total_pairs?.toLocaleString() || "0"}</p>
                </div>
                <div className="bg-[#111318] border border-[#424754] rounded-lg p-4">
                  <p className="text-[11px] font-bold text-[#8c909f] uppercase tracking-wider mb-1">Adapter Version</p>
                  <p className="text-sm font-semibold font-mono">{run?.adapter_version || "N/A"}</p>
                </div>
                <div className="bg-[#111318] border border-[#424754] rounded-lg p-4">
                  <p className="text-[11px] font-bold text-[#8c909f] uppercase tracking-wider mb-1">Created</p>
                  <p className="text-sm font-semibold">{run?.created_at ? new Date(run.created_at).toLocaleString() : "N/A"}</p>
                </div>
                <div className="bg-[#111318] border border-[#424754] rounded-lg p-4">
                  <p className="text-[11px] font-bold text-[#8c909f] uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-sm font-semibold">{run?.completed_at ? new Date(run.completed_at).toLocaleString() : "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate */}
          <div className="lg:col-span-4 glass-panel rounded-xl overflow-hidden flex flex-col">
            <div className="bg-[#111318] p-6 flex-1 relative border-b border-[#424754] overflow-hidden group">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#3B82F6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative z-10 border border-[#424754]/30 p-4 h-full bg-[#1a1b21] flex flex-col items-center">
                <div className="w-full flex justify-between items-start mb-6">
                  <span className="text-[10px] font-mono text-[#c2c6d6]">ID: {session_id.slice(0, 11)}</span>
                  <div className="text-right">
                    <div className="text-[8px] text-[#c2c6d6]">TIMESTAMP</div>
                    <div className="text-[10px] font-mono">{run?.completed_at ? new Date(run.completed_at).toISOString() : "N/A"}</div>
                  </div>
                </div>
                <div className="mb-4 text-center">
                  <h4 className="text-base font-bold tracking-tight text-[#adc6ff]">CENTINELA SAFETY SEAL</h4>
                  <div className="h-[2px] w-12 bg-[#adc6ff] mx-auto mt-1" />
                </div>
                <p className="text-[10px] leading-relaxed text-[#c2c6d6] px-4 text-center mb-6">
                  {isComplete
                    ? `This document certifies that ${run?.drill_name || "the target system"} has undergone a rigorous automated safety audit. ${safe} of ${run?.total_pairs || 0} evaluations passed security checks.`
                    : "This audit is still in progress. Results will be available upon completion."}
                </p>
                <div className="w-full mt-auto bg-[#111318]/50 p-2 border border-[#424754]/50 rounded flex flex-col gap-2">
                  <div>
                    <span className="text-[8px] font-bold text-[#c2c6d6]">SESSION_ID</span>
                    <div className="text-[9px] font-mono break-all leading-none opacity-60">{session_id}</div>
                  </div>
                  {run?.bypass_rate != null && (
                    <div>
                      <span className="text-[8px] font-bold text-[#c2c6d6]">BYPASS_RATE</span>
                      <div className="text-[9px] font-mono break-all leading-none text-[#adc6ff]">{(run.bypass_rate * 100).toFixed(2)}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 flex items-center gap-4 bg-[#1e2025]">
              <button className="flex-1 bg-[#adc6ff] text-[#002e6a] font-bold py-2 rounded flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                DOWNLOAD PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <div className={"fixed right-0 top-0 h-full w-[400px] bg-[#1a1b21] border-l border-[#424754] shadow-2xl z-[60] transition-transform duration-300 ease-in-out " + (drawerOpen ? "translate-x-0" : "translate-x-full")}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-semibold">Audit Details</h3>
            <button onClick={() => setDrawerOpen(false)} className="material-symbols-outlined hover:bg-[#33353a] p-2 rounded-full">close</button>
          </div>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="p-4 bg-[#282a2f] rounded border border-[#424754]">
              <div className="text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6] mb-2">SESSION DATA</div>
              <pre className="text-[11px] font-mono text-[#c2c6d6] whitespace-pre-wrap">{JSON.stringify(run, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
      {drawerOpen && <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 bg-black/40 z-50" />}
    </Shell>
  );
}

function StatCard({ icon, iconBg, iconColor, value, valueColor = "", label }: { icon: string; iconBg: string; iconColor: string; value: string; valueColor?: string; label: string }) {
  return (
    <div className="bg-[#1a1b21] border border-[#424754] p-4 rounded-lg flex items-center gap-4">
      <div className={iconBg + " p-2 rounded"}>
        <span className={"material-symbols-outlined " + iconColor}>{icon}</span>
      </div>
      <div>
        <div className={"text-base font-semibold " + valueColor}>{value}</div>
        <div className="text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6]">{label}</div>
      </div>
    </div>
  );
}
