import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Copy, Check, Loader2, MessageSquare, User, Bot, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseFull } from "@/lib/courseHelpers";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  course: CourseFull;
  /** Renderiza compacto para uso em modal/sheet (sem padding extra) */
  compact?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  whatsapp?: string;
}

const SUGGESTIONS = [
  "Qual a carga horária e modalidade?",
  "Quais as próximas turmas e datas?",
  "Qual o investimento e formas de pagamento?",
  "Quais são os principais diferenciais?",
  "O que está incluso no programa?",
  "Tem prática com pacientes reais?",
];

export const CourseAssistant = ({ course, compact = false }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("course-assistant", {
        body: {
          courseId: course.id,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const internal = (data as any).internal || "Não consegui gerar uma resposta.";
      const whatsapp = (data as any).whatsapp || "";

      setMessages((prev) => [...prev, { role: "assistant", content: internal, whatsapp }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      toast({ title: "Erro no assistente", description: msg, variant: "destructive" });
      setMessages((prev) => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", compact ? "h-[70vh]" : "h-[calc(100vh-340px)] min-h-[520px]")}>
      {/* Hero / explicação */}
      {messages.length === 0 && (
        <Card className="border-primary/20 bg-gradient-ai text-primary-foreground shadow-elegant">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold">Assistente Comercial Nexus</h3>
                <p className="mt-1 text-sm text-primary-foreground/90">
                  Faça perguntas sobre <strong>{course.name}</strong>. Você recebe a resposta interna e uma versão pronta para colar no WhatsApp do cliente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sugestões iniciais */}
      {messages.length === 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Perguntas frequentes
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-card p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p>Digite sua pergunta abaixo ou escolha uma sugestão.</p>
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" />
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Consultando dados do curso…</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ex.: Qual a carga horária? Tem desconto à vista? Quando começa a próxima turma?"
          rows={2}
          disabled={loading}
          className="resize-none"
        />
        <Button onClick={() => ask(input)} disabled={loading || !input.trim()} size="lg" className="self-stretch">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        💡 <kbd className="rounded bg-muted px-1">Enter</kbd> envia · <kbd className="rounded bg-muted px-1">Shift+Enter</kbd> nova linha
      </p>
    </div>
  );
};

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-start gap-2">
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
            {message.content}
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-ai text-primary-foreground">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex max-w-[85%] flex-1 flex-col gap-2">
        {/* Resposta interna */}
        <div className="rounded-2xl rounded-tl-sm border bg-secondary/40 p-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <Badge variant="outline" className="gap-1 text-[10px] font-semibold uppercase">
              <Bot className="h-3 w-3" /> Resposta interna
            </Badge>
            <CopyButton text={message.content} variant="ghost" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</div>
        </div>

        {/* Mensagem WhatsApp */}
        {message.whatsapp && (
          <div className="rounded-2xl rounded-tl-sm border-2 border-success/30 bg-success/5 p-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <Badge className="gap-1 bg-success text-success-foreground text-[10px] font-semibold uppercase hover:bg-success">
                <MessageSquare className="h-3 w-3" /> Pronto para WhatsApp
              </Badge>
              <CopyButton text={message.whatsapp} variant="default" />
            </div>
            <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{message.whatsapp}</div>
          </div>
        )}
      </div>
    </div>
  );
};

const CopyButton = ({ text, variant }: { text: string; variant: "ghost" | "default" }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copiado!" });
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Button
      onClick={copy}
      variant={variant === "default" ? "default" : "ghost"}
      size="sm"
      className={cn("h-6 gap-1 px-2 text-[10px]", variant === "default" && "bg-success text-success-foreground hover:bg-success/90")}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
};
