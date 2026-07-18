import request from './services/request'

/**
 * 当后端不可达时（超时/网络错误），自动降级为本地 mock 数据，
 * 确保前端完整交互流程可跑通，不影响正常联调。
 */
const MOCK_PREFIX = '[Mock]'

// ==================== 认证 ====================
export const authApi = {
  /** 获取 RSA 公钥 */
  getPublicKey: () => request.get('/auth/public-key'),

  /** 登录 → { token, username, role }
   *  注意：登录不设 mock 降级，网络错误由 LoginPage 统一处理，
   *  避免"后端挂了却假装登录成功"进入管理后台看到假数据。
   */
  login: (username: string, password: string) =>
    request.post('/auth/login', { username, password }),

  /** 注册 → 返回新用户 ID
   *  注意：注册不设 mock 降级，网络错误由调用方处理。
   */
  register: (username: string, password: string, email: string) =>
    request.post('/auth/register', { username, password, email }),
}

// ==================== 用户管理 ====================
export const userApi = {
  /** 分页列表 → { records, total, current, size } */
  list: (page = 1, size = 10, keyword?: string) =>
    request.get('/user/list', { params: { page, size, keyword } }).catch(() => {
      console.warn(`${MOCK_PREFIX} user list fallback page=${page} size=${size}`)
      return { records: [], total: 0, current: page, size }
    }),

  /** 管理员创建用户（明文密码，无需 RSA 加密）
   *  不设 mock 降级——写操作必须透传后端错误（如"用户名已存在"）。 */
  create: (username: string, password: string, email: string, role: string) =>
    request.post('/user', { username, password, email, role }),

  /** 启停用户
   *  不设 mock 降级——写操作必须透传后端错误。 */
  toggleStatus: (userId: number, status: number) =>
    request.put(`/user/${userId}/status`, { status }),

  /** 删除用户（软删除）
   *  不设 mock 降级——写操作必须透传后端错误。 */
  remove: (userId: number) =>
    request.delete(`/user/${userId}`),

  /** 编辑用户信息（邮箱、角色）
   *  不设 mock 降级——写操作必须透传后端错误。 */
  update: (userId: number, payload: { email?: string; role?: string }) =>
    request.put(`/user/${userId}`, payload),

  /** 当前用户信息 */
  me: () => request.get('/user/me').catch(() => {
    console.warn(`${MOCK_PREFIX} me fallback`)
    return { username: 'admin', role: 'admin' }
  }),

  /** 管理员重置用户密码为 admin123
   *  不设 mock 降级——写操作必须透传后端错误。 */
  resetPassword: (userId: number) =>
    request.put(`/user/${userId}/reset-password`),
}

