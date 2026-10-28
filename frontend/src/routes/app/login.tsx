import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { appRoute, marketingUrl } from "@/config/routes";
import { toast } from "sonner";

export const Route = createFileRoute("/app/login")({
  head: () => ({
    meta: [
      { title: "Centinela — Sign In" },
      { name: "description", content: "Sign in to your Centinela security console." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("ayush47brohaiking@gmail.com");
  const [password, setPassword] = React.useState("password123");

  const loginMutation = useMutation({
    mutationFn: (data: any) => api.post("/auth/login", data),
    onSuccess: (data) => {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_email", data.email || email);
      document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `user_email=${encodeURIComponent(data.email || email)}; path=/; max-age=86400; SameSite=Lax`;
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
    <div className="min-h-screen bg-[#edf2f7] text-zinc-900 font-sans flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden antialiased">
      {/* Ambient ethereal glow mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-[130px]" />
        <div className="absolute top-1/4 -right-32 w-[550px] h-[550px] rounded-full bg-purple-100/50 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <a href={marketingUrl("/")} className="inline-block">
            <span className="text-3xl font-extrabold tracking-tight text-zinc-900">Centinela</span>
          </a>
          <h2 className="text-xl font-bold tracking-tight text-zinc-800">
            Sign in to your workspace
          </h2>
          <p className="text-xs text-zinc-500">
            Continuous red-teaming, safety evidence and compliance.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 pl-9 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-800 focus:outline-none"
                  placeholder="name@company.com"
                  required
                />
                <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
                <a href="#" className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 pl-9 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-800 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 w-full rounded-full bg-zinc-900 hover:bg-black py-3 text-xs font-semibold text-white active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{loginMutation.isPending ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-100 text-center text-xs text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link to={appRoute("register")} className="text-zinc-900 font-bold hover:underline">
              Create account
            </Link>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <a
            href={marketingUrl("/")}
            className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            ← Return to Marketing Home
          </a>
        </div>
      </div>
    </div>
  );
}
