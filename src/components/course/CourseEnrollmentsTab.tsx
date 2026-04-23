import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Users, CheckCircle2, FileSignature, Settings as SettingsIcon, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEnrollments, type Enrollment, type PaymentStatus, type ContractStatus } from "@/hooks/useEnrollments";
import { CourseFull } from "@/lib/courseHelpers";
import { toast } from "@/hooks/use-toast";

interface Props { course: CourseFull }

const paymentLabel: Record<PaymentStatus, string> = {
  pendente: "Pendente", pago: "Pago", isento: "Isento", cancelado: "Cancelado",
};
const paymentVariant: Record<PaymentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pago: "default", pendente: "outline", isento: "secondary", cancelado: "destructive",
};
const contractLabel: Record<ContractStatus, string> = {
  sem_contrato: "Sem contrato", em_contrato: "Em contrato", assinado: "Assinado",
};
const contractVariant: Record<ContractStatus, "default" | "secondary" | "outline"> = {
  assinado: "default", em_contrato: "secondary", sem_contrato: "outline",
};

const formatDate = (d?: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
};

export const CourseEnrollmentsTab = ({ course }: Props) => {
  const { enrollments, loading, reload } = useEnrollments(course.id);
  const [syncing, setSyncing] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    enrollments.forEach((e) => {
      const key = e.class_label || e.class_start_date || "Sem turma";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return [...map.entries()];
  }, [enrollments]);

  const handleSync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sync-google-sheets", { body: {} });
    setSyncing(false);
    if (error || data?.error) {
      toast({
        title: "Erro ao sincronizar",
        description: error?.message || data?.error || "Configure a planilha em Configurações.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Sincronização concluída",
      description: `${data.alunosNovos} novo(s) · ${data.alunosAtualizados} atualizado(s)`,
    });
    await reload();
  };

  const lastSync = enrollments.length > 0
    ? enrollments.reduce((max, e) => e.synced_at > max ? e.synced_at : max, enrollments[0].synced_at)
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Matrículas
            </CardTitle>
            {lastSync && (
              <p className="mt-1 text-xs text-muted-foreground">
                Última sincronização {formatRelative(lastSync)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings"><SettingsIcon className="h-4 w-4" /> Configurar</Link>
            </Button>
            <Button onClick={handleSync} disabled={syncing} size="sm">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar agora
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhuma matrícula encontrada para este curso.
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                Configure o link da sua planilha em <Link to="/settings" className="underline">Configurações</Link> e clique em "Sincronizar agora".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map(([label, list]) => {
                const pagos = list.filter((e) => e.payment_status === "pago").length;
                const contratos = list.filter((e) => e.contract_status !== "sem_contrato").length;
                const first = list[0];
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {first.class_label || `Turma ${formatDate(first.class_start_date)}`}
                      </h3>
                      {first.class_start_date && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(first.class_start_date)} → {formatDate(first.class_end_date)}
                        </span>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" /> {list.length}
                      </Badge>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {pagos} pago(s)
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <FileSignature className="h-3 w-3" /> {contratos} em contrato
                      </Badge>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Aluno</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead>Contrato</TableHead>
                            <TableHead className="hidden md:table-cell">Contato</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-medium">{e.student_name}</TableCell>
                              <TableCell>
                                <Badge variant={paymentVariant[e.payment_status]}>{paymentLabel[e.payment_status]}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={contractVariant[e.contract_status]}>{contractLabel[e.contract_status]}</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                {e.student_email || e.student_phone || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
