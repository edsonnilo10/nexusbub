import { useEffect, useState } from "react";
import { ArrowLeft, History, Loader2, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface AuditRow {
  id: string;
  target_email: string | null;
  target_name: string | null;
  action: "approved" | "revoked";
  performed_by_email: string | null;
  performed_by_name: string | null;
  created_at: string;
}

const AdminAudit = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Auditoria | Nexus Ultrassonografia";
    (async () => {
      const { data, error } = await supabase
        .from("approval_audit")
        .select("id,target_email,target_name,action,performed_by_email,performed_by_name,created_at")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      } else {
        setRows((data as AuditRow[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/admin/approvals")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Histórico de aprovações</h1>
            <p className="text-sm text-muted-foreground">
              Quem aprovou ou revogou o acesso de cada usuário, e quando.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Eventos
              <Badge variant="secondary">{rows.length}</Badge>
            </CardTitle>
            <CardDescription>Ordenados do mais recente para o mais antigo.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum evento registrado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => {
                  const approved = r.action === "approved";
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            approved ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {approved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {r.target_name || r.target_email || "Usuário"}
                            </span>
                            <Badge variant={approved ? "default" : "destructive"}>
                              {approved ? "Aprovado" : "Revogado"}
                            </Badge>
                          </div>
                          {r.target_email && (
                            <div className="truncate text-sm text-muted-foreground">{r.target_email}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            por{" "}
                            <span className="font-medium text-foreground">
                              {r.performed_by_name || r.performed_by_email || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground sm:text-right">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAudit;
