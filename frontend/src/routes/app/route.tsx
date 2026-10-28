import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  LayoutDashboard,
  Cpu,
  Shield,
  Swords,
  User,
  Database,
  Tag,
  Search,
  Bell,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  HardDrive,
  LogOut,
  HelpCircle,
  Menu,
} from "lucide-react";
import { appRoute, marketingUrl } from "@/config/routes";
import { CommandPalette } from "@/components/ui/command-palette";
import { IS_DEMO_MODE } from "@/lib/api";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const NAV_ITEMS = [
  { to: appRoute("dashboard"), label: "Dashboard", icon: LayoutDashboard },
  { to: appRoute("config"), label: "Models", icon: Cpu },
  { to: appRoute("results"), label: "Security", icon: Shield },
  { to: appRoute("audit"), label: "Red Team", icon: Swords },
  { to: appRoute("profile"), label: "Profile", icon: User },
  { to: "#datasets", label: "Datasets", icon: Database },
  { to: "#pricing", label: "Pricing", icon: Tag, badge: "SOON" },
] as const;

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [userName, setUserName] = React.useState("Ayush Kumar");
  const [userEmail, setUserEmail] = React.useState("ayush47brohaiking@gmail.com");

  // Check auth
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("user_email");
    if (email) {
      setUserEmail(email);
      setUserName(email.split("@")[0].replace(/[._-]/g, " "));
    }

    // Auth guard for protected routes
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "user_email=; path=/; max-age=0; SameSite=Lax";
    navigate({ to: appRoute("login") as any });
  };

  // Auth screen layout
  const isAuthScreen = pathname === appRoute("login") || pathname === appRoute("register");

  if (isAuthScreen) {
    return (
      <div className="min-h-screen bg-[#edf2f7] text-zinc-900 font-sans relative">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#edf2f7] text-zinc-900 font-sans relative overflow-x-hidden antialiased">
      {/* Ethereal Ambient Canvas Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-blue-100/50 blur-[130px]" />
        <div className="absolute top-1/4 -right-32 w-[600px] h-[600px] rounded-full bg-purple-100/50 blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-[650px] h-[650px] rounded-full bg-indigo-50/60 blur-[130px]" />
      </div>

      {/* 1. FLOATING DETACHED SIDEBAR */}
      <aside
        className={`fixed top-4 bottom-4 left-4 z-40 flex flex-col justify-between rounded-[2rem] bg-white border border-zinc-200/70 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 p-5 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Top: Brand Heading */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <Link to={appRoute("dashboard")} className="flex items-center gap-2 overflow-hidden">
              {!collapsed ? (
                <span className="text-2xl font-bold tracking-tight text-zinc-900">Centinela</span>
              ) : (
                <span className="text-xl font-bold tracking-tight text-zinc-900">C</span>
              )}
            </Link>

            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isExternal = item.to.startsWith("#");
              const active =
                !isExternal &&
                (pathname === item.to ||
                  (item.to === "/app/dashboard" && pathname === "/app") ||
                  (item.to === "/app/config" && pathname.startsWith("/app/config")) ||
                  (item.to === "/app/results" && pathname.startsWith("/app/results")) ||
                  (item.to === "/app/audit" && pathname.startsWith("/app/audit")));

              const content = (
                <div
                  className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-xs transition-all ${
                    active
                      ? "bg-zinc-100/90 text-zinc-900 font-medium"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/80 font-normal"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-700"
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}

                  {/* Active purple indicator dot */}
                  {active && !collapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
                  )}

                  {/* Soon badge */}
                  {"badge" in item && item.badge && !collapsed && (
                    <span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-semibold text-purple-700 uppercase tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </div>
              );

              if (isExternal) {
                return (
                  <a key={item.label} href={item.to} className="block">
                    {content}
                  </a>
                );
              }

              return (
                <Link key={item.to} to={item.to} className="block">
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Workspace, Storage, Profile */}
        <div className="space-y-4 pt-4">
          {/* Workspace Switcher */}
          {!collapsed && (
            <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-3 flex items-center justify-between text-left">
              <div className="truncate">
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  Workspace
                </div>
                <div className="text-xs font-semibold text-zinc-900 truncate">
                  Centinela Platform
                </div>
                <div className="text-[10px] text-zinc-500 truncate">Enterprise • AI Security</div>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
            </div>
          )}

          {/* Storage Meter */}
          {!collapsed && (
            <div className="rounded-2xl border border-zinc-200/50 bg-zinc-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-600">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[11px] font-medium text-zinc-700">Storage</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">42%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-200/80 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full w-[42%]" />
              </div>
            </div>
          )}

          {/* User Profile Pill */}
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-white p-2 shadow-sm">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-zinc-900 truncate">{userName}</span>
                  <span className="text-[10px] text-zinc-400 truncate font-mono">{userEmail}</span>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Sign out"
                className="h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN APP CONTENT CONTAINER */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? "pl-28" : "pl-72"
        } pr-6 py-4 relative z-10`}
      >
        {/* FLOATING TOPBAR */}
        <header className="rounded-2xl bg-white/95 backdrop-blur-md border border-zinc-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.02)] px-6 py-3 flex items-center justify-between mb-6">
          {/* Global Search with ⌘K */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-3 text-zinc-400 hover:text-zinc-700 text-xs w-full max-w-md transition-colors"
          >
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <span className="truncate">Search models, tests, findings... (⌘K)</span>
            <kbd className="ml-auto rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-mono text-zinc-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Assistant Button */}
            <button
              onClick={() => setCommandOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 hover:bg-purple-100/80 border border-purple-200/70 px-4 py-1.5 text-xs font-semibold text-purple-700 shadow-2xs transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Assistant</span>
            </button>

            {/* Notification Bell */}
            <button
              aria-label="Notifications"
              className="relative h-9 w-9 rounded-full bg-white border border-zinc-200/80 hover:bg-zinc-50 flex items-center justify-center text-zinc-600 shadow-2xs transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-purple-600" />
            </button>

            {/* User Avatar Circle */}
            <Link
              to={appRoute("profile")}
              className="h-9 w-9 rounded-full overflow-hidden border border-zinc-200/80 bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-2xs hover:scale-105 transition-transform"
            >
              {userName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>

        {/* MAIN OUTLET CANVAS */}
        <main className="flex-1 pb-16">
          <Outlet />
        </main>
      </div>

      {/* Floating Bottom-Right Help Button */}
      <button
        aria-label="Help & Documentation"
        onClick={() => window.open("https://centinela.ai/docs", "_blank")}
        className="fixed bottom-6 right-6 z-40 h-9 w-9 rounded-full bg-white border border-zinc-200/80 shadow-md flex items-center justify-center text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:scale-105 transition-all"
      >
        <HelpCircle className="h-4 w-4 text-zinc-500" />
      </button>

      {/* Global Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
