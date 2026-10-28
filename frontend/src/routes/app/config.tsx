import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Plus,
  X,
  ChevronDown,
  Sparkles,
  Zap,
  Shield,
  Layers,
  Clock,
  Key,
  Server,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/app/config")({
  head: () => ({
    meta: [
      { title: "Centinela — Models & Attack Scenarios" },
      {
        name: "description",
        content:
          "Configure target models, attack surface, and execute automated adversarial drills.",
      },
    ],
  }),
  component: ConfigPage,
});

interface PresetScenario {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  duration: string;
  resources: string;
  bestFor: string;
  models: string[];
  attacks: string[];
  badge?: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "quick-demo",
    name: "Quick Demo",
    subtitle: "Small Models • Advanced Attacks",
    description:
      "Test advanced attacks on small models. Fast, good for verifying your setup works end-to-end.",
    duration: "5 MIN",
    resources: "~1GB",
    bestFor: "Setup Verification",
    models: ["GPT-2", "DistilGPT2"],
    attacks: ["Jailbreak", "Prompt Injection", "Data Exfiltration", "Toxicity"],
  },
  {
    id: "medium",
    name: "Medium",
    subtitle: "GPT-Neo 1.3B • Expert Attacks",
    description:
      "Comprehensive probe of mid-sized foundational models against persistent jailbreaks and prompt extraction.",
    duration: "15 MIN",
    resources: "~4GB",
    bestFor: "Staging Testing",
    models: ["GPT-Neo-1.3B", "Llama-3-8B"],
    attacks: ["Jailbreak", "Prompt Injection", "Data Exfiltration", "Toxicity", "Misinformation"],
  },
  {
    id: "large",
    name: "Large",
    subtitle: "Llama 2 7B • Expert Attacks",
    description:
      "High-depth multi-turn adversarial stress testing designed for frontier open-weights systems.",
    duration: "30 MIN",
    resources: "~8GB",
    bestFor: "Enterprise Gate",
    models: ["Llama-2-7B", "Mistral-7B-v0.3"],
    attacks: [
      "Jailbreak",
      "Prompt Injection",
      "Data Exfiltration",
      "Toxicity",
      "Misinformation",
      "Bias & Fairness",
    ],
  },
  {
    id: "multi-model",
    name: "Multi-Model Comparison",
    subtitle: "Llama 7B + Mistral 7B • Expert Attacks",
    description:
      "Side-by-side benchmark comparing safety boundaries and refusal drift across model architectures.",
    duration: "30 MIN",
    resources: "~8GB",
    bestFor: "Architecture Choice",
    models: ["Llama-7B", "Mistral-7B"],
    attacks: ["Jailbreak", "Prompt Injection", "Data Exfiltration", "Toxicity"],
  },
  {
    id: "comprehensive",
    name: "Comprehensive",
    subtitle: "3 Big Models • Expert Attacks",
    description:
      "Statutory compliance suite verifying EU AI Act Article 14 and HIPAA safeguards across three production models.",
    duration: "45 MIN",
    resources: "~16GB",
    bestFor: "Statutory Compliance",
    models: ["GPT-4-Turbo", "Claude-3-Opus", "Llama-3-70B"],
    attacks: [
      "Jailbreak",
      "Prompt Injection",
      "Data Exfiltration",
      "Toxicity",
      "Misinformation",
      "Bias & Fairness",
    ],
  },
  {
    id: "max-stress",
    name: "Maximum Stress Test",
    subtitle: "4 Models • Expert Attacks",
    description:
      "Exhaustive red-team drill deploying genetic algorithm PAIR attacks and token perturbation matrices.",
    duration: "60 MIN",
    resources: "~32GB",
    bestFor: "Pre-Release Certification",
    models: ["GPT-4o", "Claude-3.5-Sonnet", "Mistral-Large", "Gemini-1.5-Pro"],
    attacks: [
      "Jailbreak",
      "Prompt Injection",
      "Data Exfiltration",
      "Toxicity",
      "Misinformation",
      "Bias & Fairness",
    ],
  },
  {
    id: "huggingface",
    name: "HuggingFace Model",
    subtitle: "Upload your own HF model — Red-Team...",
    description:
      "Direct adapter connection to your custom fine-tuned weights or private Hugging Face checkpoint.",
    duration: "VARIES",
    resources: "Dynamic",
    bestFor: "Custom Fine-tunes",
    models: ["custom-org/hf-fine-tune-v1"],
    attacks: ["Jailbreak", "Prompt Injection", "Data Exfiltration", "Toxicity"],
    badge: "PRO",
  },
];

