import { useMemo, useState } from "react";
import { CalendarDays, Check, Copy, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CourseFull } from "@/lib/courseHelpers";
import {
  getPostgraduate2027Schedule,
  isPostgraduate2027Hybrid,
  postgraduate2027DateMessage,
} from "@/lib/postgraduate2027";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
}

export const Course2027Tab = ({ course }: Props) => {
  const schedule = getPostgraduate2027Schedule(course);
  const isHybrid = isPostgraduate2027Hybrid(course);
  const message = useMemo(
    () => (schedule ? postgraduate2027DateMessage(course, schedule) : ""),
    [course, schedule],
  );
  const [copied, setCopied] = useState(false);

  if (!schedule) return null;

  const copyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Mensagem de datas copiada" });
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" /> Turma 2027
            </CardTitle>
            <Badge variant="secondary">Previsão</Badge>
          </div>
          <CardDescription>
            {isHybrid
              ? "Calendário previsto da turma híbrida, com realização em Brasília ou São Paulo conforme o quórum mínimo."
              : `Calendário previsto da turma com realização em ${course.unit === "brasilia" ? "Brasília" : "São Paulo"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border p-3">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Coordenação</p>
              <p className="font-medium">{schedule.coordinator}</p>
            </div>
          </div>
          <ol className="divide-y rounded-md border">
            {schedule.dates.map((date, index) => (
              <li key={index} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                <span className="font-medium">Módulo {index + 1}</span>
                <span className="text-right">{date}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Nossa secretaria acadêmica irá confirmar o restante das datas em breve. Estão acertando com a coordenação.
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Mensagem com datas</CardTitle>
          <CardDescription>Texto pronto no padrão de envio pelo WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <Textarea readOnly value={message} className="min-h-[420px] flex-1 font-mono text-xs leading-relaxed" />
          <Button onClick={copyMessage} variant={copied ? "secondary" : "default"}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar mensagem"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
