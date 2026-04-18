import { Link } from "react-router-dom";
import { LogOut, ShieldCheck, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import nexusLogo from "@/assets/nexus-logo.jpg";

export const AppHeader = () => {
  const { user, signOut, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between gap-2 sm:h-16">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-card ring-1 ring-primary/20 sm:h-10 sm:w-10">
            <img src={nexusLogo} alt="Nexus Ultrassonografia" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight">Nexus</div>
            <div className="hidden text-xs text-muted-foreground sm:block">Hub de cursos</div>
          </div>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-2">
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="h-9 px-2 sm:px-3">
              <Link to="/admin/approvals">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Aprovações</span>
              </Link>
            </Button>
          )}
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="h-9 px-2 sm:px-3">
              <Link to="/settings">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Configurações</span>
              </Link>
            </Button>
          )}
          <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="h-9 px-2 sm:px-3">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
