import { Link } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import nexusLogo from "@/assets/nexus-logo.jpg";

export const AppHeader = () => {
  const { user, signOut, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-card ring-1 ring-primary/20">
            <img src={nexusLogo} alt="Nexus Ultrassonografia" className="h-full w-full object-cover" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold leading-tight">Nexus Ultrassonografia</div>
            <div className="text-xs text-muted-foreground">Hub de cursos</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/approvals">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Aprovações</span>
              </Link>
            </Button>
          )}
          <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
