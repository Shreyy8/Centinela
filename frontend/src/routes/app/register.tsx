import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Shield, ArrowRight, Lock, Mail, Building, User } from "lucide-react";
import { api } from "@/lib/api";
import { appRoute, marketingUrl } from "@/config/routes";
import { toast } from "sonner";

export const Route = createFileRoute("/app/register")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Create Account" },
      { name: "description", content: "Create a new CENTINELA security account." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const signupMutation = useMutation({
    mutationFn: (data: any) => api.post("/auth/signup", data),
    onSuccess: () => {
      toast.success("Account created successfully! Please sign in.");
      navigate({ to: appRoute("login") as any });
    },
    onError: (error: any) => {
      toast.error(error.message || "Registration failed. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    signupMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f1f5f9] flex flex-col justify-center items-center px-4 py-12 bg-dots-pattern">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <a href={marketingUrl("/")} className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-mono text-xl font-bold tracking-tight text-white">CENTINELA</span>
          </a>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white">
            Create Security Workspace
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Deploy sovereign AI governance guardrails for your enterprise.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0c0d12]/90 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Work Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 pl-9 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
                  placeholder="ciso@organization.com"
                  required
                />
                <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-white/40" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 pl-9 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
                  placeholder="Minimum 8 characters"
                  required
                />
                <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-white/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{signupMutation.isPending ? "Creating..." : "Create Account"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-white/50">
            Already have an account?{" "}
            <Link to={appRoute("login")} className="text-blue-400 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <a
            href={marketingUrl("/")}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            ← Return to Marketing Home
          </a>
        </div>
      </div>
    </div>
  );
}
