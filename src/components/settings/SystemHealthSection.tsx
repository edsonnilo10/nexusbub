import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Stethoscope, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  evaluateSystemHealth,
  summarizeHealth,
  type HealthInput,
  type HealthResult,
  type HealthStatus,
} from "@/lib/systemHealth";

const STATUS_STYLE: Record<HealthStatus, { icon: typeof CheckCircle2; text: string; bg: string }> = {
  ok: { icon: CheckCircle2, text: "text-success", bg: "bg-success/10" },
  warn: { icon: AlertTriangle, text: "text-gold", bg: "bg-gold/10" },
  fail: { icon: XCircle, text: "text-destructive", bg: "bg-destructive/10" },
};

const SystemHealthSection = () => {
  const { user, isAdmin } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<HealthResult[]>([]);
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);

  if (!isAdmin) return null;

  const run = async () => {
    setRunning(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      const [
        profilesRes,
        rolesRes,
        auditRes,
        coursesRes,
        linksRes,
        groupsRes,
        groupLinksRes,
        overridesRes,
        modulesRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("role").eq("user_id", user?.id ?? ""),
        supabase.from("approval_audit").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id, name, unit"),
        supabase.from("class_group_courses").select("course_id, start_date, end_date"),
        supabase.from("class_groups").select("id"),
        supabase.from("class_group_courses").select("group_id"),
        supabase
          .from("user_course_overrides")
          .select("course_id, wa_short, wa_full, wa_followup, wa_investment, wa_2027"),
        supabase.from("course_modules").select("course_id"),
      ]);

      const pendingRes = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("approved", false);

      // Probe the confirmation e-mail service without sending anything:
      // an empty body is rejected before any e-mail is produced.
      let emailFunction: number | "unreachable" = "unreachable";
      try {
        const { error } = await supabase.functions.invoke("confirm-approved-user", { body: {} });
        const context = (error as unknown as { context?: Response } | null)?.context;
        if (context) emailFunction = context.status;
        else emailFunction = error ? "unreachable" : 200;
      } catch {
        emailFunction = "unreachable";
      }

      const moduleCounts: Record<string, number> = {};
      (modulesRes.data || []).forEach((m) => {
        moduleCounts[m.course_id] = (moduleCounts[m.course_id] || 0) + 1;
      });

      const input: HealthInput = {
        connectionError: profilesRes.error ? profilesRes.error.message : null,
        isAdmin: !!rolesRes.data?.some((r) => r.role === "admin"),
        pendingApprovals: pendingRes.count ?? 0,
        auditReadable: !auditRes.error,
        emailFunction,
        courses: (coursesRes.data || []) as HealthInput["courses"],
        classLinks: (linksRes.data || []) as HealthInput["classLinks"],
        groupIds: (groupsRes.data || []).map((g) => g.id),
        linkedGroupIds: (groupLinksRes.data || []).map((g) => g.group_id),
        overrides: (overridesRes.data || []) as HealthInput["overrides"],
        moduleCounts,
        today,
      };

      const next = evaluateSystemHealth(input);
      setResults(next);
      setFinishedAt(new Date());
      const { fail, warn } = summarizeHealth(next);
      if (fail) {
        toast({
          title: `${fail} ${fail === 1 ? "verificação falhou" : "verificações falharam"}`,
          description: warn ? `${warn} ponto(s) para atenção.` : "Veja os detalhes na tela.",
          variant: "destructive",
        });
      } else if (warn) {
        toast({ title: `${warn} ponto(s) para atenção`, description: "Nada quebrado, mas vale conferir." });
      } else {
        toast({ title: "Sistema ok", description: "Todas as verificações passaram." });
      }
    } catch (e) {
      toast({
        title: "O teste não concluiu",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const summary = summarizeHealth(results);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          Teste do sistema
        </CardTitle>
        <CardDescription>
          Confere conexão, aprovações, e-mail de confirmação, cursos, datas, mensagens e vínculos.
          São só leituras: nada é alterado nem enviado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
            {running ? "Testando..." : "Rodar teste"}
          </Button>
          {finishedAt && !running && (
            <span className="text-xs text-muted-foreground">
              Última execução: {finishedAt.toLocaleString("pt-BR")}
            </span>
          )}
        </div>

        {results.length > 0 && !running && (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-medium">
              {summary.fail === 0 && summary.warn === 0
                ? "Tudo certo."
                : `${summary.ok} de ${summary.total} verificações ok`}
              {summary.warn > 0 && ` · ${summary.warn} para atenção`}
              {summary.fail > 0 && ` · ${summary.fail} com problema`}
            </p>
            <ul className="space-y-2">
              {results.map((result) => {
                const style = STATUS_STYLE[result.status];
                const Icon = style.icon;
                return (
                  <li
                    key={result.id}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${style.bg}`}>
                      <Icon className={`h-4 w-4 ${style.text}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{result.label}</p>
                      <p className="text-xs text-muted-foreground">{result.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { SystemHealthSection };
