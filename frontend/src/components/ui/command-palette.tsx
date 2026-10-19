import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Shield,
  Sliders,
  FileCheck2,
  User,
  SunMoon,
  Home,
  LogOut,
  Play,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { appRoute, marketingUrl } from "@/config/routes";
import { toast } from "sonner";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("centinela_theme", "light");
      toast.info("Switched to Light Theme");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("centinela_theme", "dark");
      toast.info("Switched to Dark Theme");
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search sections..." />
      <CommandList className="max-h-[350px]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: appRoute("dashboard") as any }))}
            className="cursor-pointer"
          >
            <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: appRoute("config") as any }))}
            className="cursor-pointer"
          >
            <Sliders className="mr-2 h-4 w-4 text-white/70" />
            <span>Configure Audit</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: appRoute("audit") as any }))}
            className="cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4 text-white/70" />
            <span>Live Audit Telemetry</span>
            <CommandShortcut>G A</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: appRoute("results") as any }))}
            className="cursor-pointer"
          >
            <FileCheck2 className="mr-2 h-4 w-4 text-white/70" />
            <span>Certification & Results</span>
            <CommandShortcut>G R</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate({ to: appRoute("profile") as any }))}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4 text-white/70" />
            <span>CISO Profile & Keys</span>
            <CommandShortcut>G P</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                navigate({
                  to: appRoute("audit") as any,
                  search: { session_id: "default_audit" } as any,
                }),
              )
            }
            className="cursor-pointer"
          >
            <Play className="mr-2 h-4 w-4 text-white/70" />
            <span>Open Default Audit Drill</span>
          </CommandItem>

          <CommandItem onSelect={() => runCommand(handleToggleTheme)} className="cursor-pointer">
            <SunMoon className="mr-2 h-4 w-4 text-white/70" />
            <span>Toggle Dark / Light Theme</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              runCommand(() => {
                window.location.href = marketingUrl("/");
              })
            }
            className="cursor-pointer"
          >
            <Home className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Return to Marketing Page</span>
          </CommandItem>

          <CommandItem
            onSelect={() =>
              runCommand(() => {
                localStorage.removeItem("token");
                toast.success("Signed out successfully");
                navigate({ to: appRoute("login") as any });
              })
            }
            className="cursor-pointer text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