// ==================== 问答 ====================
export const chatApi = {
  /** 提问 → QaRecord */
  ask: (question: string, conversationId?: number) =>
    request.post('/chat/ask', { question, conversationId }).catch(() => {
      console.warn(`${MOCK_PREFIX} chat ask fallback`)
      return {
        id: Date.now(),
        question,
        answer: '（模拟回答）后端服务暂时不可用，数据仅供前端演示。',
        sourceDocs: '[]',
        createTime: new Date().toISOString(),
      }
    }),

  /** 问答历史 → QaRecord[] */
  history: () => request.get('/chat/history').catch(() => {
    console.warn(`${MOCK_PREFIX} chat history fallback`)
    return []
  }),

  /** 会话列表 → Conversation[] */
  conversations: () => request.get('/chat/conversations').catch(() => {
    console.warn(`${MOCK_PREFIX} conversations fallback`)
    return []
  }),

  /** 会话消息 → Message[] */
  messages: (convId: number) =>
    request.get(`/chat/conversations/${convId}/messages`).catch(() => {
      console.warn(`${MOCK_PREFIX} messages fallback convId=${convId}`)
      return []
    }),

  /** 删除会话
   *  不设 mock 降级——写操作必须透传后端错误。 */
  deleteConversation: (convId: number) =>
    request.delete(`/chat/conversations/${convId}`),

  /** 重命名会话
   *  不设 mock 降级——写操作必须透传后端错误。 */
  renameConversation: (convId: number, title: string) =>
    request.put(`/chat/conversations/${convId}/rename`, { title }),

  /**
   * 流式提问（SSE 打字机效果）
   *
   * 通过 fetch + ReadableStream 消费 SSE 流，每收到一个 token 调用 onToken，
   * 流结束后调用 onDone，出错调用 onError。
   *
   * @returns 取消函数（调用后中断请求）
   */
  streamAsk: (
    question: string,
    conversationId: number | undefined,
    onToken: (text: string) => void,
    onDone: (fullAnswer: string, conversationId?: number) => void,
    onError: (err: string) => void,
    onSources?: (sources: string[]) => void,
  ) => {
    const controller = new AbortController()
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const baseUrl = 'http://localhost:8000/api'

    fetch(`${baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question, conversationId }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok) {
        onError(`请求失败 (${res.status})`)
        return
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let buffer = ''
      let resolvedConvId: number | undefined = conversationId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // 按行解析 SSE
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留不完整行

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          // 会话 ID 标记
          if (data.startsWith('__CONV__')) {
            const convIdStr = data.slice(8)
            if (convIdStr && convIdStr !== 'new') {
              resolvedConvId = Number(convIdStr)
            }
            continue
          }

          // 来源文档标记
          if (data.startsWith('__SRC__')) {
            try { onSources?.(JSON.parse(data.slice(7))) } catch { /* */ }
            continue
          }

          // 访客 token（匿名提问时后端自动创建）
          if (data.startsWith('__TOKEN__')) {
            const guestToken = data.slice(9)
            if (guestToken && typeof window !== 'undefined') {
              window.sessionStorage.setItem('token', guestToken)
              window.sessionStorage.setItem('user', JSON.stringify({ username: '访客', role: 'guest' }))
            }
            continue
          }

          full += data
          onToken(data)
        }
      }
      onDone(full, resolvedConvId)
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message)
      }
    })

    return () => controller.abort()
  },
}

// ==================== 文档管理 ====================
export const docApi = {
  /** 分页列表 → { records, total, current, size } */
  list: (page = 1, size = 10, keyword?: string, status?: string) =>
    request.get('/documents', { params: { page, size, keyword, status } }).catch(() => {
      console.warn(`${MOCK_PREFIX} doc list fallback page=${page}`)
      return { records: [], total: 0, current: page, size }
    }),

  /** 上传文档 → FormData
   *  不设 mock 降级——写操作必须透传后端错误。 */
  upload: (_file: File) => {
    const fd = new FormData()
    fd.append('file', _file)
    return request.post('/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((doc: any) => {
      // 访客上传：后端返回 guestToken，前端自动存入 sessionStorage
      if (doc?.guestToken && typeof window !== 'undefined') {
        window.sessionStorage.setItem('token', doc.guestToken)
        window.sessionStorage.setItem('user', JSON.stringify({ username: '访客', role: 'guest' }))
      }
      return doc
    })
  },

  /** 删除文档
   *  不设 mock 降级——写操作必须透传后端错误。 */
  remove: (id: number) => request.delete(`/documents/${id}`),

  /** 重新处理单个文档 */
  reprocess: (id: number) => request.post(`/documents/${id}/reprocess`),

  /** 修改文档可见性（管理员可用） */
  setVisibility: (id: number, visibility: 'PUBLIC' | 'PRIVATE') =>
    request.put(`/documents/${id}/visibility`, { visibility }),

  /** 查询单个文档（用于轮询处理状态） */
  getById: (id: number) =>
    request.get(`/documents/${id}`).catch(() => {
      console.warn(`${MOCK_PREFIX} doc getById fallback id=${id}`)
      return null
    }),
}

// ==================== 管理后台（Admin） ====================
export const adminApi = {
  /** 仪表盘统计 → { userCount, documentCount, qaCount, todayQaCount } */
  stats: () => request.get('/admin/stats').catch(() => {
    console.warn(`${MOCK_PREFIX} admin stats fallback`)
    return { userCount: 0, documentCount: 0, qaCount: 0, todayQaCount: 0 }
  }),

  /** 图表数据 → { dailyQa, docStatus, weeklyTrend } */
  chartStats: () => request.get('/admin/chart-stats').catch(() => {
    console.warn(`${MOCK_PREFIX} chartStats fallback`)
    return {
      dailyQa: [
        { date: '07/13', count: 3 }, { date: '07/14', count: 5 },
        { date: '07/15', count: 2 }, { date: '07/16', count: 8 },
        { date: '07/17', count: 4 }, { date: '07/18', count: 6 },
        { date: '07/19', count: 1 },
      ],
      docStatus: [
        { name: '就绪', value: 12 }, { name: '处理中', value: 3 }, { name: '异常', value: 1 },
      ],
      weeklyTrend: [
        { date: '07/13', count: 8 }, { date: '07/14', count: 12 },
        { date: '07/15', count: 6 }, { date: '07/16', count: 15 },
        { date: '07/17', count: 10 }, { date: '07/18', count: 18 },
        { date: '07/19', count: 5 },
      ],
    }
  }),

  /** 全量问答记录分页 → Page<QaRecord>，支持关键字搜索 */
  chatHistory: (page = 1, size = 10, keyword?: string) =>
    request.get('/admin/chat/history', { params: { page, size, keyword } }).catch(() => {
      console.warn(`${MOCK_PREFIX} admin chatHistory fallback`)
      return { records: [], total: 0 }
    }),
  chatDetail: (id: number) =>
    request.get(`/admin/chat/${id}`).catch(() => {
      console.warn(`${MOCK_PREFIX} admin chatDetail fallback id=${id}`)
      throw new Error('后端未连接，无法查看详情')
    }),

  /** 删除问答记录
   *  不设 mock 降级——写操作必须透传后端错误。 */
  deleteChat: (id: number) => request.delete(`/admin/chat/${id}`),

  /** 我的会话列表分页（按会话查看） */
  chatConversations: (page = 1, size = 10, keyword?: string) =>
    request.get('/admin/chat/conversations', { params: { page, size, keyword } }).catch(() => {
      console.warn(`${MOCK_PREFIX} chatConversations fallback`)
      return { records: [], total: 0 }
    }),

  /** 某会话的所有消息 */
  chatConversationMessages: (convId: number) =>
    request.get(`/admin/chat/conversations/${convId}/messages`).catch(() => {
      console.warn(`${MOCK_PREFIX} chatConversationMessages fallback convId=${convId}`)
      return []
    }),

  /** 重命名会话
   *  不设 mock 降级——写操作必须透传后端错误。 */
  renameConversation: (convId: number, title: string) =>
    request.put(`/admin/chat/conversations/${convId}/rename`, { title }),

  /** 删除整个会话（含消息和问答记录） */
  deleteConversation: (convId: number) =>
    request.delete(`/admin/chat/conversations/${convId}`),

  /** 重建向量索引
   *  不设 mock 降级——写操作必须透传后端错误。 */
  rebuildIndex: () => request.post('/admin/rebuild-index'),
}

// ==================== 个人管理（Profile） ====================
export const profileApi = {
  /** 修改密码 */
  changePassword: (oldPassword: string, newPassword: string) =>
    request.put('/user/password', { oldPassword, newPassword }),

  /** 修改个人信息（邮箱） */
  updateProfile: (email: string) =>
    request.put('/user/profile', { email }),
}

export default request
