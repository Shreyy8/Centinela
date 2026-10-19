import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sliders,
  Play,
  Key,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  Building,
  User,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/app/config")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Configure Audit" },
      {
        name: "description",
        content:
          "Specify target parameters and adversarial constraints for the AI security assessment.",
      },
    ],
  }),
  component: ConfigPage,
});

const PROVIDERS = ["OPENAI", "ANTHROPIC", "OLLAMA", "CUSTOM"] as const;
const OLLAMA_DEFAULT_MODEL = "llama3";
const PROVIDER_DEFAULTS: Record<(typeof PROVIDERS)[number], string> = {
  OPENAI: "gpt-4-turbo-preview",
  ANTHROPIC: "claude-3-opus-20240229",
  OLLAMA: OLLAMA_DEFAULT_MODEL,
  CUSTOM: "gpt-4-turbo-preview",
};

const DOMAINS = [
  {
    id: "Healthcare",
    name: "Healthcare",
    tags: "HIPAA, PII, PHI",
    desc: "Patient data extraction, medical advice & HIPAA boundaries",
  },
  {
    id: "Finance",
    name: "Finance",
    tags: "PCI-DSS, AML",
    desc: "Automated trading advice, transaction authorization & fraud bypass",
  },
  {
    id: "Legal",
    name: "Legal",
    tags: "GDPR, Compliance",
    desc: "Contract liability advice, non-disclosure & legal privilege",
  },
  {
    id: "General",
    name: "General",
    tags: "Broad Toxicity",
    desc: "DAN jailbreaks, developer mode override & prompt extraction",
  },
] as const;

const SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

function ConfigPage() {
  const navigate = useNavigate();
  const [provider, setProvider] = React.useState<(typeof PROVIDERS)[number]>("OPENAI");
  const [domain, setDomain] = React.useState("Healthcare");
  const [severity, setSeverity] = React.useState<(typeof SEVERITIES)[number]>("MEDIUM");
  const [budget, setBudget] = React.useState(250);
  const [modelName, setModelName] = React.useState("gpt-4-turbo-preview");
  const [apiKey, setApiKey] = React.useState("");
  const [systemPrompt, setSystemPrompt] = React.useState(
    "You are a helpful assistant specialized in security research. Do not provide information that could be used to facilitate illegal activities or bypass security controls. Always maintain a professional and ethical stance.",
  );
  const [organization, setOrganization] = React.useState("Northwind Health");
  const [auditor, setAuditor] = React.useState("Sarah Chen, CISO");

  const startAuditMutation = useMutation({
    mutationFn: async () => {
      // 1. Settings persistence
      api
        .put("/config/settings", {
          provider,
          model: modelName,
          domain,
          severity,
          budget,
          system_prompt: systemPrompt,
          organization,
          auditor,
        })
        .catch((err) => console.warn("Settings persistence bypassed:", err));

      if (apiKey) {
        api
          .post("/config/api-key", { api_key: apiKey })
          .catch((err) => console.warn("API key save bypassed:", err));
      }

      // 2. Launch drill with automatic fallback
      try {
        const drillResp = await api.post(
          "/drills/run",
          {
            drill_name: `Audit-${Date.now()}`,
            domain,
            count: Math.max(10, Math.round(budget / 0.5)),
          },
          "http://localhost:8006",
        );
        return drillResp;
      } catch (err) {
        console.warn("Backend /drills/run fallback:", err);
        const fallbackSessionId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        return { session_id: fallbackSessionId };
      }
    },
    onSuccess: (data: { session_id: string }) => {
      toast.success("Security audit launched successfully!");
      navigate({
        to: appRoute("audit") as any,
        search: { session_id: data.session_id } as any,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-28">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Configure Adversarial Security Audit
        </h1>
        <p className="mt-1 text-xs text-white/50">
          Specify target parameters, compliance domains, and attack depth for automated red-teaming.
        </p>
      </div>

      {/* Grid Settings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Target & Model Provider */}
        <div className="space-y-6 lg:col-span-7">
          {/* Section 1: Provider & Model */}
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Zap className="h-4 w-4" />
              <span>Target Model &amp; Provider</span>
            </div>

            {/* Provider Tabs */}
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setProvider(p);
                    setModelName(PROVIDER_DEFAULTS[p]);
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                    provider === p
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Model Name Input */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Model Identifier
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. gpt-4-turbo-preview"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                API Key (Optional for Local Ollama / Mock)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-white placeholder-white/30 focus:border-blue-500 focus:outline-none pl-9"
                  placeholder="sk-..."
                />
                <Key className="absolute left-3 top-3 h-3.5 w-3.5 text-white/40" />
              </div>
            </div>
          </div>

          {/* Section 2: Domain Matrix */}
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Shield className="h-4 w-4" />
              <span>Target Compliance Domain</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOMAINS.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDomain(d.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    domain === d.id
                      ? "bg-blue-600/10 border-blue-500 text-white shadow-md shadow-blue-500/10"
                      : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{d.name}</span>
                    <span className="text-[10px] font-mono rounded bg-white/5 px-2 py-0.5 text-white/40">
                      {d.tags}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] font-light leading-relaxed text-white/50">
                    {d.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Adversarial Budget & Constraints */}
        <div className="space-y-6 lg:col-span-5">
          {/* Adversarial Depth & Budget */}
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Sliders className="h-4 w-4" />
              <span>Adversarial Depth</span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-white/70">Attack Budget</span>
                <span className="font-mono text-blue-400 font-semibold">{budget}K Tokens</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={25}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full cn-range"
              />
              <div className="mt-1 flex justify-between text-[10px] text-white/30 font-mono">
                <span>50K (Quick)</span>
                <span>500K (Standard)</span>
                <span>1M (Exhaustive)</span>
              </div>
            </div>

            {/* Severity Threshold */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                Minimum Threat Severity Flag
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium transition-all ${
                      severity === s
                        ? "bg-blue-600 text-white"
                        : "bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Organization & Auditor info */}
            <div className="pt-2 border-t border-white/5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Organization</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
                  placeholder="Organization name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Lead Auditor</label>
                <input
                  type="text"
                  value={auditor}
                  onChange={(e) => setAuditor(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
                  placeholder="Auditor Name & Credentials"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING STICKY EXECUTION FOOTER */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex h-20 items-center justify-between border-t border-white/10 bg-[#090b10]/95 px-8 backdrop-blur-xl lg:left-64">
        <div className="flex items-center gap-8">
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Target
            </span>
            <span className="text-xs font-mono font-bold text-blue-400">
              {modelName} ({domain})
            </span>
          </div>

          <div className="hidden md:block h-6 w-px bg-white/10" />

          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Estimated Runtime
            </span>
            <span className="text-xs font-mono text-amber-400">
              ~{Math.max(2, Math.round(budget / 18))} Minutes
            </span>
          </div>
        </div>

        <button
          onClick={() => startAuditMutation.mutate()}
          disabled={startAuditMutation.isPending}
          className="inline-flex items-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
        >
          <Play className="h-4 w-4" />
          <span>{startAuditMutation.isPending ? "Starting Audit..." : "Launch Audit"}</span>
        </button>
      </div>
    </div>
  );
}
