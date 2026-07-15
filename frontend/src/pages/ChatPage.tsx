import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { useAuth } from "../context/auth-context";
import {
  api,
  type MessageRecord,
  type SourceRecord,
  type ConversationRecord,
} from "../api";
import {
  Send,
  MessageSquare,
  Trash2,
  Loader,
  Sparkles,
  History,
} from "lucide-react";

export function ChatPage() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [currentId, setCurrentId] = useState<number | undefined>();
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.conversations.list(token);
      setConversations(data);
    } catch {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !token || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);

    const userMsg: MessageRecord = {
      id: Date.now(),
      role: "USER",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.chat.stream(token, question, currentId);
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let sources: SourceRecord[] = [];
      let assistantId = Date.now() + 1;

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "ASSISTANT", content: "", sources: [] },
      ]);

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
              const text = parsed.text || "";
              assistantContent += text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent, sources }
                    : m,
                ),
              );
            } catch {
              // ignore
            }
          } else if (event === "done") {
            break;
          }
        }
      }

      await loadConversations();
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "ASSISTANT",
          content:
            "抱歉，请求出错：" +
            (err instanceof Error ? err.message : "未知错误"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id: number) => {
    if (!token) return;
    setCurrentId(id);
    try {
      const data = await api.conversations.get(token, id);
      const msgs = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources || [],
      }));
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  const newChat = () => {
    setCurrentId(undefined);
    setMessages([]);
  };

  const deleteConversation = async (id: number) => {
    if (!token) return;
    try {
      await api.conversations.delete(token, id);
      await loadConversations();
      if (currentId === id) {
        newChat();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="admin-page chat-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">CAMPUS ANSWER DESK</span>
          <h1>问答工作台</h1>
          <p>验证知识检索效果，查看来源引用与连续对话表现。</p>
        </div>
        <span className="page-index">01</span>
      </header>
      <div className="chat-layout">
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <button className="btn-new-chat" onClick={newChat}>
              <MessageSquare size={16} />
              新对话
            </button>
            <span>
              <History size={14} /> 最近会话
            </span>
          </div>
          <div className="conversation-list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${currentId === conv.id ? "active" : ""}`}
                onClick={() => loadConversation(conv.id)}
              >
                <MessageSquare size={14} />
                <span className="conv-title">{conv.title}</span>
                <button
                  className="btn-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <main className="chat-main">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">
                <span className="welcome-mark">
                  <Sparkles size={24} />
                </span>
                <small>HOHAI KNOWLEDGE ASSISTANT</small>
                <h2>今天想了解河海的什么？</h2>
                <p>试着询问招生、教学、校园服务，回答会标注资料来源。</p>
                <div className="examples">
                  <button onClick={() => setInput("图书馆开放时间？")}>
                    图书馆开放时间？
                  </button>
                  <button onClick={() => setInput("校园卡怎么补办？")}>
                    校园卡怎么补办？
                  </button>
                  <button onClick={() => setInput("奖学金申请条件？")}>
                    奖学金申请条件？
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role.toLowerCase()}`}>
                <div className="message-bubble">
                  <div className="message-content">{msg.content}</div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="sources">
                      <div className="sources-title">参考来源：</div>
                      {msg.sources.map((s) => (
                        <div key={s.index} className="source-item">
                          <span className="source-index">[{s.index}]</span>
                          <span className="source-title">{s.title}</span>
                          <span className="source-score">
                            相关度: {(s.score * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="message-bubble">
                  <Loader size={16} className="spin" />
                  思考中...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入问题，例如：图书馆开放时间？"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
