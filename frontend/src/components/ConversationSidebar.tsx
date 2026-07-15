import { MessageSquare, Plus } from "lucide-react";
import type { Conversation } from "../store/chatStore";

interface Props {
  conversations: Conversation[];
  currentId: number | undefined;
  onSelect: (id: number) => void;
  onNew: () => void;
}

export function ConversationSidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
}: Props) {
  return (
    <aside className="widget-history">
      <div className="widget-history-head">
        <button onClick={onNew} className="widget-new-chat">
          <Plus size={14} />
          新对话
        </button>
      </div>
      <div className="widget-history-list">
        {conversations.length === 0 && (
          <p className="p-2 text-center text-xs text-gray-400">暂无历史对话</p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`mb-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-xs ${
              currentId === conv.id
                ? "bg-[#005BAC]/10 text-[#005BAC]"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            <MessageSquare size={12} />
            <span className="flex-1 truncate" title={conv.title}>
              {conv.title}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
