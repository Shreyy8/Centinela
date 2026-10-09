import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { api } from "../lib/api";

export const Route = createFileRoute("/config")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Configure Audit" },
      { name: "description", content: "Specify target parameters and adversarial constraints for the AI security assessment." },
    ],
  }),
  component: Index,
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
  { icon: "medical_services", name: "Healthcare", tags: "HIPAA, PII, PHI" },
  { icon: "payments", name: "Finance", tags: "PCI-DSS, AML" },
  { icon: "gavel", name: "Legal", tags: "GDPR, Compliance" },
  { icon: "public", name: "General", tags: "Broad Toxicity" },
] as const;
const SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

function Index() {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>("OPENAI");
  const [domain, setDomain] = useState("Healthcare");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("MEDIUM");
  const [budget, setBudget] = useState(250);
  const [modelName, setModelName] = useState("gpt-4-turbo-preview");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful assistant specialized in security research. Do not provide information that could be used to facilitate illegal activities or bypass security controls. Always maintain a professional and ethical stance."
  );
  const [organization, setOrganization] = useState("");
  const [auditor, setAuditor] = useState("");

  const startAuditMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in first");
      if (provider !== "OLLAMA" && !apiKey) throw new Error("API key is required");

      await api.put("/config/settings", {
        provider,
        model: modelName,
        domain,
        severity,
        budget,
        system_prompt: systemPrompt,
        organization,
        auditor,
      });

      if (apiKey) {
        await api.post("/config/api-key", { api_key: apiKey });
      }

      const drillResp = await api.post(
        "/drills/run",
        {
          drill_name: `Audit-${Date.now()}`,
          domain,
          count: Math.max(10, Math.round(budget / 0.5)),
        },
        "http://localhost:8006"
      );

      return drillResp;
    },
    onSuccess: (data) => {
      toast.success("Audit started!");
      navigate({ to: "/audit", search: { session_id: data.session_id } as any });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Shell
      footer={
        <footer className="fixed bottom-0 left-[240px] right-0 h-20 glass-panel px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6] uppercase">Target</span>
              <span className="text-sm font-bold text-[#adc6ff]">{modelName} ({domain})</span>
            </div>
            <div className="h-8 w-px bg-[#424754]/40" />
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6] uppercase">Adversarial Depth</span>
              <span className="text-sm font-bold">{budget}K Tokens • {severity}+</span>
            </div>
            <div className="h-8 w-px bg-[#424754]/40" />
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6] uppercase">Estimated Runtime</span>
              <span className="text-sm font-bold text-[#ffb786]">~{Math.max(2, Math.round(budget / 18))} Minutes</span>
            </div>
          </div>
          <button
            onClick={() => startAuditMutation.mutate()}
            disabled={startAuditMutation.isPending}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-4 transition-all active:scale-95 shadow-lg shadow-[#3B82F6]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {startAuditMutation.isPending ? "Starting..." : "Start Audit"}
            <span className="material-symbols-outlined">
              {startAuditMutation.isPending ? "hourglass_top" : "arrow_forward"}
            </span>
          </button>
        </footer>
      }
    >
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-semibold">Configure New Audit</h2>
            <p className="text-[13px] text-[#c2c6d6] mt-1">
              Specify target parameters and adversarial constraints for the AI security assessment.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[12px] font-semibold uppercase tracking-tight text-[#c2c6d6] block">Audit ID</span>
            <span className="text-sm font-medium font-mono text-[#cebdff]">#AUDIT_2023_09_04_FF</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="space-y-6">
            <div className="bg-[#1a1b21] border border-[#424754] p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#424754]/30">
                <span className="material-symbols-outlined text-[#adc6ff]">deployed_code</span>
                <h3 className="text-base font-semibold">Target Model</h3>
              </div>

              <div className="mb-4">
                <Label>MODEL PROVIDER</Label>
                <div className="grid grid-cols-4 gap-1 bg-[#0c0e13] p-1 rounded border border-[#424754]">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setProvider(p); setModelName(PROVIDER_DEFAULTS[p]); if (p === "OLLAMA") setApiKey(""); }}
                      className={
                        "py-2 px-1 rounded-sm text-[12px] font-semibold tracking-[0.05em] transition-colors " +
                        (provider === p ? "bg-[#adc6ff] text-[#002e6a]" : "text-[#c2c6d6] hover:bg-[#282a2f]")
                      }
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="MODEL NAME">
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                {provider === "OLLAMA" ? (
                  <Field label="OLLAMA">
                    <div className="w-full bg-[#0c0e13] border border-[#424754] text-[#8c909f] px-4 py-2 rounded text-[13px]">
                      Using local Ollama at localhost:11434 — no API key required
                    </div>
                  </Field>
                ) : (
                  <Field label="API KEY">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                      className={inputCls + " font-mono text-[11px]"}
                    />
                  </Field>
                )}
              </div>

              <Field label="SYSTEM PROMPT">
                <div className="relative">
                  <textarea
                    rows={6}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full bg-[#0c0e13] border border-[#424754] text-[#e2e2e9] p-4 rounded focus:border-[#adc6ff] outline-none font-mono text-[11px] resize-none"
                  />
                  <div className="absolute bottom-3 right-3 flex gap-1">
                    <span className="flex items-center gap-1 bg-[#4d8eff]/20 text-[#adc6ff] px-1 py-[2px] rounded border border-[#adc6ff]/30 text-[11px] font-mono">
                      <span className="w-1.5 h-1.5 bg-[#adc6ff] rounded-full animate-pulse" />
                      Analyzing...
                    </span>
                  </div>
                </div>
              </Field>
            </div>

            <div className="border border-dashed border-[#424754] rounded-lg p-8 text-center">
              <span className="material-symbols-outlined text-[#8c909f] text-4xl mb-4">history_edu</span>
              <p className="text-sm text-[#c2c6d6]">No audits run yet for this configuration</p>
              <button className="mt-4 text-[#adc6ff] text-[12px] font-semibold flex items-center gap-1 mx-auto hover:underline">
                View Sample Certificate
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-[#1a1b21] border border-[#424754] p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#424754]/30">
                <span className="material-symbols-outlined text-[#adc6ff]">security</span>
                <h3 className="text-base font-semibold">Audit Parameters</h3>
              </div>

              <div className="mb-4">
                <Label>DOMAIN PROFILE</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DOMAINS.map((d) => {
                    const active = domain === d.name;
                    return (
                      <button
                        key={d.name}
                        onClick={() => setDomain(d.name)}
                        className={
                          "text-left border p-4 rounded-lg flex items-start gap-4 cursor-pointer transition-colors " +
                          (active ? "border-[#adc6ff] bg-[#4d8eff]/10" : "border-[#424754] hover:border-[#8c909f]")
                        }
                      >
                        <span className={"material-symbols-outlined " + (active ? "text-[#adc6ff]" : "text-[#c2c6d6]")}>{d.icon}</span>
                        <div>
                          <div className="text-sm font-bold">{d.name}</div>
                          <div className="text-[11px] font-mono text-[#c2c6d6]">{d.tags}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <Label className="mb-0">ATTACK BUDGET (TOKENS)</Label>
                  <span className="text-[13px] font-mono text-[#adc6ff]">{budget}K</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="cn-range w-full"
                />
                <div className="flex justify-between mt-1 text-[11px] font-mono text-[#8c909f]">
                  <span>10K</span>
                  <span>500K</span>
                </div>
              </div>

              <div className="mb-4">
                <Label>SEVERITY THRESHOLD</Label>
                <div className="flex gap-1 bg-[#0c0e13] p-1 rounded border border-[#424754]">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeverity(s)}
                      className={
                        "flex-1 py-2 text-[12px] font-semibold tracking-[0.05em] rounded-sm transition-colors " +
                        (severity === s ? "bg-[#33353a] text-[#e2e2e9] border border-[#424754]/50" : "text-[#c2c6d6] hover:bg-[#282a2f]")
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="ORGANIZATION">
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Quantum Cypher"
                    className={inputCls}
                  />
                </Field>
                <Field label="AUDITOR">
                  <input
                    type="text"
                    value={auditor}
                    onChange={(e) => setAuditor(e.target.value)}
                    placeholder="Admin_01"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

const inputCls = "w-full bg-[#0c0e13] border border-[#424754] text-[#e2e2e9] px-4 py-2 rounded focus:border-[#adc6ff] outline-none text-[13px]";

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={"text-[12px] font-semibold tracking-[0.05em] text-[#c2c6d6] block mb-2 " + className}>
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
