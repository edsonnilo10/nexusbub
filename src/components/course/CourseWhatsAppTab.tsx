import { useState, useEffect, useMemo } from "react";
import { Copy, Check, MessageCircle, RotateCcw, Loader2, BookOpen, Calendar, FileText, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CourseFull, CourseModule, CourseClass, formatClassDateRange, classStatusLabel } from "@/lib/courseHelpers";
import { shortMessage, fullMessage, followUpMessage, programaticContentMessage, investmentMessage } from "@/lib/whatsappTemplates";
import { useCourseOverrides, CourseOverrides } from "@/hooks/useCourseOverrides";
import { CourseFaqCard } from "@/components/course/CourseFaqCard";
import { toast } from "@/hooks/use-toast";
import {
  getPostgraduate2027Schedule,
  isPostgraduate2027Hybrid,
  postgraduate2027ContentMessage,
  postgraduate2027DateMessage,
  postgraduate2027FollowUpMessage,
  postgraduate2027FullMessage,
  postgraduate2027InvestmentMessage,
} from "@/lib/postgraduate2027";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

type WaKey = "wa_short" | "wa_full" | "wa_followup" | "wa_content" | "wa_investment";
type MessageYear = "2026" | "2027";
const WHATSAPP_MESSAGE_LIMIT = 4095;

const limitWhatsAppMessage = (text: string): string => {
  if (text.length <= WHATSAPP_MESSAGE_LIMIT) return text;

  const shortened = text.slice(0, WHATSAPP_MESSAGE_LIMIT - 1);
  const lastBreak = Math.max(shortened.lastIndexOf("\n"), shortened.lastIndexOf(" "));
  const safeEnd = lastBreak > WHATSAPP_MESSAGE_LIMIT - 200 ? lastBreak : shortened.length;
  return `${shortened.slice(0, safeEnd).trimEnd()}…`;
};

