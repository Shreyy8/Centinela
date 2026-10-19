import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Zap,
  ArrowUpRight,
  Play,
  FileCheck2,
  Lock,
  Clock,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { appRoute } from "@/config/routes";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [{ title: "CENTINELA — Security Posture Dashboard" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [activeTab, setActiveTab] = React.useState<"overview" | "audits">("overview");

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. HERO HEADER WITH QUICK ACTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Security Posture Command
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Real-time adversarial resilience telemetry and cryptographic audit readiness across all
            LLM agent fleets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={appRoute("config")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Launch Red-Team Drill</span>
          </Link>
        </div>
      </div>

      {/* 2. REFINED STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-medium uppercase tracking-wider">Fleet Resilience</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-light font-mono text-emerald-400">
              <AnimatedCounter value={92.4} decimals={1} suffix="%" />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">+2.1%</span> vs last audit cycle
            </div>
          </div>
        </SpotlightCard>

        {/* Card 2 */}
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-medium uppercase tracking-wider">
              Threats Neutralized
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-light font-mono text-white">
              <AnimatedCounter value={312} suffix=" blocked" />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
              <span>0 bypasses in 24 hours</span>
            </div>
          </div>
        </SpotlightCard>

        {/* Card 3 */}
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-medium uppercase tracking-wider">Decisions Audited</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-light font-mono text-blue-400">
              <AnimatedCounter value={14802} suffix="K" />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
              <span>Latency: 1.8ms avg</span>
            </div>
          </div>
        </SpotlightCard>

        {/* Card 4 */}
        <SpotlightCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-medium uppercase tracking-wider">Compliance Status</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl font-medium text-white font-mono flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              100% READY
            </div>
            <div className="mt-1 text-[11px] text-white/50">HIPAA • DPDP • NIST AI RMF</div>
          </div>
        </SpotlightCard>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Active Drills & Attack Feed */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-semibold text-white">Active Audit Benchmarks</h2>
                <p className="text-xs text-white/50">
                  Automated safety verification runs and test results
                </p>
              </div>
              <Link
                to={appRoute("audit")}
                search={{ session_id: "default_audit" } as any}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>Live Feed</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Run Item */}
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        Healthcare Audit - HIPAA &amp; PII Validation
                      </span>
                      <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                        COMPLETED
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-white/50 flex flex-wrap gap-3 font-mono">
                      <span>SESSION: default_audit</span>
                      <span>MODEL: gpt-4-turbo</span>
                      <span>RESILIENCE: 84%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={appRoute("results")}
                    search={{ session_id: "default_audit" } as any}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors"
                  >
                    View Certificate
                  </Link>
                  <Link
                    to={appRoute("audit")}
                    search={{ session_id: "default_audit" } as any}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors"
                  >
                    Inspect Telemetry
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Adversarial Attack Vector Matrix */}
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6">
            <h2 className="text-base font-semibold text-white mb-1">Defense Vector Coverage</h2>
            <p className="text-xs text-white/50 mb-4">
              Adversarial categories evaluated during the latest benchmark
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Direct Prompt Injection", score: "100%", status: "Resilient" },
                { name: "DAN Developer Mode Bypass", score: "96.4%", status: "Resilient" },
                { name: "Roleplay & Social Engineering", score: "92.0%", status: "Resilient" },
                { name: "Cipher / Base64 Obfuscation", score: "94.8%", status: "Resilient" },
                { name: "Hypothetical Reframing", score: "88.2%", status: "Moderate" },
                { name: "Adversarial Suffix (GCG)", score: "82.5%", status: "Requires Attn" },
              ].map((v) => (
                <div
                  key={v.name}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center justify-between"
                >
                  <span className="text-xs text-white/80">{v.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white font-medium">{v.score}</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Launch & Policy Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Launch Card */}
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-950/20 to-[#090b10] p-6 shadow-xl shadow-blue-950/20">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Zap className="h-4 w-4" />
              <span>One-Click Verification</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-white">Start Automated Drill</h3>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">
              Synthesize 25 adversarial attacks across HIPAA and PII boundaries and generate a
              signed audit certificate.
            </p>

            <Link
              to={appRoute("config")}
              className="mt-5 block w-full rounded-xl bg-blue-600 py-2.5 text-center text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
            >
              Configure Target &amp; Run
            </Link>
          </div>

          {/* Active Policies Summary */}
          <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Runtime Safety Guardrails</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-white/70">Toxicity &amp; Hate Speech Filter</span>
                <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-white/70">PHI &amp; PII Redaction Proxy</span>
                <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-white/70">Tool Sandbox Boundary Check</span>
                <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-white/70">Merkle Ledger Signatures</span>
                <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
