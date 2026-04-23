import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Loader2, RefreshCw, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
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
import { ComboRulesSection } from "@/components/settings/ComboRulesSection";

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
    const { data, error } = await supabase.functions.invoke("sync-google-sheets", { body: {} });
    setSyncing(false);
    if (error) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message || "Falha ao chamar a sincronização. Veja os logs do backend.",
        variant: "destructive",
      });
      return;
    }
    if (data?.error) {
      toast({ title: "Erro ao sincronizar", description: data.error, variant: "destructive" });
      return;
    }
    setLastSync(data.synced_at);
    setLastSummary(data);
    const processed = data.processed || {};
    const totalRows = Object.values(processed).reduce((acc: number, p: any) => acc + (p.inserted || 0), 0);
    const tabsOk = Object.keys(processed).length;
    const totalErrors = Object.values(processed).reduce((acc: number, p: any) => acc + (p.errors?.length || 0), 0) as number;
    toast({
      title: totalErrors > 0 ? "Sincronização concluída com avisos" : "Sincronização concluída",
      description: `${tabsOk} aba(s) processada(s) · ${totalRows} registro(s) atualizado(s)${totalErrors > 0 ? ` · ${totalErrors} erro(s)` : ""}`,
      variant: totalErrors > 0 ? "destructive" : "default",
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
              Cole o link da planilha. Lemos via Service Account do Google, então a planilha pode ser
              <strong> privada</strong> — basta compartilhá-la como Leitor com o e-mail da Service Account.
              Sincronização automática roda a cada 1 hora.
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
                  <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Último resumo salvo: {new Date(lastSync).toLocaleString("pt-BR")}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este é o último resultado que foi gravado no banco. Se a sincronização atual falhar antes de terminar, este bloco continua mostrando o resumo anterior.
                    </p>
                    {lastSummary?.processed && (
                      <div className="space-y-1">
                        {Object.entries(lastSummary.processed).map(([key, val]: [string, any]) => (
                          <div key={key} className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{key}</span>
                            <Badge variant="secondary">{val.inserted ?? 0} registro(s)</Badge>
                            {val.errors?.length > 0 && (
                              <Badge variant="destructive">{val.errors.length} erro(s)</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">→ {val.tab_title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {lastSummary?.class_groups && !lastSummary.class_groups.error && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                        <span className="font-medium">Janelas (turmas):</span>
                        <Badge variant="secondary">{lastSummary.class_groups.groups_created ?? 0} nova(s)</Badge>
                        <Badge variant="outline">{lastSummary.class_groups.links_upserted ?? 0} vínculo(s)</Badge>
                        {lastSummary.class_groups.combos_applied > 0 && (
                          <Badge>{lastSummary.class_groups.combos_applied} combo(s) auto</Badge>
                        )}
                      </div>
                    )}
                    {lastSummary?.missing_tabs?.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Abas não encontradas: {lastSummary.missing_tabs.join(", ")}
                      </div>
                    )}
                    {lastSummary?.processed && Object.values(lastSummary.processed).some((p: any) => p.errors?.length > 0) && (
                      <details className="text-xs text-destructive">
                        <summary className="cursor-pointer">Ver erros detalhados</summary>
                        <ul className="mt-1 list-disc pl-4">
                          {Object.entries(lastSummary.processed).flatMap(([key, val]: [string, any]) =>
                            (val.errors || []).map((e: string, i: number) => <li key={`${key}-${i}`}><strong>{key}:</strong> {e}</li>)
                          )}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {Array.isArray(lastSummary?.unmatched_turmas) && lastSummary.unmatched_turmas.length > 0 && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      Turmas sem curso vinculado ({lastSummary.unmatched_turmas.length})
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Esses códigos de turma vieram da planilha mas não casaram com nenhum curso cadastrado. Cadastre o curso ou preencha o campo <strong>Mnemônico</strong> no editor do curso correspondente para resolver.
                    </p>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {lastSummary.unmatched_turmas.map((u: any) => (
                        <div key={u.prefix} className="flex flex-wrap items-center gap-2 text-xs">
                          <code className="rounded bg-background px-1.5 py-0.5 font-mono">{u.prefix}</code>
                          <Badge variant="secondary">{u.quantidade} aluno(s)</Badge>
                          <Badge variant="outline">{u.unit === "sao_paulo" ? "SP" : "DF"}</Badge>
                          <span className="text-muted-foreground">ex: {u.exemplo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <ComboRulesSection />
        </div>

        <div className="mt-6">
          <MirrorModulesSection />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Dicas de estrutura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>A planilha deve ter as seguintes 5 abas (nomes flexíveis, ignoramos acentos/maiúsculas):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>São Paulo</strong> — matrículas por turma SP. Colunas: Curso, Turma, Início, Fim, Alunos.</li>
              <li><strong>Brasília</strong> — matrículas por turma DF. Mesmas colunas.</li>
              <li><strong>GR base</strong> — alunos pagos. Importamos só linhas com Status iniciando em <code>1.PAGO</code>. Colunas: Aluno, Curso, Turma, Status, Contrato, Valor, Data Pagamento.</li>
              <li><strong>Calendário SP</strong> e <strong>Calendário DF</strong> — eventos. Colunas: Curso, Turma/Evento, Início, Fim, Local, Coordenador.</li>
            </ul>
            <p className="pt-2 border-t">
              <strong>Setup do Google Cloud (uma vez só):</strong>
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary underline">console.cloud.google.com</a> → crie ou selecione um projeto.</li>
              <li>Em <em>APIs & Services → Library</em>, ative a <strong>Google Sheets API</strong>.</li>
              <li>Em <em>IAM & Admin → Service Accounts</em>, crie uma Service Account → na aba <em>Keys</em>, "Add Key" → "Create new key" → JSON. Baixe o arquivo.</li>
              <li>O JSON tem um campo <code>client_email</code> (algo como <code>nome@projeto.iam.gserviceaccount.com</code>). Abra sua planilha → botão <strong>Compartilhar</strong> → cole esse e-mail como <em>Leitor</em>.</li>
              <li>O conteúdo do JSON já foi salvo no secret <code>GOOGLE_SERVICE_ACCOUNT_JSON</code>.</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
