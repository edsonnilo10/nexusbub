import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  ShieldCheck,
  Settings as SettingsIcon,
  LayoutDashboard,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import nexusLogo from "@/assets/nexus-logo.jpg";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/turmas", label: "Turmas", icon: CalendarDays, adminOnly: false },
  
  { to: "/mensagens", label: "Mensagens", icon: MessageSquare, adminOnly: false },
  { to: "/admin/approvals", label: "Aprovações", icon: ShieldCheck, adminOnly: true },
  { to: "/settings", label: "Configurações", icon: SettingsIcon, adminOnly: true },
] as const;

const getInitials = (email?: string | null) => {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
};

export const AppHeader = () => {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (to: string) =>
    to === "/dashboard"
      ? location.pathname === "/" || location.pathname.startsWith("/dashboard")
      : location.pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* Hairline dourado/primary para ar premium */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ background: "var(--gradient-hero)" }}
      />

      <div className="container relative flex h-16 items-center justify-between gap-3 sm:h-[68px]">
        <Link to="/" className="group flex min-w-0 items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-primary/20 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-card ring-1 ring-primary/30 transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11">
              <img
                src={nexusLogo}
                alt="Nexus Ultrassonografia"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-base font-semibold leading-tight tracking-tight text-transparent">
              Nexus
            </div>
            <div className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:block">
              Hub de cursos
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Button
                key={item.to}
                asChild
                variant="ghost"
                size="sm"
                className={`relative h-9 px-2.5 text-sm font-medium transition-all sm:px-3 ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link to={item.to}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {active && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />
                  )}
                </Link>
              </Button>
            );
          })}

          {/* Separador elegante */}
          <div className="mx-1 hidden h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent sm:mx-2 sm:block" />

          {/* Avatar + email */}
          <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-muted/30 py-1 pl-1 pr-3 md:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-[10px] font-semibold text-primary-foreground ring-1 ring-primary/20">
              {getInitials(user?.email)}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="max-w-[160px] truncate text-xs font-medium text-foreground">
                {user?.email}
              </span>
              {isAdmin && (
                <span className="text-[9px] font-semibold uppercase tracking-wider text-primary">
                  Admin
                </span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="h-9 px-2 text-muted-foreground hover:text-destructive sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </nav>
      </div>
    </header>
  );
};
