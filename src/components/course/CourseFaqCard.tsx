import { useState } from "react";
import { Copy, Check, RotateCcw, Loader2, HelpCircle, Send, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseFull, CourseModule, CourseClass } from "@/lib/courseHelpers";
import { FAQ_PRESETS, type FaqPreset, formatForWhatsApp } from "@/lib/courseFaqPresets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  course: CourseFull;
  modules: CourseModule[];
  classes: CourseClass[];
}

const MAX_QUESTION_LEN = 500;

export const CourseFaqCard = ({ course, modules, classes }: Props) => {
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [copied, setCopied] = useState(false);

  const runAiQuestion = async (question: string): Promise<string> => {
    const { data, error: fnErr } = await supabase.functions.invoke("course-assistant", {
      body: {
        courseId: course.id,
        mode: "faq",
        messages: [{ role: "user", content: question }],
      },
    });
    if (fnErr) {
      // Tenta extrair status para dar toast específico
      const msg = fnErr.message || "";
      if (msg.includes("429")) throw new Error("Muitas requisições. Aguarde alguns segundos.");
      if (msg.includes("402")) throw new Error("Créditos de IA esgotados. Fale com o admin.");
      throw new Error(msg || "Erro ao consultar a IA");
    }
    if (data?.error) throw new Error(data.error);
    return typeof data?.answer === "string" ? data.answer : "";
  };

  const handlePreset = async (preset: FaqPreset) => {
    if (loading) return;
    setActivePresetId(preset.id);
    setActiveQuestion(preset.question);
    setError(null);

    if (preset.mode === "local" && preset.answer) {
      const local = preset.answer(course, modules, classes);
      setAnswer(formatForWhatsApp(local));
      return;
    }

    setLoading(true);
    setAnswer(null);
    try {
      const raw = await runAiQuestion(preset.question);
      setAnswer(formatForWhatsApp(raw));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      toast({ title: "Erro ao gerar resposta", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async () => {
    const q = customQuestion.trim();
    if (!q || loading) return;
    if (q.length > MAX_QUESTION_LEN) {
      toast({ title: `Pergunta muito longa (máx ${MAX_QUESTION_LEN} caracteres)`, variant: "destructive" });
      return;
    }
    setActivePresetId(null);
    setActiveQuestion(q);
    setError(null);
    setLoading(true);
    setAnswer(null);
    try {
      const raw = await runAiQuestion(q);
      setAnswer(formatForWhatsApp(raw));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      toast({ title: "Erro ao gerar resposta", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeQuestion || loading) return;
    const preset = activePresetId ? FAQ_PRESETS.find((p) => p.id === activePresetId) : null;
    if (preset) {
      await handlePreset(preset);
    } else {
      setError(null);
      setLoading(true);
      setAnswer(null);
      try {
        const raw = await runAiQuestion(activeQuestion);
        setAnswer(formatForWhatsApp(raw));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopy = async () => {
    if (!answer) return;
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    toast({ title: "Copiado para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  };

  const remaining = MAX_QUESTION_LEN - customQuestion.length;
  const canRegenerate = !!activeQuestion && (activePresetId === null || FAQ_PRESETS.find((p) => p.id === activePresetId)?.mode === "ai");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Perguntas frequentes</CardTitle>
            <CardDescription className="text-xs">
              Respostas rápidas com base nos dados deste curso — pronto para colar no WhatsApp.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Chips de perguntas rápidas */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FAQ_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePresetId === preset.id;
            return (
              <Button
                key={preset.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                disabled={loading}
                onClick={() => handlePreset(preset)}
                className="justify-start gap-2 text-left h-auto py-2"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate text-xs">{preset.question}</span>
              </Button>
            );
          })}
        </div>

        <Separator />

        {/* Pergunta livre */}
        <div className="space-y-2">
          <label htmlFor="faq-custom" className="text-sm font-medium">
            Ou faça uma pergunta livre
          </label>
          <Textarea
            id="faq-custom"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value.slice(0, MAX_QUESTION_LEN))}
            placeholder="Ex: O curso tem pré-requisito de residência?"
            className="min-h-[80px] text-sm"
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${remaining < 50 ? "text-destructive" : "text-muted-foreground"}`}>
              {customQuestion.length}/{MAX_QUESTION_LEN}
            </span>
            <Button
              size="sm"
              onClick={handleCustomSubmit}
              disabled={loading || !customQuestion.trim()}
            >
              {loading && activePresetId === null ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Perguntar à IA
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Área de resposta */}
        {(loading || answer || error) && (
          <>
            <Separator />
            <div className="space-y-3">
              {activeQuestion && (
                <div className="rounded-md bg-muted/40 p-3 text-xs">
                  <span className="font-medium text-muted-foreground">Pergunta: </span>
                  <span>{activeQuestion}</span>
                </div>
              )}

              {loading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              )}

              {!loading && error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && answer && (
                <>
                  <div className="rounded-md border bg-card p-3 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {answer}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopy}
                      variant={copied ? "secondary" : "default"}
                      size="sm"
                      className="flex-1"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copiado!" : "Copiar resposta"}
                    </Button>
                    {canRegenerate && (
                      <Button
                        onClick={handleRegenerate}
                        variant="outline"
                        size="sm"
                        title="Gerar nova resposta"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Regenerar
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
