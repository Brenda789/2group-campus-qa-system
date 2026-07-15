import { useEffect, useRef } from "react";
import { User, Bot, Loader } from "lucide-react";
import type { Message } from "../store/chatStore";
import { SourceCitations } from "./SourceCitations";

interface Props {
  messages: Message[];
  loading: boolean;
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, idx) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          return (
            <a
              key={idx}
              href={`#source-${match[1]}`}
              className="mx-0.5 inline-block rounded bg-[#005BAC]/10 px-1 text-[#005BAC] hover:bg-[#005BAC]/20"
            >
              {part}
            </a>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

export function MessageList({ messages, loading }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const streamingAssistant =
    loading && lastMessage && lastMessage.role === "ASSISTANT";

  return (
    <div className="flex-1 overflow-y-auto p-3">
      {messages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Bot size={40} className="mb-3 text-[#005BAC]" />
          <h4 className="mb-1.5 text-base font-semibold text-gray-900">
            河海大学问答助手
          </h4>
          <p className="max-w-[220px] text-xs leading-relaxed text-gray-600">
            基于校园知识库，为你解答招生、教学、生活等各类问题
          </p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        const showStreamingLoader = streamingAssistant && isLast && !msg.content;
        return (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex max-w-[85%] gap-2 ${
                msg.role === "USER" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "USER"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-[#005BAC] text-white"
                }`}
              >
                {msg.role === "USER" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${
                  msg.role === "USER"
                    ? "bg-[#005BAC] text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {showStreamingLoader ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <>
                    <MessageContent content={msg.content} />
                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitations sources={msg.sources} />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {loading && !streamingAssistant && (
        <div className="mb-4 flex justify-start">
          <div className="flex max-w-[85%] gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#005BAC] text-white">
              <Bot size={14} />
            </div>
            <div className="rounded-2xl bg-gray-100 px-3 py-1.5 text-sm text-gray-800">
              <Loader size={14} className="animate-spin" />
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
