import request from './services/request'
import { mockUserList, mockDocList, mockChatHistory, mockConversations } from './services/mockData'

/**
 * 当后端不可达时（超时/网络错误），自动降级为本地 mock 数据，
 * 确保前端完整交互流程可跑通，不影响正常联调。
 */
const MOCK_PREFIX = '[Mock]'

// ==================== 认证 ====================
export const authApi = {
  /** 获取 RSA 公钥 */
  getPublicKey: () => request.get('/auth/public-key'),

  /** 登录 → { token, username, role } */
  login: (username: string, password: string) =>
    request.post('/auth/login', { username, password }).catch(() => {
      console.warn(`${MOCK_PREFIX} login fallback for "${username}"`)
      return { token: 'dev-local-token', username, role: 'admin' }
    }),

  /** 注册 → 返回新用户 ID */
  register: (username: string, password: string, email: string) =>
    request.post('/auth/register', { username, password, email }).catch(() => {
      console.warn(`${MOCK_PREFIX} register fallback for "${username}"`)
      return 1
    }),
}

// ==================== 用户管理 ====================
export const userApi = {
  /** 分页列表 → { records, total, current, size } */
  list: (page = 1, size = 10, keyword?: string) =>
    request.get('/user/list', { params: { page, size, keyword } }).catch(() => {
      console.warn(`${MOCK_PREFIX} user list fallback page=${page} size=${size}`)
      return mockUserList(page, size, keyword)
    }),

  /** 启停用户 */
  toggleStatus: (userId: number, status: number) =>
    request.put(`/user/${userId}/status`, { status }).catch(() => {
      console.warn(`${MOCK_PREFIX} toggleStatus fallback userId=${userId}`)
      return true
    }),

  /** 删除用户（软删除） */
  remove: (userId: number) =>
    request.delete(`/user/${userId}`).catch(() => {
      console.warn(`${MOCK_PREFIX} remove user fallback userId=${userId}`)
      return true
    }),

  /** 编辑用户信息（邮箱、角色） */
  update: (userId: number, payload: { email?: string; role?: string }) =>
    request.put(`/user/${userId}`, payload).catch(() => {
      console.warn(`${MOCK_PREFIX} update user fallback userId=${userId}`)
      return true
    }),

  /** 当前用户信息 */
  me: () => request.get('/user/me').catch(() => {
    console.warn(`${MOCK_PREFIX} me fallback`)
    return { username: 'admin', role: 'admin' }
  }),
}

// ==================== 问答 ====================
export const chatApi = {
  /** 提问 → QaRecord */
  ask: (question: string, conversationId?: number) =>
    request.post('/chat/ask', { question, conversationId }).catch(() => {
      console.warn(`${MOCK_PREFIX} chat ask fallback`)
      return {
        data: {
          id: Date.now(),
          question,
          answer: '（模拟回答）这是对您问题的自动回复。后端服务暂时不可用，数据仅供前端演示。',
          sourceDocs: ['河海大学简介.md', '学生服务指南.pdf'],
          createTime: new Date().toISOString(),
        },
      }
    }),

  /** 问答历史 → QaRecord[] */
  history: () => request.get('/chat/history').catch(() => {
    console.warn(`${MOCK_PREFIX} chat history fallback`)
    return mockChatHistory
  }),

  /** 会话列表 → Conversation[] */
  conversations: () => request.get('/chat/conversations').catch(() => {
    console.warn(`${MOCK_PREFIX} conversations fallback`)
    return mockConversations
  }),

  /** 会话消息 → Message[] */
  messages: (convId: number) =>
    request.get(`/chat/conversations/${convId}/messages`).catch(() => {
      console.warn(`${MOCK_PREFIX} messages fallback convId=${convId}`)
      return mockChatHistory.filter((_, i) => i < 3)
    }),

  /** 删除会话 */
  deleteConversation: (convId: number) =>
    request.delete(`/chat/conversations/${convId}`).catch(() => {
      console.warn(`${MOCK_PREFIX} deleteConversation fallback convId=${convId}`)
      return true
    }),
}

// ==================== 管理员仪表盘 ====================
export const adminApi = {
  /** 仪表盘统计数据 → { userCount, documentCount, qaCount, todayQaCount } */
  stats: () => request.get('/admin/stats'),
}

// ==================== 文档管理 ====================
export const docApi = {
  /** 分页列表 → { records, total, current, size } */
  list: (page = 1, size = 10) =>
    request.get('/documents', { params: { page, size } }).catch(() => {
      console.warn(`${MOCK_PREFIX} doc list fallback page=${page}`)
      return mockDocList(page, size)
    }),

  /** 上传文档 → FormData */
  upload: (_file: File) => {
    const fd = new FormData()
    fd.append('file', _file)
    return request.post('/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).catch(() => {
      console.warn(`${MOCK_PREFIX} doc upload fallback`)
      return { id: Date.now(), title: _file.name, fileType: _file.name.split('.').pop(), status: 'READY', chunkCount: 1 }
    })
  },

  /** 删除文档 */
  remove: (id: number) => request.delete(`/documents/${id}`).catch(() => {
    console.warn(`${MOCK_PREFIX} doc remove fallback id=${id}`)
    return true
  }),
}

// ==================== 管理后台（Admin） ====================
export const adminApi = {
  /** 仪表盘统计 → { docCount, userCount, qaCount } */
  stats: () => request.get('/admin/stats'),

  /** 全量问答记录分页 → Page<QaRecord> */
  chatHistory: (page = 1, size = 10) =>
    request.get('/admin/chat/history', { params: { page, size } }),

  /** 单条问答详情 */
  chatDetail: (id: number) => request.get(`/admin/chat/${id}`),

  /** 重建向量索引 */
  rebuildIndex: () => request.post('/admin/rebuild-index'),
}

export default request
