import { useMemo, useState } from "react";
import { Check, Copy, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseFull, CourseModule } from "@/lib/courseHelpers";
import { getPostgraduate2027Schedule } from "@/lib/postgraduate2027";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
}

const stripPrefix = (t: string) => t.replace(/^M[óo]dulo\s*\d+\s*[:–-]\s*/i, "").trim().toLowerCase();

/** Cronograma: cada módulo com sua data, carga horária e conteúdo programático. */
export const buildModuleSchedule = (modules: CourseModule[], dates: string[]) => {
  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);
  const numbered = sorted.filter((m) => /^M[óo]dulo\s*\d+/i.test(m.title));
  const base = numbered.length > 0 ? numbered : sorted;
  return base.map((m, i) => {
    const twin = sorted.find((o) => o.id !== m.id && o.description && stripPrefix(o.title) === stripPrefix(m.title));
    const description = m.description || twin?.description || "";
    const topics = description.split(/\n+|;/).map((t) => t.trim().replace(/^[-•·▪️*]+\s*/, "")).filter(Boolean);
    return {
      key: m.id,
      title: m.title.replace(/^M[óo]dulo\s*\d+\s*[:–-]\s*/i, "").trim(),
      hours: m.workload_hours ?? twin?.workload_hours ?? null,
      date: dates[i] ?? null,
      topics,
    };
  });
};

export const ModuleScheduleTab = ({ course, modules }: Props) => {
  const schedule = getPostgraduate2027Schedule(course);
  const rows = useMemo(() => buildModuleSchedule(modules, schedule?.dates ?? []), [modules, schedule]);
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    const lines = [`*CRONOGRAMA – ${course.name.replace(/^PG\s+US\s+\w+(\s+T\d+)?\s*[:–-]?\s*/i, "").toUpperCase()}*`, ""];
    rows.forEach((r, i) => {
      lines.push(`*MÓDULO ${i + 1} – ${r.title}*${r.hours ? ` (${r.hours}h)` : ""}`);
      lines.push(`🗓️ ${r.date ?? "Data a confirmar"}`);
      r.topics.forEach((t) => lines.push(`• ${t}`));
      lines.push("");
    });
    return lines.join("\n").slice(0, 4095);
  }, [rows, course.name]);

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Cronograma copiado" });
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-primary" /> Cronograma
          </CardTitle>
          <CardDescription>Conteúdo programático de cada módulo, com carga horária e data.</CardDescription>
        </div>
        <Button size="sm" onClick={copy} disabled={rows.length === 0}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar para WhatsApp
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum módulo cadastrado.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.key} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">Módulo {i + 1} · {r.title}</p>
                  <div className="flex gap-2">
                    {r.hours && <Badge variant="secondary">{r.hours}h</Badge>}
                    <Badge variant="outline">{r.date ?? "Data a confirmar"}</Badge>
                  </div>
                </div>
                {r.topics.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                    {r.topics.map((t, j) => <li key={j}>{t}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};