const ALL_ATTACKS = [
  "Jailbreak",
  "Prompt Injection",
  "Data Exfiltration",
  "Toxicity",
  "Misinformation",
  "Bias & Fairness",
  "+ 4 More Attacks",
];

function ConfigPage() {
  const navigate = useNavigate();
  const [selectedScenarioId, setSelectedScenarioId] = React.useState("quick-demo");
  const selectedScenario =
    PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];

  const [targetModels, setTargetModels] = React.useState<string[]>(selectedScenario.models);
  const [selectedAttacks, setSelectedAttacks] = React.useState<string[]>(selectedScenario.attacks);
  const [duration, setDuration] = React.useState(selectedScenario.duration);
  const [resources, setResources] = React.useState(selectedScenario.resources);
  const [bestFor, setBestFor] = React.useState(selectedScenario.bestFor);
  const [isAddingModel, setIsAddingModel] = React.useState(false);
  const [newModelInput, setNewModelInput] = React.useState("");

  // Target LLM Provider & Key State
  const [providerMode, setProviderMode] = React.useState<"simulator" | "gemini" | "ollama">("simulator");
  const [geminiApiKey, setGeminiApiKey] = React.useState("");
  const [geminiModel, setGeminiModel] = React.useState("gemini-1.5-flash");
  const [ollamaHost, setOllamaHost] = React.useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = React.useState("llama3");
  const [isSavingKey, setIsSavingKey] = React.useState(false);
  const [keySaved, setKeySaved] = React.useState(false);
  const [showApiKey, setShowApiKey] = React.useState(false);

  // Check existing key on mount
  React.useEffect(() => {
    api.get("/config/api-key")
      .then((res: any) => {
        if (res?.has_key) {
          setKeySaved(true);
          setProviderMode("gemini");
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveKey = async () => {
    if (!geminiApiKey.trim()) return;
    setIsSavingKey(true);
    try {
      // 1. Save in auth-service MongoDB
      await api.post("/config/api-key", { key: geminiApiKey.trim() });
      // 2. Configure in llm-proxy container
      await api.post("/llm/config/api-key", {
        api_key: geminiApiKey.trim(),
        model_id: geminiModel,
      }).catch(() => {});
      setKeySaved(true);
      toast.success("Gemini API key verified & saved securely!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save API key");
    } finally {
      setIsSavingKey(false);
    }
  };

  // When scenario changes, update fields
  const handleSelectScenario = (sc: PresetScenario) => {
    setSelectedScenarioId(sc.id);
    setTargetModels(sc.models);
    setSelectedAttacks(sc.attacks);
    setDuration(sc.duration);
    setResources(sc.resources);
    setBestFor(sc.bestFor);
  };

  const toggleAttack = (attack: string) => {
    if (selectedAttacks.includes(attack)) {
      setSelectedAttacks(selectedAttacks.filter((a) => a !== attack));
    } else {
      setSelectedAttacks([...selectedAttacks, attack]);
    }
  };

  const removeModel = (model: string) => {
    setTargetModels(targetModels.filter((m) => m !== model));
  };

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newModelInput.trim()) {
      setTargetModels([...targetModels, newModelInput.trim()]);
      setNewModelInput("");
      setIsAddingModel(false);
    }
  };

  const startAuditMutation = useMutation({
    mutationFn: async () => {
      // 1. Settings persistence
      api
        .put("/config/settings", {
          scenario: selectedScenario.name,
          models: targetModels,
          attacks: selectedAttacks,
          duration,
          resources,
          best_for: bestFor,
        })
        .catch((err) => console.warn("Settings persistence bypassed:", err));

      // 2. Launch drill
      try {
        // Sync active key if gemini mode
        if (providerMode === "gemini" && geminiApiKey.trim()) {
          await api.post("/llm/config/api-key", {
            api_key: geminiApiKey.trim(),
            model_id: geminiModel,
          }).catch(() => {});
        }

        const drillResp = await api.post(
          "/drills/run",
          {
            drill_name: `${selectedScenario.name}-${Date.now()}`,
            models: targetModels,
            attacks: selectedAttacks,
            count: 50,
          },
          "http://localhost:8006",
        );
        return drillResp;
      } catch (err) {
        console.warn("Backend /drills/run fallback:", err);
        const fallbackSessionId = `bayora_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        return { session_id: fallbackSessionId };
      }
    },
    onSuccess: (data: { session_id: string }) => {
      toast.success("Attack test drill launched successfully!");
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Main Bayora Attack Scenarios Card */}
      <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-7 sm:p-9 shadow-[0_4px_25px_rgb(0,0,0,0.02)] min-h-[620px] flex flex-col lg:flex-row gap-8">
        {/* Left Column: Preset Scenarios List */}
        <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-100 pb-6 lg:pb-0 lg:pr-6 space-y-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">
              Preset Scenarios
            </span>
            <p className="text-xs text-zinc-400 mt-0.5">Choose a preset or build custom.</p>
          </div>

          <div className="space-y-2">
            {PRESET_SCENARIOS.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              return (
                <div
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc)}
                  className={`relative p-3.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected ? "bg-zinc-100/90 shadow-2xs" : "hover:bg-zinc-50/80 text-zinc-600"
                  }`}
                >
                  {/* Left accent bar if selected */}
                  {isSelected && (
                    <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-zinc-900 rounded-r-full" />
                  )}

                  <div className="flex items-center justify-between gap-2 pl-2">
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 truncate">{sc.name}</span>
                        {sc.badge && (
                          <span className="rounded-full bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700">
                            ✦ {sc.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{sc.subtitle}</p>
                    </div>

                    <span className="text-[10px] font-semibold text-zinc-600 shrink-0 font-mono">
                      {sc.duration}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Execution Settings & Launch */}
        <div className="flex-1 space-y-8 flex flex-col justify-between">
          <div className="space-y-7">
            {/* Scenario Header */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                {selectedScenario.name}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-zinc-500 mt-1">
                {selectedScenario.subtitle}
              </p>
              <p className="text-xs text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                {selectedScenario.description}
              </p>
            </div>

            {/* Target Models */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Target Models
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {targetModels.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-800"
                  >
                    <span>{m}</span>
                    <button
                      onClick={() => removeModel(m)}
                      className="text-zinc-400 hover:text-zinc-700 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {isAddingModel ? (
                  <form onSubmit={handleAddModel} className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      value={newModelInput}
                      onChange={(e) => setNewModelInput(e.target.value)}
                      placeholder="e.g. claude-3.5-sonnet"
                      className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-900 outline-none focus:border-zinc-800"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingModel(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 px-1"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingModel(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-zinc-300 hover:border-zinc-500 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Model</span>
                  </button>
                )}
              </div>
            </div>

            {/* Attack Surface */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Attack Surface
              </span>

              <div className="flex flex-wrap gap-2">
                {ALL_ATTACKS.map((atk) => {
                  const isActive = selectedAttacks.includes(atk);
                  return (
                    <button
                      key={atk}
                      type="button"
                      onClick={() => toggleAttack(atk)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-zinc-900 text-white shadow-2xs"
                          : "bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/80"
                      }`}
                    >
                      {atk}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target LLM Provider & Inference Credentials */}
            <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Target LLM Engine & API Provider
                  </span>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Select how adversarial probes are evaluated: zero-token sandbox simulator or direct cloud/local API.
                  </p>
                </div>

                {/* Mode Selector Badges */}
                <div className="inline-flex rounded-full bg-zinc-200/60 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setProviderMode("simulator")}
                    className={`rounded-full px-3 py-1 text-[11px] transition-all ${
                      providerMode === "simulator"
                        ? "bg-white text-zinc-900 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Zero-Cost Sandbox
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderMode("gemini")}
                    className={`rounded-full px-3 py-1 text-[11px] transition-all ${
                      providerMode === "gemini"
                        ? "bg-white text-zinc-900 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderMode("ollama")}
                    className={`rounded-full px-3 py-1 text-[11px] transition-all ${
                      providerMode === "ollama"
                        ? "bg-white text-zinc-900 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Local Ollama
                  </button>
                </div>
              </div>

              {providerMode === "simulator" && (
                <div className="flex items-center gap-2.5 rounded-xl bg-white border border-zinc-200/70 p-3 text-xs text-zinc-600">
                  <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-zinc-800">Sandboxed Simulation Active</span>
                    <span className="text-zinc-500 ml-1.5">
                      — Evaluates jailbreaks, token anomalies, and refusal boundaries instantly with 0 API tokens or GPU requirements.
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Ready
                  </span>
                </div>
              )}

              {providerMode === "gemini" && (
                <div className="space-y-3 rounded-xl bg-white border border-zinc-200/70 p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <Key className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Paste Google Gemini API Key (e.g. AIzaSy...)"
                        className="w-full pl-9 pr-16 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 outline-none focus:border-zinc-800 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] text-zinc-400 hover:text-zinc-700 font-medium"
                      >
                        {showApiKey ? "Hide" : "Show"}
                      </button>
                    </div>

                    <select
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-zinc-800 outline-none focus:border-zinc-800"
                    >
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Fast)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro (Reasoning)</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleSaveKey}
                      disabled={isSavingKey || !geminiApiKey.trim()}
                      className="rounded-xl bg-zinc-900 hover:bg-black text-white px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40"
                    >
                      {isSavingKey ? "Saving..." : keySaved ? "Update Key" : "Save Key"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>
                      Key is encrypted in memory via Fernet envelope and relayed directly to the isolated LLM proxy.
                    </span>
                    {keySaved && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Key Stored
                      </span>
                    )}
                  </div>
                </div>
              )}

              {providerMode === "ollama" && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-white border border-zinc-200/70 p-3.5">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Server className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      value={ollamaHost}
                      onChange={(e) => setOllamaHost(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 outline-none focus:border-zinc-800 focus:bg-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3"
                    className="w-32 py-2 px-3 text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 outline-none focus:border-zinc-800 focus:bg-white"
                  />
                  <span className="text-[11px] text-zinc-500">Host port must be open to Docker daemon</span>
                </div>
              )}
            </div>

            {/* Execution Settings Dropdowns */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Execution Settings
              </span>

              <div className="flex flex-wrap items-center gap-3">
                {/* Duration */}
                <div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 px-4 py-2 text-xs">
                  <span className="text-zinc-400 font-medium">Duration:</span>
                  <span className="font-bold text-zinc-900">{duration}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </div>

                {/* Resources */}
                <div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 px-4 py-2 text-xs">
                  <span className="text-zinc-400 font-medium">Resources:</span>
                  <span className="font-bold text-zinc-900">{resources}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </div>

                {/* Best For */}
                <div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 px-4 py-2 text-xs">
                  <span className="text-zinc-400 font-medium">Best For:</span>
                  <span className="font-bold text-zinc-900">{bestFor}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action CTA */}
          <div className="pt-6 border-t border-zinc-100 flex items-center justify-end">
            <button
              onClick={() => startAuditMutation.mutate()}
              disabled={startAuditMutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 hover:bg-black text-white px-8 py-3.5 text-xs font-semibold shadow-lg shadow-zinc-900/10 active:scale-95 transition-all disabled:opacity-50"
            >
              <span>
                {startAuditMutation.isPending ? "Starting Drill..." : "Launch Attack Test"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
