const getApiBase = () =>
  (typeof window !== "undefined" && window.__HHU_CHAT_API_BASE__) || "/api";

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}
export interface AuthResponse {
  token: string;
  user: ApiUser;
}
export interface ConversationRecord {
  id: number;
  title: string;
  updated_at: string;
  message_count: number;
}
export interface SourceRecord {
  index: number;
  title: string;
  content: string;
  score: number;
  source_url?: string;
  category?: string;
}
export interface MessageRecord {
  id: number;
  role: "USER" | "ASSISTANT";
  content: string;
  sources?: SourceRecord[];
}
export interface ConversationDetail extends ConversationRecord {
  messages: MessageRecord[];
}
export interface DocumentRecord {
  id: number;
  title: string;
  filename: string;
  status: string;
  chunk_count: number;
  size: number;
  created_at: string;
  error: string | null;
}

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const base = getApiBase().replace(/\/$/, "");
  const url = `${base}${path}`;
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "请求失败" }));
    throw new Error(data.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetchApi("/health"),

  login: (email: string, password: string) =>
    fetchApi<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  guestLogin: () =>
    fetchApi<AuthResponse>("/auth/guest", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  register: (name: string, email: string, password: string) =>
    fetchApi<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  me: (token: string) => fetchApi<ApiUser>("/auth/me", { token }),

  stats: (token: string) =>
    fetchApi<{ documents: number; chunks: number; conversations: number }>(
      "/stats",
      { token },
    ),

  documents: {
    list: (token: string) =>
      fetchApi<DocumentRecord[]>("/documents", { token }),
    upload: (token: string, title: string, file: File) => {
      const form = new FormData();
      form.append("title", title);
      form.append("file", file);
      return fetchApi<DocumentRecord>("/documents", {
        method: "POST",
        token,
        body: form,
      });
    },
    delete: (token: string, id: number) =>
      fetchApi<null>(`/documents/${id}`, { method: "DELETE", token }),
    reprocess: (token: string, id: number) =>
      fetchApi<DocumentRecord>(`/documents/${id}/reprocess`, {
        method: "POST",
        token,
      }),
  },

  chat: {
    stream: async (
      token: string,
      question: string,
      conversationId?: number,
    ) => {
      const url = `${getApiBase()}/chat/stream`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          conversation_id: conversationId,
        }),
      });
      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ detail: "问答请求失败" }));
        throw new Error(data.detail || `HTTP ${response.status}`);
      }
      return response;
    },
  },

  conversations: {
    list: (token: string) =>
      fetchApi<ConversationRecord[]>("/conversations", { token }),
    get: (token: string, id: number) =>
      fetchApi<ConversationDetail>(`/conversations/${id}`, { token }),
    delete: (token: string, id: number) =>
      fetchApi<null>(`/conversations/${id}`, { method: "DELETE", token }),
  },

  users: {
    list: (token: string) => fetchApi<ApiUser[]>("/users", { token }),
    update: (token: string, id: number, role?: string, isActive?: boolean) =>
      fetchApi<ApiUser>(`/users/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ role, is_active: isActive }),
      }),
  },
};
