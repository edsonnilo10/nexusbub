import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, MessageSquare, Bot, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { MessageBubble, ChatMessage } from "./course/AssistantMessageBubble";

const SUGGESTIONS = [
  "Quais cursos têm turmas começando nas próximas 4 semanas?",
  "Compare os cursos de Ginecologia disponíveis",
  "Sugira um upsell para quem fez o módulo Básico de Medicina Interna",
  "Quais cursos rodam tanto em SP quanto em BSB?",
  "Quais turmas de 2026 estão com data já confirmada?",
];

export const OpenAssistantChat = () => {
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
          // courseId omitido => modo global / pergunta aberta
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
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {messages.length === 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" /> Sugestões
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

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-background p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 opacity-40" />
            <p>Faça qualquer pergunta sobre o catálogo, agenda, comparações ou estratégia.</p>
          </div>
        ) : (
          messages.map((m, i) => <MessageBubble key={i} message={m} />)
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" />
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Consultando catálogo e agenda…</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ex.: Quais turmas começam em janeiro? Qual curso indicar para um médico que já fez GIOB?"
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
