import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Shield, ArrowRight, Lock, Mail, Key } from "lucide-react";
import { api } from "@/lib/api";
import { appRoute, marketingUrl } from "@/config/routes";
import { toast } from "sonner";

export const Route = createFileRoute("/app/login")({
  head: () => ({
    meta: [
      { title: "CENTINELA — Sign In" },
      { name: "description", content: "Sign in to your CENTINELA security console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("sarah.chen@northwind.health");
  const [password, setPassword] = React.useState("password123");

  const loginMutation = useMutation({
    mutationFn: (data: any) => api.post("/auth/login", data),
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_email", data.email || email);
      toast.success("Successfully authenticated!");
      navigate({ to: appRoute("dashboard") as any });
    },
    onError: (error: any) => {
      toast.error(error.message || "Login failed. Please check your credentials.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    loginMutation.mutate({ email, password });
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
            Security Console Sign In
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Enter your credentials to access the sovereign AI control plane.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-[#0c0d12]/90 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 pl-9 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
                  placeholder="name@company.com"
                  required
                />
                <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-white/40" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <label className="font-medium text-white/70">Password</label>
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 pl-9 text-xs text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-white/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loginMutation.isPending ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-white/50">
            Don&apos;t have an account?{" "}
            <Link to={appRoute("register")} className="text-blue-400 font-semibold hover:underline">
              Create account
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
