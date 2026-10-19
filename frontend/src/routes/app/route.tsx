import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  LayoutDashboard,
  Sliders,
  Shield,
  FileCheck2,
  User,
  Home,
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Sparkles,
  Play,
  Lock,
  Building2,
  ChevronsUpDown,
} from "lucide-react";
import { appRoute, marketingUrl } from "@/config/routes";
import { CommandPalette } from "@/components/ui/command-palette";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { IS_DEMO_MODE } from "@/lib/api";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV_ITEMS = [
  { to: appRoute("dashboard"), label: "Dashboard", icon: LayoutDashboard },
  { to: appRoute("config"), label: "Configure Audit", icon: Sliders },
  { to: appRoute("audit"), label: "Live Telemetry", icon: Shield },
  { to: appRoute("results"), label: "Certificates", icon: FileCheck2 },
  { to: appRoute("profile"), label: "CISO Profile", icon: User },
] as const;

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState("sarah.chen@northwind.health");

  // Check auth
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("user_email");
    if (email) setUserEmail(email);

    // Auth guard for protected routes (except login & register)
    if (
      !IS_DEMO_MODE &&
      !token &&
      pathname !== appRoute("login") &&
      pathname !== appRoute("register")
    ) {
      navigate({
        to: appRoute("login") as any,
        search: { redirect: pathname } as any,
      });
    }
  }, [pathname, navigate]);

  // Is auth screen (login or register)? If so, render without sidebar/topbar
  const isAuthScreen = pathname === appRoute("login") || pathname === appRoute("register");

  if (isAuthScreen) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f1f5f9]">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#f1f5f9] flex">
      {/* 1. COLLAPSIBLE SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/5 bg-[#090b10] transition-all duration-300 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Workspace Switcher / Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-mono text-sm font-bold tracking-tight text-white truncate">
                  CENTINELA
                </span>
                <span className="text-[10px] font-medium text-emerald-400 truncate">
                  ● AP-SOUTH-1 GATEWAY
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Shield className="h-4 w-4" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.04] hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Workspace Chip */}
        {!collapsed && (
          <div className="mx-3 my-3 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-xs">
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500/10 text-blue-400">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-white/90 truncate">Northwind Health</span>
            </div>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-white/40">
              PROD
            </span>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.to || (item.to === "/app/dashboard" && pathname === "/app");

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30 shadow-sm shadow-blue-500/10"
                    : "text-white/60 hover:bg-white/[0.03] hover:text-white"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-blue-400" : "text-white/40 group-hover:text-white/80"}`}
                />
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && (
                  <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions & user profile */}
        <div className="border-t border-white/5 p-3 space-y-2">
          {/* Quick command palette trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className={`w-full flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/50 hover:bg-white/[0.05] hover:text-white transition-colors ${
              collapsed ? "justify-center px-0" : "justify-between"
            }`}
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              {!collapsed && <span>Command Menu</span>}
            </div>
            {!collapsed && (
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/60">
                ⌘K
              </kbd>
            )}
          </button>

          {/* Return to marketing link */}
          <a
            href={marketingUrl("/")}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-white/50 hover:bg-white/[0.03] hover:text-white transition-colors ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? "Marketing Home" : undefined}
          >
            <Home className="h-4 w-4 shrink-0 text-white/40" />
            {!collapsed && <span>Marketing Home</span>}
          </a>

          {/* User info */}
          {!collapsed && (
            <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-[11px] font-bold text-white">
                {userEmail.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col truncate text-[11px]">
                <span className="font-medium text-white truncate">{userEmail}</span>
                <span className="text-white/40 text-[10px]">CISO • Admin</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. MAIN APP CONTENT WRAPPER */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? "pl-18" : "pl-64"
        }`}
      >
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-[#050505]/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="lg:hidden p-1.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Session status indicator */}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs font-mono text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ACTIVE SESSION:</span>
              <span className="text-blue-400">AX-772</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Quick Search...</span>
              <kbd className="ml-2 rounded bg-white/10 px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
            </button>

            <ThemeToggle />

            <Link
              to={appRoute("config")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all"
            >
              <Play className="h-3 w-3" />
              <span className="hidden sm:inline">New Audit</span>
            </Link>
          </div>
        </header>

        {/* OUTLET */}
        <main className="flex-1 p-6 md:p-8 relative">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
