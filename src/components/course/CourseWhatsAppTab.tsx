import { useState, useEffect, useMemo } from "react";
import { Copy, Check, MessageCircle, RotateCcw, Loader2, BookOpen, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CourseFull, CourseModule, CourseClass, formatClassDateRange, classStatusLabel } from "@/lib/courseHelpers";
import { shortMessage, fullMessage, followUpMessage, programaticContentMessage } from "@/lib/whatsappTemplates";
import { useCourseOverrides, CourseOverrides } from "@/hooks/useCourseOverrides";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

type WaKey = "wa_short" | "wa_full" | "wa_followup" | "wa_content";

export const CourseWhatsAppTab = ({ course, modules, classes }: Props) => {
  const { overrides, loaded, save } = useCourseOverrides(course.id);

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
    () => [
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
    ],
    [course, modules, classes, selectedClass],
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
      <div className="rounded-lg border bg-secondary/30 p-4 text-sm text-muted-foreground">
        💡 Suas edições são <strong>salvas automaticamente</strong> e ficam apenas na sua conta — outros usuários não veem nem alteram seus textos. Use <code className="rounded bg-background px-1">*texto*</code> para negrito e <code className="rounded bg-background px-1">_texto_</code> para itálico.
      </div>

      {/* Seletor de turma global para os templates */}
      <Card>
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
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {templates.map((t) => (
          <TemplateCard
            key={`${t.id}-${cardKey}`}
            templateKey={t.id}
            label={t.label}
            desc={t.desc}
            Icon={t.icon}
            defaultText={t.defaultText}
            savedText={t.savedKey ? overrides[t.savedKey] as string | null : null}
            onSave={t.savedKey ? save : null}
          />
        ))}
      </div>
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
}

const TemplateCard = ({ templateKey, label, desc, Icon, defaultText, savedText, onSave }: CardProps) => {
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState<string>(savedText ?? defaultText);

  useEffect(() => {
    setEdited(savedText ?? defaultText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedText, defaultText]);

  const handleChange = (value: string) => {
    setEdited(value);
    if (onSave) onSave({ [templateKey]: value } as Partial<CourseOverrides>);
  };

  const handleReset = () => {
    setEdited(defaultText);
    if (onSave) onSave({ [templateKey]: null } as Partial<CourseOverrides>);
    toast({ title: "Texto restaurado", description: "Voltou para o padrão automático." });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(edited);
    setCopied(true);
    toast({ title: "Copiado para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
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
          className="min-h-[260px] flex-1 font-mono text-xs leading-relaxed"
        />
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
      </CardContent>
    </Card>
  );
};
