import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { appRoute } from "@/config/routes";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [{ title: "Centinela — Intelligence Center" }],
  }),
  component: DashboardPage,
});

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. HERO BANNER CARD (Bayora Intelligence Center) */}
      <section className="rounded-[2rem] bg-white border border-zinc-200/70 p-8 sm:p-10 shadow-[0_4px_25px_rgb(0,0,0,0.02)] relative overflow-hidden">
        {/* Subtle ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              <span>WELCOME BACK</span>
            </div>

            {/* Two-tone bold heading */}
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.15]">
              Centinela Intelligence <br />
              <span className="text-purple-600">Center</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base font-normal text-zinc-500 leading-relaxed max-w-xl">
              Monitor, evaluate and secure your AI models — continuous red teaming, safety evidence
              and compliance in one calm surface.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to={appRoute("config")}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-7 py-3 text-xs font-semibold shadow-lg shadow-purple-500/25 transition-all active:scale-95"
            >
              Run New Test
            </Link>

            <Link
              to={appRoute("config")}
              className="inline-flex items-center justify-center rounded-full bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200/80 px-7 py-3 text-xs font-semibold shadow-2xs transition-all active:scale-95"
            >
              Upload Model
            </Link>
          </div>
        </div>
      </section>

      {/* 2. MIDDLE ROW: TESTING TREND (WAVE CHART) & PASS/FAIL DISTRIBUTION (DONUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Testing Trend (Area Wave Chart) */}
        <div className="lg:col-span-7 rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Testing Trend</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Runs vs hallucination rate - last 7 days
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-medium text-zinc-600">
                7 Days
              </span>
            </div>

            {/* SVG Wave Chart */}
            <div className="mt-6 relative h-48 sm:h-56 w-full">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 600 200"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                <line
                  x1="0"
                  y1="30"
                  x2="600"
                  y2="30"
                  stroke="#f4f4f5"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="80"
                  x2="600"
                  y2="80"
                  stroke="#f4f4f5"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line
                  x1="0"
                  y1="130"
                  x2="600"
                  y2="130"
                  stroke="#f4f4f5"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <line x1="0" y1="180" x2="600" y2="180" stroke="#f4f4f5" strokeWidth="1" />

                {/* Y-axis values */}
                <text x="5" y="32" fill="#a1a1aa" fontSize="10" fontFamily="sans-serif">
                  600
                </text>
                <text x="5" y="82" fill="#a1a1aa" fontSize="10" fontFamily="sans-serif">
                  450
                </text>
                <text x="5" y="132" fill="#a1a1aa" fontSize="10" fontFamily="sans-serif">
                  300
                </text>
                <text x="5" y="182" fill="#a1a1aa" fontSize="10" fontFamily="sans-serif">
                  150
                </text>

                {/* Smooth wave area fill */}
                <path
                  d="M 40 180 C 100 180, 140 130, 200 140 C 260 150, 310 80, 370 100 C 430 120, 500 50, 590 55 L 590 190 L 40 190 Z"
                  fill="url(#trendGradient)"
                />

                {/* Wave line stroke */}
                <path
                  d="M 40 180 C 100 180, 140 130, 200 140 C 260 150, 310 80, 370 100 C 430 120, 500 50, 590 55"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Glowing points */}
                <circle cx="200" cy="140" r="3.5" fill="#8B5CF6" />
                <circle cx="370" cy="100" r="3.5" fill="#8B5CF6" />
                <circle cx="590" cy="55" r="4.5" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>

            {/* Days of week */}
            <div className="flex justify-between text-[11px] text-zinc-400 px-6 mt-2 font-medium">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-zinc-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-zinc-600 font-medium">Test runs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-zinc-500">Hallucination %</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pass / Fail Distribution (Donut Chart) */}
        <div className="lg:col-span-5 rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Pass / Fail Distribution</h3>
                <p className="text-xs text-zinc-400 mt-0.5">All evaluation suites</p>
              </div>

              {/* Status metrics count */}
              <div className="space-y-1 text-right text-xs">
                <div className="flex items-center justify-end gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-500">Passed</span>
                  <span className="font-semibold text-zinc-900 font-mono">1,842</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-zinc-500">Warning</span>
                  <span className="font-semibold text-zinc-900 font-mono">316</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-zinc-500">Failed</span>
                  <span className="font-semibold text-zinc-900 font-mono">128</span>
                </div>
              </div>
            </div>

            {/* SVG Donut Ring Chart */}
            <div className="relative flex items-center justify-center my-6">
              <svg className="w-52 h-52 -rotate-90" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle cx="80" cy="80" r="62" fill="none" stroke="#f4f4f5" strokeWidth="16" />

                {/* Green Segment (Passed ~80.6%) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="16"
                  strokeDasharray="314 389"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />

                {/* Amber Segment (Warning ~13.8%) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="16"
                  strokeDasharray="54 389"
                  strokeDashoffset="-324"
                  strokeLinecap="round"
                />

                {/* Red Segment (Failed ~5.6%) */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="16"
                  strokeDasharray="22 389"
                  strokeDashoffset="-384"
                  strokeLinecap="round"
                />
              </svg>

              {/* Centered Total Counter */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">2,286</span>
                <span className="text-xs font-medium text-zinc-400 mt-0.5">total runs</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Overall Fleet Resilience</span>
            <span className="font-bold text-emerald-600 font-mono">92.4%</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM BENTO ROW: SECURITY OVERVIEW, BENCHMARK RADAR, ATTACK SUCCESS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Security Overview (Risk exposure progress bars) */}
        <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-5">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Security Overview</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Risk exposure by category</p>
          </div>

          {/* 8 Categories with Progress Bars */}
          <div className="space-y-3.5 text-xs">
            {/* Jailbreak */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Jailbreak</span>
                <span className="text-rose-500 font-semibold font-mono text-[11px]">High</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-[82%]" />
              </div>
            </div>

            {/* Prompt Injection */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Prompt Injection</span>
                <span className="text-amber-500 font-semibold font-mono text-[11px]">Medium</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full w-[56%]" />
              </div>
            </div>

            {/* Sensitive Data Leakage */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Sensitive Data Leakage</span>
                <span className="text-amber-500 font-semibold font-mono text-[11px]">Medium</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full w-[42%]" />
              </div>
            </div>

            {/* Bias */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Bias</span>
                <span className="text-emerald-500 font-semibold font-mono text-[11px]">Low</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[24%]" />
              </div>
            </div>

            {/* Toxicity */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Toxicity</span>
                <span className="text-emerald-500 font-semibold font-mono text-[11px]">Low</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[16%]" />
              </div>
            </div>

            {/* Hallucination */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Hallucination</span>
                <span className="text-amber-500 font-semibold font-mono text-[11px]">Medium</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full w-[38%]" />
              </div>
            </div>

            {/* Compliance Drift */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Compliance Drift</span>
                <span className="text-emerald-500 font-semibold font-mono text-[11px]">Low</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[18%]" />
              </div>
            </div>

            {/* Supply Chain Risk */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-medium">
                <span className="text-zinc-700">Supply Chain Risk</span>
                <span className="text-emerald-500 font-semibold font-mono text-[11px]">Low</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[12%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Benchmark Profile (Radar Chart) */}
        <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Benchmark Profile</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Atlas 70B • latest suite</p>

            {/* SVG Hexagonal Radar Chart */}
            <div className="relative flex items-center justify-center my-4 py-2">
              <svg className="w-64 h-64 overflow-visible" viewBox="0 0 240 240">
                {/* 3 Concentric Hexagons */}
                <polygon
                  points="120,45 185,82.5 185,157.5 120,195 55,157.5 55,82.5"
                  fill="none"
                  stroke="#e4e4e7"
                  strokeWidth="1"
                />
                <polygon
                  points="120,70 163,95 163,145 120,170 77,145 77,95"
                  fill="none"
                  stroke="#f4f4f5"
                  strokeWidth="1"
                />
                <polygon
                  points="120,95 141,107 141,132 120,145 99,132 99,107"
                  fill="none"
                  stroke="#f4f4f5"
                  strokeWidth="1"
                />

                {/* Axis Radial Lines */}
                <line x1="120" y1="120" x2="120" y2="45" stroke="#e4e4e7" strokeWidth="1" />
                <line x1="120" y1="120" x2="185" y2="82.5" stroke="#e4e4e7" strokeWidth="1" />
                <line x1="120" y1="120" x2="185" y2="157.5" stroke="#e4e4e7" strokeWidth="1" />
                <line x1="120" y1="120" x2="120" y2="195" stroke="#e4e4e7" strokeWidth="1" />
                <line x1="120" y1="120" x2="55" y2="157.5" stroke="#e4e4e7" strokeWidth="1" />
                <line x1="120" y1="120" x2="55" y2="82.5" stroke="#e4e4e7" strokeWidth="1" />

                {/* Radar Values Polygon */}
                <polygon
                  points="120,56 169,92 162,144 120,180 75,146 62,86"
                  fill="rgba(139, 92, 246, 0.16)"
                  stroke="#8B5CF6"
                  strokeWidth="2"
                />

                {/* Radar Vertex Dots */}
                <circle cx="120" cy="56" r="3" fill="#8B5CF6" />
                <circle cx="169" cy="92" r="3" fill="#8B5CF6" />
                <circle cx="162" cy="144" r="3" fill="#8B5CF6" />
                <circle cx="120" cy="180" r="3" fill="#8B5CF6" />
                <circle cx="75" cy="146" r="3" fill="#8B5CF6" />
                <circle cx="62" cy="86" r="3" fill="#8B5CF6" />

                {/* Labels at outer edges */}
                <text
                  x="120"
                  y="32"
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="10"
                  fontWeight="500"
                >
                  Reasoning
                </text>
                <text
                  x="200"
                  y="85"
                  textAnchor="start"
                  fill="#71717a"
                  fontSize="10"
                  fontWeight="500"
                >
                  Safety
                </text>
                <text
                  x="195"
                  y="165"
                  textAnchor="start"
                  fill="#71717a"
                  fontSize="10"
                  fontWeight="500"
                >
                  Robustness
                </text>
                <text
                  x="120"
                  y="215"
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="10"
                  fontWeight="500"
                >
                  Latency
                </text>
                <text x="45" y="165" textAnchor="end" fill="#71717a" fontSize="10" fontWeight="500">
                  Factuality
                </text>
                <text x="45" y="85" textAnchor="end" fill="#71717a" fontSize="10" fontWeight="500">
                  Compliance
                </text>
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Overall Score</span>
            <span className="font-bold text-purple-600 font-mono">82 / 100</span>
          </div>
        </div>

        {/* Card 3: Attack Success (Vertical Bar Chart) */}
        <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-7 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Attack Success</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Successful adversarial prompts</p>

            {/* Vertical Bar Chart */}
            <div className="mt-8 relative h-48 w-full flex items-end justify-between px-6 pb-6">
              {/* Y Axis Guide lines & numbers */}
              <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-zinc-400 font-mono py-1">
                <span>20</span>
                <span>15</span>
                <span>10</span>
                <span>5</span>
                <span>0</span>
              </div>

              {/* Bar 1: Jailbreak (17) */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[45px]">
                <div className="w-full bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-xl h-36 relative group">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded font-mono transition-opacity">
                    17
                  </div>
                </div>
                <span className="text-[11px] font-medium text-zinc-600 text-center truncate">
                  Jailbreak
                </span>
              </div>

              {/* Bar 2: Leakage (12) */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[45px]">
                <div className="w-full bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-xl h-24 relative group">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded font-mono transition-opacity">
                    12
                  </div>
                </div>
                <span className="text-[11px] font-medium text-zinc-600 text-center truncate">
                  Leakage
                </span>
              </div>

              {/* Bar 3: Toxicity (7) */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[45px]">
                <div className="w-full bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-xl h-14 relative group">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded font-mono transition-opacity">
                    7
                  </div>
                </div>
                <span className="text-[11px] font-medium text-zinc-600 text-center truncate">
                  Toxicity
                </span>
              </div>

              {/* Bar 4: Bias (10) */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[45px]">
                <div className="w-full bg-gradient-to-t from-purple-400 to-purple-300 rounded-t-xl h-20 relative group">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded font-mono transition-opacity">
                    10
                  </div>
                </div>
                <span className="text-[11px] font-medium text-zinc-600 text-center truncate">
                  Bias
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>Total Attempts</span>
            <span className="font-bold text-zinc-800 font-mono">46 Prompts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
