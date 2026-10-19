import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { appRoute, marketingUrl } from "@/config/routes";

const navItems = [
  { to: appRoute("dashboard"), icon: "dashboard", label: "Dashboard" },
  { to: appRoute("config"), icon: "settings", label: "Configure" },
  { to: appRoute("audit"), icon: "security_update_good", label: "Live Audit" },
  { to: appRoute("results"), icon: "analytics", label: "Results" },
] as const;

interface ShellProps {
  children: ReactNode;
  topBar?: ReactNode;
  footer?: ReactNode;
  sidebarFooter?: ReactNode;
}

export function Shell({ children, topBar, footer, sidebarFooter }: ShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-[#050505] text-[#e2e2e9]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[240px] flex flex-col py-6 border-r border-white/5 bg-[#090b10] z-40">
        <div className="px-4 mb-8">
          <h1 className="text-xl font-bold tracking-tight font-mono text-white">CENTINELA</h1>
          <p className="text-[12px] font-semibold tracking-[0.05em] text-emerald-400 mt-1">
            ● AP-SOUTH-1 GATEWAY
          </p>
        </div>

        <nav className="flex-grow space-y-1 px-2">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex items-center gap-4 px-4 py-2 rounded-xl transition-colors duration-200 " +
                  (active
                    ? "bg-blue-600/20 text-blue-400 font-semibold border-l-4 border-blue-400"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]")
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pt-4 border-t border-white/5">
          {sidebarFooter ?? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Gateway Verified
              </span>
            </div>
          )}
          <a
            href={marketingUrl("/")}
            className="flex items-center gap-4 px-4 py-2 text-white/50 hover:text-white transition-colors rounded-xl"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            <span className="text-sm">Marketing Home</span>
          </a>
          <Link
            to={appRoute("profile")}
            className="flex items-center gap-3 px-4 py-2 text-white/50 hover:text-white transition-colors rounded-xl"
          >
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              SC
            </span>
            <span className="text-sm">Profile</span>
          </Link>
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed top-0 left-[240px] right-0 flex justify-between items-center px-6 h-[56px] bg-[#050505]/80 backdrop-blur-md border-b border-white/5 z-30">
        {topBar ?? (
          <div className="flex items-center gap-4">
            <span className="text-[13px] font-mono text-blue-400">SESSION_ID: AX-772</span>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="ml-[240px] pt-[56px] min-h-screen bg-[#050505] relative">
        <div className="p-6 pb-32">{children}</div>
      </main>

      {footer}
    </div>
  );
}
