import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/auth-context";
import { useChatStore, type Source, type Message } from "../store/chatStore";
import { api } from "../api";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { QuickQuestions } from "./QuickQuestions";
import { ConversationSidebar } from "./ConversationSidebar";
import { Loader, X, Waves, ShieldCheck } from "lucide-react";

export function ChatWindow({ onClose }: { onClose: () => void }) {
  const { token, login } = useAuth();
  const guestLoadingRef = useRef(false);
  const {
    messages,
    loading,
    conversations,
    currentId,
    setMessages,
    setConversations,
    setCurrentId,
    addMessage,
    updateAssistantMessage,
    setLoading,
    clearMessages,
  } = useChatStore();
  const loadedRef = useRef(false);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.conversations.list(token);
      setConversations(data);
    } catch {
      // ignore
    }
  }, [token, setConversations]);

  useEffect(() => {
    if (token && !loadedRef.current) {
      void loadConversations();
      loadedRef.current = true;
    }
  }, [token, loadConversations]);

  useEffect(() => {
    if (!token && !guestLoadingRef.current) {
      guestLoadingRef.current = true;
      api
        .guestLogin()
        .then((res) => login(res.token, res.user))
        .catch(() => {
          guestLoadingRef.current = false;
        });
    }
  }, [token, login]);

  const handleSend = async (text: string) => {
    if (!token || loading) return;
    const question = text.trim();
    if (!question) return;

    const userMsgId = Date.now();
    const assistantId = userMsgId + 1;

    addMessage({ id: userMsgId, role: "USER", content: question });
    setLoading(true);
    addMessage({
      id: assistantId,
      role: "ASSISTANT",
      content: "",
      sources: [],
    });

    try {
      const res = await api.chat.stream(token, question, currentId);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let sources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventMatch = block.match(/^event: (\w+)/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = dataMatch[1];

          if (event === "meta") {
            try {
              const parsed = JSON.parse(data);
              sources = parsed.sources || [];
              if (parsed.conversation_id) {
                setCurrentId(parsed.conversation_id);
              }
            } catch {
              // ignore
            }
          } else if (event === "token") {
            try {
              const parsed = JSON.parse(data);
              assistantContent += parsed.text || "";
              updateAssistantMessage(assistantId, assistantContent, sources);
            } catch {
              // ignore
            }
          }
        }
      }

      await loadConversations();
    } catch (err: unknown) {
      updateAssistantMessage(
        assistantId,
        "抱歉，请求出错：" + (err instanceof Error ? err.message : "未知错误"),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id: number) => {
    if (!token) return;
    setCurrentId(id);
    try {
      const data = await api.conversations.get(token, id);
      const msgs: Message[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources || [],
      }));
      setMessages(msgs);
    } catch {
      clearMessages();
    }
  };

  const newChat = () => {
    setCurrentId(undefined);
    clearMessages();
  };

  if (!token) {
    return (
      <div className="widget-window widget-loading">
        <Loader size={24} className="animate-spin text-[#005BAC]" />
        <p className="mt-2 text-sm text-gray-500">正在初始化...</p>
      </div>
    );
  }

  return (
    <div className="widget-window">
      <ConversationSidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={loadConversation}
        onNew={newChat}
      />
      <div className="widget-main">
        <div className="widget-header">
          <span className="widget-brand-icon">
            <Waves size={19} />
          </span>
          <div>
            <h3>河海大学问答助手</h3>
            <p>
              <ShieldCheck size={11} /> 校本知识 · 来源可循
            </p>
          </div>
          <button onClick={onClose} aria-label="关闭问答助手">
            <X size={17} />
          </button>
        </div>

        <MessageList messages={messages} loading={loading} />

        {messages.length === 0 && !loading && (
          <QuickQuestions onSelect={handleSend} />
        )}

        <ChatInput onSend={handleSend} loading={loading} />
      </div>
    </div>
  );
}
