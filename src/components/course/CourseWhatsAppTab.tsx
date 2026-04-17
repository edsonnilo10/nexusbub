import { useState, useEffect } from "react";
import { Copy, Check, MessageCircle, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CourseFull, CourseModule, CourseClass } from "@/lib/courseHelpers";
import { shortMessage, fullMessage, followUpMessage } from "@/lib/whatsappTemplates";
import { useCourseOverrides, CourseOverrides } from "@/hooks/useCourseOverrides";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

type WaKey = "wa_short" | "wa_full" | "wa_followup";

export const CourseWhatsAppTab = ({ course, modules, classes }: Props) => {
  const { overrides, loaded, save } = useCourseOverrides(course.id);

  const templates: { id: WaKey; label: string; desc: string; defaultText: string }[] = [
    { id: "wa_short",    label: "Mensagem curta",    desc: "Resumo + valor + CTA",                  defaultText: shortMessage(course, classes) },
    { id: "wa_full",     label: "Mensagem completa", desc: "Com módulos, datas e investimento",     defaultText: fullMessage(course, modules, classes) },
    { id: "wa_followup", label: "Follow-up",         desc: "Para retomar contato com leads",        defaultText: followUpMessage(course, classes) },
  ];

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

      <div className="grid gap-5 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            templateKey={t.id}
            label={t.label}
            desc={t.desc}
            defaultText={t.defaultText}
            savedText={overrides[t.id]}
            onSave={save}
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
  defaultText: string;
  savedText: string | null;
  onSave: (patch: Partial<CourseOverrides>) => void;
}

const TemplateCard = ({ templateKey, label, desc, defaultText, savedText, onSave }: CardProps) => {
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState<string>(savedText ?? defaultText);

  // Sincroniza quando o saved muda (carregamento inicial)
  useEffect(() => {
    setEdited(savedText ?? defaultText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedText]);

  const handleChange = (value: string) => {
    setEdited(value);
    onSave({ [templateKey]: value } as Partial<CourseOverrides>);
  };

  const handleReset = () => {
    setEdited(defaultText);
    onSave({ [templateKey]: null } as Partial<CourseOverrides>);
    toast({ title: "Texto restaurado", description: "Voltou para o padrão automático." });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(edited);
    setCopied(true);
    toast({ title: "Copiado para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  };

  const isCustomized = savedText !== null && savedText !== undefined;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
            <MessageCircle className="h-4 w-4" />
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
