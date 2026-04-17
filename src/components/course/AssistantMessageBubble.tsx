import { useState } from "react";
import { Sparkles, Bot, MessageSquare, User, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  whatsapp?: string;
}

export const MessageBubble = ({ message }: { message: ChatMessage }) => {
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
        <div className="rounded-2xl rounded-tl-sm border bg-secondary/40 p-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <Badge variant="outline" className="gap-1 text-[10px] font-semibold uppercase">
              <Bot className="h-3 w-3" /> Resposta interna
            </Badge>
            <CopyButton text={message.content} variant="ghost" />
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</div>
        </div>

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