export const CourseWhatsAppTab = ({ course, modules, classes }: Props) => {
  const { overrides, loaded, save } = useCourseOverrides(course.id);
  const schedule2027 = getPostgraduate2027Schedule(course);
  const isHybrid2027 = isPostgraduate2027Hybrid(course);
  const [messageYear, setMessageYear] = useState<MessageYear>("2026");

  // Turmas elegíveis (não-encerradas) ordenadas
  const eligibleClasses = useMemo(
    () =>
      [...classes]
        .filter((c) => c.status !== "encerrada")
        .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || "")),
    [classes],
  );

  const [selectedClassId, setSelectedClassId] = useState<string>("auto");

  const selectedClass = useMemo(() => {
    if (selectedClassId === "auto") return null;
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [selectedClassId, classes]);

  // Recalcula textos sempre que turma muda — chave força remontagem do Card
  const cardKey = selectedClassId;

  const templates = useMemo(
    () => {
      if (messageYear === "2027" && schedule2027) {
        return [
          {
            id: "wa_short" as WaKey,
            label: "Mensagem curta",
            desc: "Datas previstas, coordenação e cidades",
            icon: MessageCircle,
            defaultText: postgraduate2027DateMessage(course, schedule2027),
            savedKey: null as keyof CourseOverrides | null,
          },
          {
            id: "wa_full" as WaKey,
            label: "Mensagem completa",
            desc: "Apresentação, datas e conteúdo",
            icon: MessageCircle,
            defaultText: postgraduate2027FullMessage(course, modules, schedule2027),
            savedKey: null as keyof CourseOverrides | null,
          },
          {
            id: "wa_followup" as WaKey,
            label: "Follow-up",
            desc: "Para retomar contato sobre 2027",
            icon: MessageCircle,
            defaultText: postgraduate2027FollowUpMessage(course, schedule2027),
            savedKey: null as keyof CourseOverrides | null,
          },
          {
            id: "wa_content" as WaKey,
            label: "Conteúdo programático",
            desc: "Detalhamento completo da pós",
            icon: BookOpen,
            defaultText: postgraduate2027ContentMessage(course, modules),
            savedKey: null as keyof CourseOverrides | null,
          },
          {
            id: "wa_investment" as WaKey,
            label: "Investimento",
            desc: "Carga horária e valores em aberto",
            icon: MessageCircle,
            defaultText: postgraduate2027InvestmentMessage(course),
            savedKey: null as keyof CourseOverrides | null,
          },
        ];
      }

      return [
      {
        id: "wa_short" as WaKey,
        label: "Mensagem curta",
        desc: "Resumo + valor + CTA",
        icon: MessageCircle,
        defaultText: shortMessage(course, classes, selectedClass),
        savedKey: "wa_short" as keyof CourseOverrides,
      },
      {
        id: "wa_full" as WaKey,
        label: "Mensagem completa",
        desc: "Com módulos, datas e investimento",
        icon: MessageCircle,
        defaultText: fullMessage(course, modules, classes, selectedClass),
        savedKey: "wa_full" as keyof CourseOverrides,
      },
      {
        id: "wa_followup" as WaKey,
        label: "Follow-up",
        desc: "Para retomar contato com leads",
        icon: MessageCircle,
        defaultText: followUpMessage(course, classes, selectedClass),
        savedKey: "wa_followup" as keyof CourseOverrides,
      },
      {
        id: "wa_content" as WaKey,
        label: "Conteúdo programático",
        desc: course.type === "pos_graduacao"
          ? "Detalhamento completo da pós (com tópicos)"
          : "Detalhamento completo do curso (com tópicos)",
        icon: BookOpen,
        defaultText: programaticContentMessage(course, modules, classes, selectedClass),
        // Não tem coluna no banco para isso ainda — sempre regenera do template
        savedKey: null as keyof CourseOverrides | null,
      },
      {
        id: "wa_investment" as WaKey,
        label: "Investimento",
        desc: "Nome, carga horária e valores em aberto",
        icon: MessageCircle,
        defaultText: investmentMessage(course, classes, selectedClass),
        savedKey: "wa_investment" as keyof CourseOverrides,
      },
    ];
    },
    [course, modules, classes, selectedClass, messageYear, schedule2027],
  );

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {schedule2027 && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Ano das mensagens</p>
            <p className="text-xs text-muted-foreground">Escolha o conjunto que deseja copiar.</p>
          </div>
          <div className="grid grid-cols-2 rounded-md border bg-muted p-1" aria-label="Ano das mensagens">
            <Button
              type="button"
              size="sm"
              variant={messageYear === "2026" ? "default" : "ghost"}
              onClick={() => setMessageYear("2026")}
            >
              2026
            </Button>
            <Button
              type="button"
              size="sm"
              variant={messageYear === "2027" ? "default" : "ghost"}
              onClick={() => setMessageYear("2027")}
            >
              2027
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-secondary/30 p-4 text-sm text-muted-foreground">
        {messageYear === "2026" ? (
          <>💡 Suas edições são <strong>salvas automaticamente</strong> e ficam apenas na sua conta — outros usuários não veem nem alteram seus textos. Use <code className="rounded bg-background px-1">*texto*</code> para negrito e <code className="rounded bg-background px-1">_texto_</code> para itálico.</>
        ) : (
          <>
            {isHybrid2027
              ? "As mensagens de 2027 incluem somente as datas já previstas e informam que a cidade será definida entre Brasília e São Paulo conforme o quórum mínimo."
              : `As mensagens de 2027 incluem somente as datas já previstas e informam a realização em ${course.unit === "brasilia" ? "Brasília" : "São Paulo"}.`}
          </>
        )}
      </div>

      {/* Seletor de turma global para os templates */}
      {messageYear === "2026" && <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
          <Label htmlFor="wa-class-select" className="flex shrink-0 items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            Turma indicada nas mensagens
          </Label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger id="wa-class-select" className="w-full sm:max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">🔄 Automático (próxima turma)</SelectItem>
              {eligibleClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {formatClassDateRange(c.start_date, c.end_date)} — {classStatusLabel(c.status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClass && (
            <p className="text-xs text-muted-foreground">
              As mensagens abaixo destacam essa turma específica para o cliente.
            </p>
          )}
        </CardContent>
      </Card>}

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {templates.map((t) => {
          const is2027 = messageYear === "2027";
          const saved2027 = overrides.wa_2027 ?? {};
          return (
            <TemplateCard
              key={`${t.id}-${messageYear}-${cardKey}`}
              templateKey={t.id}
              label={t.label}
              desc={t.desc}
              Icon={t.icon}
              defaultText={t.defaultText}
              savedText={
                is2027
                  ? saved2027[t.id] ?? null
                  : t.savedKey ? (overrides[t.savedKey] as string | null) : null
              }
              onSave={
                is2027
                  ? (patch) => {
                      const v = (patch as Record<string, string | null>)[t.id];
                      const next = { ...(overrides.wa_2027 ?? {}) };
                      if (v == null) delete next[t.id];
                      else next[t.id] = v;
                      save({ wa_2027: next });
                    }
                  : t.savedKey ? save : null
              }
              courseName={course.name}
            />
          );
        })}
      </div>

      <CourseFaqCard course={course} modules={modules} classes={classes} />
    </div>
  );
};

interface CardProps {
  templateKey: WaKey;
  label: string;
  desc: string;
  Icon: typeof MessageCircle;
  defaultText: string;
  savedText: string | null;
  onSave: ((patch: Partial<CourseOverrides>) => void) | null;
  courseName: string;
}

// Slugifica nome do arquivo: "CM US MAMA: ..." -> "cm-us-mama"
const slugifyFilename = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "curso";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const TemplateCard = ({ templateKey, label, desc, Icon, defaultText, savedText, onSave, courseName }: CardProps) => {
  const [copied, setCopied] = useState(false);
  const limitedDefaultText = limitWhatsAppMessage(defaultText);
  const [edited, setEdited] = useState<string>(limitWhatsAppMessage(savedText ?? defaultText));

  useEffect(() => {
    setEdited(limitWhatsAppMessage(savedText ?? defaultText));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedText, defaultText]);

  const handleChange = (value: string) => {
    const limitedValue = value.slice(0, WHATSAPP_MESSAGE_LIMIT);
    setEdited(limitedValue);
    if (onSave) onSave({ [templateKey]: limitedValue } as Partial<CourseOverrides>);
  };

  const handleReset = () => {
    setEdited(limitedDefaultText);
    if (onSave) onSave({ [templateKey]: null } as Partial<CourseOverrides>);
    toast({ title: "Texto restaurado", description: "Voltou para o padrão automático." });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(edited);
    setCopied(true);
    toast({ title: "Copiado para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  };

  const baseFilename = `${slugifyFilename(courseName)}-${slugifyFilename(label)}`;

  const handleExportTxt = () => {
    // BOM UTF-8 garante acentos corretos no Notepad / Word
    const blob = new Blob(["\uFEFF" + edited], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${baseFilename}.txt`);
    toast({ title: "Arquivo .txt baixado" });
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const marginTop = 56;
    const marginBottom = 48;
    const usableWidth = pageWidth - marginX * 2;

    // Cabeçalho
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const titleLines = doc.splitTextToSize(courseName, usableWidth);
    doc.text(titleLines, marginX, marginTop);

    let cursorY = marginTop + titleLines.length * 16 + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(`${label} — Pronto para WhatsApp`, marginX, cursorY);
    cursorY += 14;
    doc.setDrawColor(220);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 16;

    // Corpo: remove marcadores de negrito/itálico do WhatsApp
    doc.setTextColor(20);
    doc.setFontSize(11);
    const cleanText = edited
      .replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/_([^_\n]+)_/g, "$1");

    const lines = doc.splitTextToSize(cleanText, usableWidth);
    const lineHeight = 14;

    for (const line of lines) {
      if (cursorY + lineHeight > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.text(line, marginX, cursorY);
      cursorY += lineHeight;
    }

    doc.save(`${baseFilename}.pdf`);
    toast({ title: "Arquivo .pdf baixado" });
  };

  const isCustomized = onSave !== null && savedText !== null && savedText !== undefined;
  const canEdit = onSave !== null;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription className="text-xs">{desc}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Textarea
          value={edited}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={!canEdit}
          maxLength={WHATSAPP_MESSAGE_LIMIT}
          className="min-h-[260px] flex-1 font-mono text-xs leading-relaxed"
        />
        <p className="text-right text-xs text-muted-foreground" aria-live="polite">
          {edited.length.toLocaleString("pt-BR")} / {WHATSAPP_MESSAGE_LIMIT.toLocaleString("pt-BR")} caracteres
        </p>
        <div className="flex gap-2">
          <Button onClick={handleCopy} variant={copied ? "secondary" : "default"} size="sm" className="flex-1">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar texto"}
          </Button>
          {isCustomized && (
            <Button onClick={handleReset} variant="outline" size="sm" title="Voltar ao texto padrão">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportTxt} variant="outline" size="sm" className="flex-1" title="Baixar como .txt">
            <FileText className="h-4 w-4" />
            .txt
          </Button>
          <Button onClick={handleExportPdf} variant="outline" size="sm" className="flex-1" title="Baixar como .pdf">
            <FileDown className="h-4 w-4" />
            .pdf
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
