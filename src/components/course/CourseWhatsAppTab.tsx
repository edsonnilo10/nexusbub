import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CourseFull, CourseModule, CourseClass } from "@/lib/courseHelpers";
import { shortMessage, fullMessage, followUpMessage } from "@/lib/whatsappTemplates";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

export const CourseWhatsAppTab = ({ course, modules, classes }: Props) => {
  const templates = [
    { id: "short", label: "Mensagem curta", desc: "Resumo + valor + CTA", text: shortMessage(course, classes) },
    { id: "full", label: "Mensagem completa", desc: "Com módulos, datas e investimento", text: fullMessage(course, modules, classes) },
    { id: "followup", label: "Follow-up", desc: "Para retomar contato com leads", text: followUpMessage(course, classes) },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-secondary/30 p-4 text-sm text-muted-foreground">
        💡 Os textos usam a formatação do WhatsApp (negrito com <code className="rounded bg-background px-1">*texto*</code> e itálico com <code className="rounded bg-background px-1">_texto_</code>). Cole direto no chat.
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {templates.map((t) => (
          <TemplateCard key={t.id} {...t} />
        ))}
      </div>
    </div>
  );
};

const TemplateCard = ({ label, desc, text }: { label: string; desc: string; text: string }) => {
  const [copied, setCopied] = useState(false);
  const [edited, setEdited] = useState(text);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(edited);
    setCopied(true);
    toast({ title: "Copiado para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  };

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
          onChange={(e) => setEdited(e.target.value)}
          className="min-h-[260px] flex-1 font-mono text-xs leading-relaxed"
        />
        <Button onClick={handleCopy} variant={copied ? "secondary" : "default"} size="sm">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado!" : "Copiar texto"}
        </Button>
      </CardContent>
    </Card>
  );
};
