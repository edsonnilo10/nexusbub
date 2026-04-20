import { useEffect, useState } from "react";
import { ArrowLeft, Check, History, Loader2, ShieldCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  approved: boolean;
  created_at: string;
}

const AdminApprovals = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Aprovações | Nexus Ultrassonografia";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,approved,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setProfiles((data as ProfileRow[]) || []);
    }
    setLoading(false);
  };

  const setApproved = async (id: string, approved: boolean) => {
    setBusyId(id);
    const { error } = await supabase.from("profiles").update({ approved }).eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: approved ? "Usuário aprovado" : "Acesso revogado" });
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, approved } : p)));
    }
  };

  const pending = profiles.filter((p) => !p.approved);
  const approved = profiles.filter((p) => p.approved);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Aprovações de acesso</h1>
              <p className="text-sm text-muted-foreground">
                Aprove ou revogue o acesso da equipe Nexus.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/audit")}>
            <History className="h-4 w-4" /> Histórico
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pendentes
                  <Badge variant="secondary">{pending.length}</Badge>
                </CardTitle>
                <CardDescription>Usuários aguardando sua aprovação.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum cadastro pendente. ✨</p>
                ) : (
                  pending.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.full_name || "Sem nome"}</div>
                        <div className="truncate text-sm text-muted-foreground">{p.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setApproved(p.id, true)}
                        disabled={busyId === p.id}
                      >
                        {busyId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Aprovar
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Aprovados
                  <Badge>{approved.length}</Badge>
                </CardTitle>
                <CardDescription>Usuários com acesso liberado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {approved.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum usuário aprovado ainda.</p>
                ) : (
                  approved.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.full_name || "Sem nome"}</div>
                        <div className="truncate text-sm text-muted-foreground">{p.email}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setApproved(p.id, false)}
                        disabled={busyId === p.id}
                      >
                        {busyId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Revogar
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminApprovals;
