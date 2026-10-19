import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  Shield,
  ArrowRight,
  Check,
  Search,
  ExternalLink,
  ChevronDown,
  Terminal,
  Cpu,
  Lock,
  Layers,
  FileCheck,
  Zap,
} from "lucide-react";
import { appUrl } from "@/config/routes";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { ParticleWave } from "@/components/ui/particle-wave";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Sovereign Agentic AI Governance & Security" },
      {
        name: "description",
        content:
          "Strict monochrome control plane for enterprise AI. Real-time reverse proxy interception, tool sandbox validation, and cryptographically signed Merkle audit proof.",
      },
      { property: "og:title", content: "CENTINELA — Sovereign Agentic AI Governance & Security" },
      {
        property: "og:description",
        content:
          "Autonomous agent security, semantic reverse proxying, and cryptographic audit records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

/* =========================================================================
   PURE MONOCHROME LANDING PAGE COMPONENT (BAYORA-TIER)
   ========================================================================= */
function LandingPage() {
  const [proxyMode, setProxyMode] = React.useState<"intercept" | "validate" | "prove">("intercept");
  const [annualBilling, setAnnualBilling] = React.useState(true);

  return (
    <div className="min-h-screen bg-[#040404] text-white selection:bg-white selection:text-black">
      {/* ===================================================================
          1. FLOATING GLASS NAVBAR (DETACHED PILL)
          =================================================================== */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4 sm:pt-6 pointer-events-none">
        <div className="mx-auto max-w-6xl rounded-full border border-white/10 bg-[#080808]/85 px-4 sm:px-6 py-2.5 backdrop-blur-2xl shadow-2xl pointer-events-auto flex items-center justify-between">
          {/* Typographic Minimalist Brand */}
          <a href="#" className="flex items-center gap-2 group">
            <span className="font-mono text-sm tracking-[0.25em] font-semibold text-white group-hover:text-white/80 transition-colors">
              CENTINELA
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          </a>

          {/* Nav Links (Slim Editorial Style) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-light text-white/60">
            <a href="#gap" className="hover:text-white transition-colors">
              Security Gap
            </a>
            <a href="#capabilities" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <a href="#proxy" className="hover:text-white transition-colors">
              Proxy Control
            </a>
            <a href="#evidence" className="hover:text-white transition-colors">
              Proof
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action Pills */}
          <div className="flex items-center gap-3">
            <a
              href={appUrl("/dashboard")}
              className="hidden sm:inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white transition-colors px-2 py-1"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="border border-white/15 rounded px-1.5 py-0.5 text-[10px]">⌘K</span>
            </a>

            <a
              href={appUrl("/dashboard")}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 sm:px-5 py-2 text-xs font-medium text-black transition-all hover:bg-neutral-200 active:scale-[0.98] shadow-lg shadow-white/5"
            >
              <span>Launch Console</span>
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      {/* ===================================================================
          2. HERO SECTION: MASSIVE SLIM TYPOGRAPHY + SUBTLE AMBIENT FIELD
          =================================================================== */}
      <section className="relative min-h-[92dvh] flex flex-col justify-center items-center px-6 pt-32 pb-20 text-center overflow-hidden">
        {/* Subtle radial monochrome ambient aura */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-white/[0.035] rounded-full blur-[140px]" />
          {/* Concentric subtle orbit lines */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full border border-white/[0.04] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[980px] rounded-full border border-white/[0.02] pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.02] px-4 py-1.5 text-[10px] font-mono tracking-eyebrow text-white/60 uppercase backdrop-blur-md mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span>FUTURISTIC / SOVEREIGN AI GOVERNANCE</span>
          </div>

          {/* Huge Netron Brand Heading */}
          <h1 className="font-netron text-5xl sm:text-7xl md:text-8xl lg:text-9xl tracking-wider text-white uppercase select-none leading-none">
            CENTINELA
          </h1>

          {/* Subtitle */}
          <p className="mt-8 max-w-2xl text-base sm:text-xl font-light text-white/60 leading-relaxed tracking-tight">
            Autonomous agent safety, semantic reverse proxying, and cryptographically signed audit
            records. Hard limits for machines that think for themselves.
          </p>

          {/* Pure 2-Color CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href={appUrl("/config")}
              className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-3.5 text-xs font-semibold text-black tracking-wide transition-all hover:bg-neutral-200 active:scale-[0.98] shadow-2xl shadow-white/10"
            >
              <span>Get Started</span>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                <ArrowRight className="h-3 w-3 text-black" />
              </div>
            </a>

            <a
              href="mailto:security@centinela.ai"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-8 py-3.5 text-xs font-medium text-white/80 transition-all hover:border-white/50 hover:text-white hover:bg-white/[0.03] active:scale-[0.98]"
            >
              <span>Contact Architecture Team</span>
            </a>
          </div>

          {/* Live Micro-Proof Counters */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 border-t border-white/10 pt-8 w-full max-w-4xl text-left">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40">
                DECISIONS AUDITED
              </div>
              <div className="mt-1 text-2xl font-light tracking-tight text-white">
                <AnimatedCounter to={14802194} />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40">
                PROXY LATENCY
              </div>
              <div className="mt-1 text-2xl font-light tracking-tight text-white">
                &lt; 3.8<span className="text-sm font-mono text-white/50">ms</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40">
                THREATS INTERCEPTED
              </div>
              <div className="mt-1 text-2xl font-light tracking-tight text-white">
                <AnimatedCounter to={312} />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40">
                LEDGER COMPLIANCE
              </div>
              <div className="mt-1 text-2xl font-light tracking-tight text-white flex items-center gap-2">
                <span>DPDP / HIPAA</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          3. SECTION: THE SECURITY GAP (SPLIT VIEW WITH 3D PARTICLE WAVE)
          =================================================================== */}
      <section id="gap" className="py-28 sm:py-36 border-t border-white/10 bg-[#000000] relative">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40">
                THE SECURITY GAP
              </div>

              <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white leading-tight">
                Your security stack was built for a world where software waited for instructions.
              </h2>

              <p className="text-sm sm:text-base font-light text-white/60 leading-relaxed">
                That world ended. Your AI agents now reason, decide, and act on their own. They call
                APIs, query databases, move money, and talk to other agents while your firewall
                watches the network and sees nothing wrong.
              </p>

              <p className="text-sm sm:text-base font-light text-white/60 leading-relaxed">
                Legacy security tools audit packets and endpoints. They are structurally blind to
                what happens inside a reasoning loop. They cannot read agentic intent. They cannot
                catch a hallucination dressed as a valid API call. They cannot stop an agent that
                talked itself into a decision no human approved.
              </p>

              <p className="text-sm sm:text-base font-light text-white/60 leading-relaxed">
                Traditional firewalls allow 100 percent of LLM traffic through. Not because they
                trust it. Because they cannot see it.
              </p>

              <div className="pt-2 text-sm font-mono text-white/90">
                Centinela lives inside the semantic loop. We secure behaviors, not just routes.
              </div>
            </div>

            {/* Right Column: Double-Bezel Card with Generative 3D Particle Wave */}
            <div className="lg:col-span-5">
              <div className="double-bezel">
                <div className="double-bezel-inner p-6 flex flex-col justify-between h-[360px] relative overflow-hidden">
                  {/* Visual wave container */}
                  <div className="absolute inset-x-0 top-0 bottom-16 opacity-90">
                    <ParticleWave dotColor="255, 255, 255" amplitude={22} frequency={0.045} />
                  </div>

                  {/* Top caption */}
                  <div className="relative z-10 flex items-center justify-between text-[10px] font-mono tracking-eyebrow text-white/40">
                    <span>VISUAL REPRESENTATION</span>
                    <span className="flex items-center gap-1.5 text-white/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      LIVE MESH
                    </span>
                  </div>

                  {/* Bottom tagline */}
                  <div className="relative z-10 pt-4 border-t border-white/5">
                    <div className="text-base font-light text-white tracking-tight">
                      Where firewalls go blind, Centinela starts watching.
                    </div>
                    <div className="text-xs font-mono text-white/40 mt-1">
                      Real-time semantic loop inspection
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          4. SECTION: CAPABILITIES (6 BENTO CARDS WITH NUMBERED TAXONOMY)
          =================================================================== */}
      <section id="capabilities" className="py-28 sm:py-36 border-t border-white/10 bg-[#040404]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40 mb-3">
              CAPABILITIES
            </div>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white">
              Hard limits for machines that think for themselves.
            </h2>
            <p className="mt-4 text-sm sm:text-base font-light text-white/60 leading-relaxed">
              Autonomy without boundaries is not intelligence. It is exposure. Centinela draws the
              lines your agents cannot cross and proves they never did.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Orchestration */}
            <SpotlightCard className="p-7 rounded-2xl border border-white/10 bg-[#080808] flex flex-col justify-between min-h-[260px] hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-eyebrow text-white/40 mb-6">
                  <span>01 / ORCHESTRATION</span>
                  <Cpu className="h-4 w-4 text-white/40" />
                </div>
                <h3 className="text-lg font-light text-white tracking-tight">
                  Agents talk. We listen.
                </h3>
                <p className="mt-3 text-xs sm:text-sm font-light text-white/60 leading-relaxed">
                  When your agents collaborate, they whisper to each other in ways no log file
                  captures. Centinela audits every inter-agent pathway, stopping recursive loops and
                  prompt cascades before one compromised agent infects the rest.
                </p>
              </div>
            </SpotlightCard>

            {/* Card 2: Actions */}
            <SpotlightCard className="p-7 rounded-2xl border border-white/10 bg-[#080808] flex flex-col justify-between min-h-[260px] hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-eyebrow text-white/40 mb-6">
                  <span>02 / ACTIONS</span>
                  <Lock className="h-4 w-4 text-white/40" />
                </div>
                <h3 className="text-lg font-light text-white tracking-tight">
                  Every decision faces a checkpoint.
                </h3>
                <p className="mt-3 text-xs sm:text-sm font-light text-white/60 leading-relaxed">
                  Before an agent touches your production API or writes to your database, its
                  decision passes through Centinela. Unsafe intent dies at the gate. Safe intent
                  moves in milliseconds.
                </p>
              </div>
            </SpotlightCard>

            {/* Card 3: Tracing */}
            <SpotlightCard className="p-7 rounded-2xl border border-white/10 bg-[#080808] flex flex-col justify-between min-h-[260px] hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-eyebrow text-white/40 mb-6">
                  <span>03 / TRACING</span>
                  <Layers className="h-4 w-4 text-white/40" />
                </div>
                <h3 className="text-lg font-light text-white tracking-tight">
                  Your agents stay inside the lines.
                </h3>
                <p className="mt-3 text-xs sm:text-sm font-light text-white/60 leading-relaxed">
                  File access, database queries, system hooks. Every tool your agent reaches for is
                  validated against its sandbox. It goes where you allowed. Nowhere else.
                </p>
              </div>
            </SpotlightCard>

            {/* Card 4: Proof */}
            <SpotlightCard className="p-7 rounded-2xl border border-white/10 bg-[#080808] flex flex-col justify-between min-h-[260px] hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-eyebrow text-white/40 mb-6">
                  <span>04 / PROOF</span>
                  <FileCheck className="h-4 w-4 text-white/40" />
                </div>
                <h3 className="text-lg font-light text-white tracking-tight">
                  Evidence, not promises.
                </h3>
                <p className="mt-3 text-xs sm:text-sm font-light text-white/60 leading-relaxed">
                  Every intent, output, and validation is cryptographically signed into a
                  tamper-proof record. When a regulator asks what your AI did on a Tuesday in March,
                  you hand them proof instead of a shrug.
                </p>
              </div>
            </SpotlightCard>

            {/* Card 5: Policies */}
            <SpotlightCard className="p-7 rounded-2xl border border-white/10 bg-[#080808] flex flex-col justify-between min-h-[260px] hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-eyebrow text-white/40 mb-6">
                  <span>05 / POLICIES</span>
                  <Terminal className="h-4 w-4 text-white/40" />
                </div>
                <h3 className="text-lg font-light text-white tracking-tight">
                  Change the rules without touching the model.
                </h3>
                <p className="mt-3 text-xs sm:text-sm font-light text-white/60 leading-relaxed">
                  Toxicity filters, PII scrubbing, brand guidelines, safety policies. Injected live
                  at the gateway. No retraining. No redeployment. New rule at breakfast, enforced by
                  lunch.
                </p>
              </div>
            </SpotlightCard>

            {/* Card 6: Performance */}
            <SpotlightCard className="p-7 rounded-2xl border border-white/10 bg-[#080808] flex flex-col justify-between min-h-[260px] hover:border-white/25 transition-all">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono tracking-eyebrow text-white/40 mb-6">
                  <span>06 / PERFORMANCE</span>
                  <Zap className="h-4 w-4 text-white/40" />
                </div>
                <h3 className="text-lg font-light text-white tracking-tight">
                  Governance that pays for itself.
                </h3>
                <p className="mt-3 text-xs sm:text-sm font-light text-white/60 leading-relaxed">
                  Track cost per execution, watch latency in real time, and let intelligent routing
                  pick the right model for every call. Safety and savings from the same gateway.
                </p>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ===================================================================
          5. SECTION: PROXY CONTROL (INTERACTIVE SPLIT CONSOLE: INTERCEPT/VALIDATE/PROVE)
          =================================================================== */}
      <section id="proxy" className="py-28 sm:py-36 border-t border-white/10 bg-[#000000]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl mb-14">
            <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40 mb-3">
              PROXY CONTROL
            </div>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white leading-tight">
              One loop between your agents and everything they can break.
            </h2>
            <p className="mt-4 text-sm sm:text-base font-light text-white/60 leading-relaxed">
              Centinela deploys as a reverse proxy in front of your models. Every prompt, every
              agent thought, every tool call passes through before it reaches the LLM or leaves it.
              Intercept. Validate. Prove. Three verbs standing between you and the headline you
              never want to read.
            </p>
            <p className="mt-2 text-xs font-mono text-white/40">
              Integration is one endpoint change. Your developers keep their stack. Your agents keep
              their speed. You gain a control plane.
            </p>
          </div>

          {/* Interactive Mode Pills */}
          <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4">
            {(["intercept", "validate", "prove"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setProxyMode(mode)}
                className={`rounded-full px-5 py-2 text-xs font-mono tracking-wider transition-all uppercase ${
                  proxyMode === mode
                    ? "bg-white text-black font-semibold shadow-md"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Split Console Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Console: Simulated Gateway View */}
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#080808] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-xs text-white/80">SIMULATED GATEWAY VIEW</span>
                  </div>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/50">
                    Active Policy: v2.4
                  </span>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <div className="text-[10px] font-mono tracking-eyebrow text-white/40">
                      DECISIONS AUDITED
                    </div>
                    <div className="text-2xl font-light text-white mt-1">14,802,194</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono tracking-eyebrow text-white/40">
                      THREATS BLOCKED IN 24 HOURS
                    </div>
                    <div className="text-2xl font-light text-white mt-1">312</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono tracking-eyebrow text-white/40">
                      COMPLIANCE STATUS
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      DPDP & HIPAA PASSED
                    </div>
                  </div>
                </div>
              </div>

              {/* Laser / Shield Graphic */}
              <div className="mt-8 rounded-xl border border-white/5 bg-black/60 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-white/80">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-mono text-white/80">SHIELD ACTIVE</div>
                </div>
                <div className="text-[10px] font-mono text-white/40">LATTICE ENCRYPTION</div>
              </div>
            </div>

            {/* Right Console: Code / Inspection Workflow */}
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#060606] p-6 flex flex-col justify-between font-mono text-xs">
              <div>
                <div className="flex items-center justify-between text-white/40 border-b border-white/5 pb-3 mb-4">
                  <span>&gt; WORKFLOW CONSOLE</span>
                  <span className="text-[10px]">REVERSE_PROXY_DAEMON</span>
                </div>

                {proxyMode === "intercept" && (
                  <div className="space-y-3 text-white/80">
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Centinela acts as a secure reverse proxy, intercepting prompt requests, agent
                      thoughts, and API calls before they reach the model.
                    </p>
                    <pre className="overflow-x-auto rounded-xl bg-black p-4 text-[11px] leading-relaxed text-white/90 border border-white/5">
                      <code>{`// Centinela Gateway Handshake
const response = await centinela.proxy({
  agentId: "agent-claims-processor-v4",
  intent: "execute-wire-transfer",
  params: { amount: 15000, currency: "INR" },
  checkpoint: "STRICT_HUMAN_IN_THE_LOOP"
});

// Gateway Intercept Decision:
// -> Target API call held in buffer
// -> Evaluating semantic policy rule: "WIRE_LIMIT_MAX_10000"`}</code>
                    </pre>
                  </div>
                )}

                {proxyMode === "validate" && (
                  <div className="space-y-3 text-white/80">
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Tool sandbox enforcement: every database query, filesystem write, or HTTP call
                      is evaluated against strict declarative safety policies.
                    </p>
                    <pre className="overflow-x-auto rounded-xl bg-black p-4 text-[11px] leading-relaxed text-white/90 border border-white/5">
                      <code>{`// Sandbox Tool Validation Matrix
[VALIDATING] postgres.query("SELECT * FROM patient_records")
[POLICY_CHECK] HIPAA_PHI_RESTRICTION: Active
[ACTION] Sanitizing columns: ['ssn', 'medical_history', 'dob']
[RESULT] Transformed query forwarded to DB in 1.4ms
[STATUS] ZERO UNPRIVILEGED LEAKS DETECTED`}</code>
                    </pre>
                  </div>
                )}

                {proxyMode === "prove" && (
                  <div className="space-y-3 text-white/80">
                    <p className="text-white/50 text-[11px] leading-relaxed">
                      Tamper-proof Merkle chain: every prompt, intermediate reasoning token, and
                      output is hashed and permanently committed to an immutable ledger.
                    </p>
                    <pre className="overflow-x-auto rounded-xl bg-black p-4 text-[11px] leading-relaxed text-white/90 border border-white/5">
                      <code>{`// Merkle Cryptographic Record
Session: audit_1019_9bf41c
Block Height: #52
SHA-256 Root: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Digital Signature: Ed25519 Verified
Audit Status: COMPLIANT_FORENSIC_RECORD_LOCKED`}</code>
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                <span>Latency overhead: 2.1ms</span>
                <a
                  href={appUrl("/config")}
                  className="text-white hover:underline flex items-center gap-1 font-mono"
                >
                  Configure rules in console &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          6. SECTION: EVIDENCE & CRYPTOGRAPHIC LEDGER
          =================================================================== */}
      <section id="evidence" className="py-28 sm:py-36 border-t border-white/10 bg-[#040404]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl mb-16">
            <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40 mb-3">
              EVIDENCE LEDGER
            </div>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white">
              Forensics you can hand to a federal regulator.
            </h2>
            <p className="mt-4 text-sm sm:text-base font-light text-white/60 leading-relaxed">
              When an autonomous agent makes a mistake in production, standard logs offer excuses.
              Centinela produces a cryptographically sealed chain of custody.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#080808] p-8 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-white/10 pb-10">
              <div>
                <div className="text-[10px] font-mono tracking-eyebrow text-white/40">
                  CHAIN ARCHITECTURE
                </div>
                <div className="text-lg font-light text-white mt-1">SHA-256 Merkle Chaining</div>
                <p className="text-xs text-white/50 mt-2 font-light leading-relaxed">
                  Every interaction creates a parent-child cryptographic relationship. Altering a
                  single character invalidates the entire tree.
                </p>
              </div>

              <div>
                <div className="text-[10px] font-mono tracking-eyebrow text-white/40">
                  SIGNATURE SCHEME
                </div>
                <div className="text-lg font-light text-white mt-1">Ed25519 + Post-Quantum</div>
                <p className="text-xs text-white/50 mt-2 font-light leading-relaxed">
                  Lattice-based digital signatures ensure your audit trails withstand future quantum
                  cryptanalysis.
                </p>
              </div>

              <div>
                <div className="text-[10px] font-mono tracking-eyebrow text-white/40">
                  EXPORT STANDARD
                </div>
                <div className="text-lg font-light text-white mt-1">
                  PDF &amp; JSON-LD Forensic Dossier
                </div>
                <p className="text-xs text-white/50 mt-2 font-light leading-relaxed">
                  One-click export of court-admissible audit reports compliant with the EU AI Act
                  and India&#39;s DPDP Act 2023.
                </p>
              </div>
            </div>

            <div className="pt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Zero Tampering Detected Across 52,000+ Verified Blocks</span>
              </div>
              <a
                href={appUrl("/results?session_id=default_audit")}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-5 py-2 text-xs font-mono text-white hover:bg-white/[0.08] transition-colors"
              >
                <span>View Sample Verified Certificate</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          7. SECTION: MINIMALIST MONOCHROME PRICING
          =================================================================== */}
      <section id="pricing" className="py-28 sm:py-36 border-t border-white/10 bg-[#000000]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40 mb-3">
                PRICING
              </div>
              <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white">
                Predictable sovereign scaling.
              </h2>
            </div>

            {/* Monthly / Annual Toggle */}
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#080808] p-1 text-xs">
              <button
                onClick={() => setAnnualBilling(false)}
                className={`rounded-full px-4 py-1.5 transition-colors ${
                  !annualBilling
                    ? "bg-white text-black font-semibold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnualBilling(true)}
                className={`rounded-full px-4 py-1.5 transition-colors flex items-center gap-1.5 ${
                  annualBilling
                    ? "bg-white text-black font-semibold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <span>Annual</span>
                <span className="rounded bg-black/10 px-1 text-[10px] font-mono">SAVE 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Developer Tier */}
            <div className="rounded-2xl border border-white/10 bg-[#060606] p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-white/40">
                  DEVELOPER
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-light text-white">$0</span>
                  <span className="text-xs font-mono text-white/40">/ month</span>
                </div>
                <p className="mt-3 text-xs font-light text-white/60 leading-relaxed">
                  Ideal for testing local LLM agents and synthetic jailbreak benchmarks.
                </p>

                <ul className="mt-8 space-y-3 text-xs font-light text-white/80">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white/40" /> Up to 10,000 requests/mo
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white/40" /> Basic AdvBench safety drills
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white/40" /> Community Discord support
                  </li>
                </ul>
              </div>

              <a
                href={appUrl("/config")}
                className="mt-10 block w-full rounded-full border border-white/20 bg-transparent py-2.5 text-center text-xs font-medium text-white hover:border-white/50 transition-colors"
              >
                Start Free Drill
              </a>
            </div>

            {/* Enterprise Tier (Highlighted with pure white button) */}
            <div className="rounded-2xl border border-white/25 bg-[#0a0a0a] p-8 flex flex-col justify-between relative shadow-2xl shadow-white/5">
              <div className="absolute -top-3 right-6 rounded-full bg-white px-3 py-0.5 text-[10px] font-mono font-semibold text-black uppercase tracking-wider">
                RECOMMENDED
              </div>

              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-white/40">
                  ENTERPRISE
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-light text-white">
                    ${annualBilling ? "399" : "499"}
                  </span>
                  <span className="text-xs font-mono text-white/40">/ month</span>
                </div>
                <p className="mt-3 text-xs font-light text-white/60 leading-relaxed">
                  Full semantic reverse proxy, automated jailbreak synthesis, and court-admissible
                  Merkle certificates.
                </p>

                <ul className="mt-8 space-y-3 text-xs font-light text-white/80">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white" /> 500,000 proxy calls/mo
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white" /> Real-time tool sandboxing
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white" /> DPDP Act 2023 &amp; HIPAA
                    certification
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white" /> Signed Merkle ledger PDF export
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white" /> 99.99% uptime SLA
                  </li>
                </ul>
              </div>

              <a
                href={appUrl("/config")}
                className="mt-10 block w-full rounded-full bg-white py-3 text-center text-xs font-semibold text-black hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10"
              >
                Deploy Enterprise Console
              </a>
            </div>

            {/* Sovereign Air-Gapped */}
            <div className="rounded-2xl border border-white/10 bg-[#060606] p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-white/40">
                  SOVEREIGN / AIR-GAPPED
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-light text-white">Custom</span>
                </div>
                <p className="mt-3 text-xs font-light text-white/60 leading-relaxed">
                  On-premises Kubernetes deployment for defense contractors, banks, and national
                  health networks.
                </p>

                <ul className="mt-8 space-y-3 text-xs font-light text-white/80">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white/40" /> Unlimited throughput
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white/40" /> Air-gapped bare-metal installs
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white/40" /> Hardware Security Module (HSM)
                    keys
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 text-white/40" /> Dedicated security architect
                  </li>
                </ul>
              </div>

              <a
                href="mailto:security@centinela.ai"
                className="mt-10 block w-full rounded-full border border-white/20 bg-transparent py-2.5 text-center text-xs font-medium text-white hover:border-white/50 transition-colors"
              >
                Contact CISO Desk
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          8. SECTION: FAQ ACCORDION (SLIM TYPOGRAPHY)
          =================================================================== */}
      <section id="faq" className="py-28 sm:py-36 border-t border-white/10 bg-[#040404]">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-14 text-center">
            <div className="text-[11px] font-mono uppercase tracking-eyebrow text-white/40 mb-3">
              SPECIFICATIONS
            </div>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white">
              Frequently Answered Architecture
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="item-1"
              className="rounded-2xl border border-white/10 bg-[#080808] px-6 py-2"
            >
              <AccordionTrigger className="text-left text-sm font-light text-white hover:no-underline py-4">
                How does Centinela intercept prompt injection without adding latency?
              </AccordionTrigger>
              <AccordionContent className="text-xs font-light text-white/60 leading-relaxed pb-4">
                Centinela runs a compiled C++ semantic proxy layer deployed on edge nodes adjacent
                to major model providers. Inspection occurs in parallel with TCP stream
                establishment, adding an imperceptible overhead of under 3.8 milliseconds.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-2"
              className="rounded-2xl border border-white/10 bg-[#080808] px-6 py-2"
            >
              <AccordionTrigger className="text-left text-sm font-light text-white hover:no-underline py-4">
                Does Centinela store customer prompts or patient data?
              </AccordionTrigger>
              <AccordionContent className="text-xs font-light text-white/60 leading-relaxed pb-4">
                No. Centinela adheres to a zero-knowledge architecture. Only cryptographic hashes
                and anonymized classification telemetry are recorded to the Merkle ledger. All raw
                payloads are processed ephemerally in RAM and wiped upon connection termination.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-3"
              className="rounded-2xl border border-white/10 bg-[#080808] px-6 py-2"
            >
              <AccordionTrigger className="text-left text-sm font-light text-white hover:no-underline py-4">
                Is Centinela compliant with India&#39;s DPDP Act 2023 and the EU AI Act?
              </AccordionTrigger>
              <AccordionContent className="text-xs font-light text-white/60 leading-relaxed pb-4">
                Yes. Centinela was engineered specifically for statutory audit compliance,
                supporting automated PII redaction under the Digital Personal Data Protection Act
                2023 and Article 14 human-in-the-loop audit trails required by the EU Artificial
                Intelligence Act.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="item-4"
              className="rounded-2xl border border-white/10 bg-[#080808] px-6 py-2"
            >
              <AccordionTrigger className="text-left text-sm font-light text-white hover:no-underline py-4">
                Can I run Centinela fully offline in an air-gapped sovereign VPC?
              </AccordionTrigger>
              <AccordionContent className="text-xs font-light text-white/60 leading-relaxed pb-4">
                Yes. The Sovereign tier provides containerized Helm charts and offline license keys
                for air-gapped Kubernetes clusters with local Ollama or vLLM inference engines.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ===================================================================
          9. FINAL CTA SECTION & RICH MINIMALIST FOOTER
          =================================================================== */}
      <section className="py-24 border-t border-white/10 bg-[#000000] text-center">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl sm:text-5xl font-light tracking-tight text-white">
            Deploy your first AI safety audit in under 60 seconds.
          </h2>
          <p className="mt-4 text-sm font-light text-white/60 max-w-lg mx-auto">
            Connect your API endpoint, execute automated adversarial attack drills, and download
            your signed compliance certificate.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={appUrl("/config")}
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs font-semibold text-black hover:bg-neutral-200 transition-all shadow-xl shadow-white/10"
            >
              <span>Launch Security Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>

            <a
              href={appUrl("/login")}
              className="rounded-full border border-white/20 bg-white/[0.04] px-8 py-3.5 text-xs font-medium text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              Sign In to Existing Workspace
            </a>
          </div>
        </div>
      </section>

      {/* Minimalist Monochrome Footer */}
      <footer className="border-t border-white/10 bg-[#040404] py-16 text-xs text-white/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm tracking-[0.25em] font-semibold text-white">
                  CENTINELA
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <p className="mt-4 max-w-sm text-xs font-light text-white/50 leading-relaxed">
                Sovereign agentic AI governance &amp; adversarial security platform. Hard limits for
                machines that think for themselves.
              </p>
              <div className="mt-4 flex items-center gap-2 text-white/70 font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ALL SYSTEMS OPERATIONAL
              </div>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-eyebrow text-white/80">
                Product
              </div>
              <ul className="mt-4 space-y-2 font-light">
                <li>
                  <a href={appUrl("/dashboard")} className="hover:text-white transition-colors">
                    Dashboard
                  </a>
                </li>
                <li>
                  <a href={appUrl("/config")} className="hover:text-white transition-colors">
                    Configure Audit
                  </a>
                </li>
                <li>
                  <a href={appUrl("/audit")} className="hover:text-white transition-colors">
                    Live Telemetry
                  </a>
                </li>
                <li>
                  <a href={appUrl("/results")} className="hover:text-white transition-colors">
                    Certificates &amp; Proof
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-eyebrow text-white/80">
                Compliance
              </div>
              <ul className="mt-4 space-y-2 font-light text-white/60">
                <li>HIPAA Security</li>
                <li>EU AI Act Article 14</li>
                <li>India DPDP Act 2023</li>
                <li>NIST AI RMF 1.0</li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-eyebrow text-white/80">
                Company
              </div>
              <ul className="mt-4 space-y-2 font-light">
                <li>
                  <a href="#capabilities" className="hover:text-white transition-colors">
                    Capabilities
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:security@centinela.ai"
                    className="hover:text-white transition-colors"
                  >
                    Contact CISO
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/40">
            <div>
              &copy; {new Date().getFullYear()} Centinela AI Security Platform. Pure Monochrome
              Edition.
            </div>
            <div className="flex gap-6 font-mono text-[10px]">
              <span>ED25519 POST-QUANTUM</span>
              <span>TIER IV SOVEREIGN HOSTING</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
