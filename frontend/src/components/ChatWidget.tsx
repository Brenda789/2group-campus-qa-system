import { X, Bot } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { ChatWindow } from "./ChatWindow";

export function ChatWidget() {
  const { isOpen, toggle } = useChatStore();

  return (
    <div className="widget-dock">
      {isOpen && (
        <ChatWindow onClose={() => useChatStore.getState().setIsOpen(false)} />
      )}
      <button
        onClick={toggle}
        className={`widget-trigger ${isOpen ? "open" : ""}`}
        aria-label={isOpen ? "关闭问答助手" : "打开问答助手"}
      >
        {isOpen ? (
          <X size={22} strokeWidth={2.5} />
        ) : (
          <Bot size={28} strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
