import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Loader2, RefreshCw, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { MirrorModulesSection } from "@/components/settings/MirrorModulesSection";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sheetUrl, setSheetUrl] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    document.title = "Configurações | Nexus Ultrassonografia";
    if (user) load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sheet_config").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      setSheetUrl(data.sheet_url);
      setLastSync(data.last_synced_at);
      setLastSummary(data.last_sync_summary);
    }
    setLoading(false);
  };

  const save = async () => {
    if (!user) return;
    if (!/spreadsheets\/d\//.test(sheetUrl)) {
      toast({ title: "URL inválida", description: "Cole o link completo do Google Sheets.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("sheet_config").upsert(
      { user_id: user.id, sheet_url: sheetUrl },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Configuração salva" });
  };

  const sync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sync-sheet", { body: {} });
    setSyncing(false);
    if (error) {
      toast({ title: "Erro ao sincronizar", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.error) {
      toast({ title: "Erro ao sincronizar", description: data.error, variant: "destructive" });
      return;
    }
    setLastSync(data.synced_at);
    setLastSummary(data);
    toast({
      title: "Sincronização concluída",
      description: `${data.cursosAtualizados} curso(s) · ${data.alunosNovos} novo(s) · ${data.alunosAtualizados} atualizado(s)`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <AppHeader />
      <main className="container max-w-3xl py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="mb-6 text-3xl font-bold tracking-tight">Configurações</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Sincronização com Google Sheets
            </CardTitle>
            <CardDescription>
              Cole o link da planilha que controla as turmas, matrículas, pagamentos e contratos.
              A planilha precisa estar compartilhada como <strong>"qualquer pessoa com o link pode visualizar"</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sheet-url">URL da planilha</Label>
                  <Input
                    id="sheet-url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={save} disabled={saving || !sheetUrl}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                  <Button onClick={sync} variant="secondary" disabled={syncing || !sheetUrl}>
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sincronizar agora
                  </Button>
                  {sheetUrl && (
                    <Button asChild variant="outline">
                      <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" /> Abrir planilha
                      </a>
                    </Button>
                  )}
                </div>

                {lastSync && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Última sincronização: {new Date(lastSync).toLocaleString("pt-BR")}
                    </div>
                    {lastSummary && (
                      <div className="mt-2 flex flex-wrap gap-2 text-muted-foreground">
                        <Badge variant="secondary">{lastSummary.cursosAtualizados ?? 0} curso(s)</Badge>
                        <Badge variant="secondary">{lastSummary.alunosNovos ?? 0} novo(s)</Badge>
                        <Badge variant="secondary">{lastSummary.alunosAtualizados ?? 0} atualizado(s)</Badge>
                        {lastSummary.abasIgnoradas?.length > 0 && (
                          <Badge variant="outline">{lastSummary.abasIgnoradas.length} aba(s) ignorada(s)</Badge>
                        )}
                      </div>
                    )}
                    {lastSummary?.errors?.length > 0 && (
                      <details className="mt-2 text-xs text-destructive">
                        <summary className="cursor-pointer">Ver {lastSummary.errors.length} erro(s)</summary>
                        <ul className="mt-1 list-disc pl-4">
                          {lastSummary.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <MirrorModulesSection />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Dicas de estrutura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Cada aba pode ser de um curso (nomeie a aba com o nome do curso) ou pode ter uma coluna <strong>Curso</strong> em cada linha.
            </p>
            <p>Colunas reconhecidas (qualquer ordem, ignora maiúsculas e acentos):</p>
            <ul className="list-disc pl-5">
              <li><strong>Aluno</strong> (ou Nome, Participante) — obrigatório</li>
              <li><strong>Curso</strong> — opcional se a aba for um curso</li>
              <li><strong>Início</strong> e <strong>Fim</strong> — datas da turma (dd/mm/aaaa)</li>
              <li><strong>Pagamento</strong> — Pago, Pendente, Isento, Cancelado</li>
              <li><strong>Contrato</strong> — Assinado, Em contrato, Sem contrato</li>
              <li>Email, Telefone, Observações — opcionais</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
