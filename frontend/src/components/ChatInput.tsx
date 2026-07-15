import { useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  loading: boolean;
}

export function ChatInput({ onSend, loading }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim() || loading) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-white p-2">
      <div className="flex items-end gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-1.5 focus-within:border-[#005BAC] focus-within:ring-1 focus-within:ring-[#005BAC]/20">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题，Shift+Enter 换行..."
          rows={1}
          disabled={loading}
          className="max-h-24 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
          style={{ minHeight: "22px" }}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#005BAC] text-white transition-colors hover:bg-[#004a8d] disabled:bg-gray-400 disabled:text-white/90"
        >
          <Send size={14} />
        </button>
      </div>
      <p className="mt-1 text-center text-[10px] text-gray-400">
        回答由 AI 生成，仅供参考，请以学校官方信息为准
      </p>
    </div>
  );
}
