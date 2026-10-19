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
    const all = description.split(/\n+|;/).map((t) => t.trim().replace(/^[-•·▪️*]+\s*/, "")).filter(Boolean);
    const breakdown = all[0] && /^(Teórica|Prática):/i.test(all[0]) ? all[0] : null;
    const topics = breakdown ? all.slice(1) : all;
    return {
      breakdown,
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

  const courseTitle = course.name.replace(/^PG\s+US\s+\w+(\s+T\d+)?\s*[:–-]?\s*/i, "").toUpperCase();
  const moduleText = (r: (typeof rows)[number], i: number) =>
    [
      `*MÓDULO ${i + 1} – ${r.title}*${r.hours ? ` (${r.hours}h)` : ""}`,
      ...(r.breakdown ? [`⏱️ ${r.breakdown}`] : []),
      `🗓️ ${r.date ?? "Data a confirmar"}`,
      ...r.topics.map((t) => `• ${t}`),
    ].join("\n");
  const message = useMemo(
    () => [`*CRONOGRAMA – ${courseTitle}*`, "", ...rows.map((r, i) => moduleText(r, i) + "\n")].join("\n").trim(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, courseTitle],
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyText = async (text: string, key: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setCopied(key === "all");
    toast({ title: `${label} copiado` });
    window.setTimeout(() => { setCopiedKey(null); setCopied(false); }, 2000);
  };
  const copy = () => copyText(message, "all", "Cronograma completo");

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
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar tudo
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
                  <div className="flex flex-wrap items-center gap-2">
                    {r.hours && <Badge variant="secondary">{r.hours}h</Badge>}
                    <Badge variant="outline">{r.date ?? "Data a confirmar"}</Badge>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyText(`*${courseTitle}*\n\n${moduleText(r, i)}`, r.key, `Módulo ${i + 1}`)}>
                      {copiedKey === r.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copiar módulo {i + 1}
                    </Button>
                  </div>
                </div>
                {r.breakdown && <p className="mt-1 text-xs text-muted-foreground">{r.breakdown}</p>}
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
