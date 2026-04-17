import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, MessageSquare, Bot, Lightbulb, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CourseFull } from "@/lib/courseHelpers";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAssistantHistory } from "@/hooks/useAssistantHistory";
import { AssistantSidebar } from "./AssistantSidebar";
import { MessageBubble, ChatMessage } from "./AssistantMessageBubble";

interface Props {
  course: CourseFull;
  /** Renderiza compacto para uso em modal/sheet (sem padding extra) */
  compact?: boolean;
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
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    loadingList,
    createConversation,
    renameConversation,
    deleteConversation,
    loadMessages,
    saveMessage,
  } = useAssistantHistory(course.id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    setHistoryOpen(false);
    const msgs = await loadMessages(id);
    setMessages(
      msgs.map((m) => ({
        role: m.role,
        content: m.content,
        whatsapp: m.whatsapp || undefined,
      }))
    );
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setHistoryOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (activeConvId === id) startNewConversation();
  };

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    let convId = activeConvId;
    // Cria conversa nova na primeira mensagem
    if (!convId) {
      const title = trimmed.length > 50 ? trimmed.slice(0, 50) + "…" : trimmed;
      const conv = await createConversation(title);
      if (!conv) {
        toast({ title: "Erro ao criar conversa", variant: "destructive" });
        return;
      }
      convId = conv.id;
      setActiveConvId(convId);
    }

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Salva mensagem do usuário
    await saveMessage(convId, "user", trimmed);

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
      await saveMessage(convId, "assistant", internal, whatsapp);
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

  const sidebarProps = {
    conversations,
    activeId: activeConvId,
    loading: loadingList,
    onSelect: selectConversation,
    onNew: startNewConversation,
    onRename: renameConversation,
    onDelete: handleDelete,
  };

  const heightClass = compact ? "h-[70vh]" : "h-[calc(100vh-340px)] min-h-[520px]";

  return (
    <div className={cn("flex overflow-hidden rounded-lg border bg-card", heightClass)}>
      {/* Sidebar fixa em desktop */}
      <aside className="hidden w-64 shrink-0 md:block">
        <AssistantSidebar {...sidebarProps} />
      </aside>

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar mobile com gatilho de histórico */}
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 md:hidden">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <History className="h-3.5 w-3.5" /> Histórico
                {conversations.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                    {conversations.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b p-3">
                <SheetTitle className="text-sm">Conversas anteriores</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-57px)]">
                <AssistantSidebar {...sidebarProps} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="truncate text-xs text-muted-foreground">
            {activeConvId
              ? conversations.find((c) => c.id === activeConvId)?.title || "Conversa"
              : "Nova conversa"}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          {/* Hero quando vazio */}
          {messages.length === 0 && (
            <Card className="border-primary/20 bg-gradient-ai text-primary-foreground shadow-elegant">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">Assistente Comercial Nexus</h3>
                    <p className="mt-0.5 text-xs text-primary-foreground/90">
                      Faça perguntas sobre <strong>{course.name}</strong>. Cada conversa fica salva no histórico.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-background p-4">
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
            💡 <kbd className="rounded bg-muted px-1">Enter</kbd> envia · <kbd className="rounded bg-muted px-1">Shift+Enter</kbd> nova linha · conversas salvas automaticamente
          </p>
        </div>
      </div>
    </div>
  );
};
