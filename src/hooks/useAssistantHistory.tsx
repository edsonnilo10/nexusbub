import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AssistantConversation {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  whatsapp: string | null;
  created_at: string;
}

export const useAssistantHistory = (courseId: string) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user?.id || !courseId) return;
    setLoadingList(true);
    const { data } = await supabase
      .from("assistant_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .order("updated_at", { ascending: false });
    setConversations((data as AssistantConversation[]) || []);
    setLoadingList(false);
  }, [user?.id, courseId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const createConversation = useCallback(
    async (title = "Nova conversa"): Promise<AssistantConversation | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("assistant_conversations")
        .insert({ user_id: user.id, course_id: courseId, title })
        .select()
        .single();
      if (error || !data) return null;
      const conv = data as AssistantConversation;
      setConversations((prev) => [conv, ...prev]);
      return conv;
    },
    [user?.id, courseId]
  );

  const renameConversation = useCallback(async (id: string, title: string) => {
    const { error } = await supabase
      .from("assistant_conversations")
      .update({ title })
      .eq("id", id);
    if (!error) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase.from("assistant_conversations").delete().eq("id", id);
    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string): Promise<AssistantMessage[]> => {
    const { data } = await supabase
      .from("assistant_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return (data as AssistantMessage[]) || [];
  }, []);

  const saveMessage = useCallback(
    async (
      conversationId: string,
      role: "user" | "assistant",
      content: string,
      whatsapp?: string
    ): Promise<AssistantMessage | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("assistant_messages")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role,
          content,
          whatsapp: whatsapp || null,
        })
        .select()
        .single();
      if (error || !data) return null;
      // bump updated_at on conversation so it sorts to the top
      await supabase
        .from("assistant_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], updated_at: new Date().toISOString() };
        return [updated, ...prev.filter((c) => c.id !== conversationId)];
      });
      return data as AssistantMessage;
    },
    [user?.id]
  );

  return {
    conversations,
    loadingList,
    loadConversations,
    createConversation,
    renameConversation,
    deleteConversation,
    loadMessages,
    saveMessage,
  };
};
