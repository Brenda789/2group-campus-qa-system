import { ExternalLink } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { ChatWidget } from "./ChatWidget";

export function PublicHome() {
  return (
    <div className="public-shell">
      <main className="public-hero">
        <span className="public-kicker">
          HOHAI UNIVERSITY · CAMPUS KNOWLEDGE
        </span>
        <h1>
          问河海，
          <br />
          从一条可靠的答案开始。
        </h1>
        <p>
          连接学校公开知识与校园服务信息，为师生提供有来源、可追溯的智能问答。
        </p>
        <div className="public-actions">
          <button onClick={() => useChatStore.getState().setIsOpen(true)}>
            开始咨询
          </button>
          <a href="#/admin">
            管理入口 <ExternalLink size={15} />
          </a>
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
