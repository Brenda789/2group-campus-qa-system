import request from './services/request'

// ==================== 认证 ====================
export const authApi = {
  /** 获取 RSA 公钥 */
  getPublicKey: () => request.get('/auth/public-key'),

  /** 登录 → { token, username, role } */
  login: (username: string, password: string) =>
    request.post('/auth/login', { username, password }),

  /** 注册 → 返回新用户 ID */
  register: (username: string, password: string, email: string) =>
    request.post('/auth/register', { username, password, email }),
}

// ==================== 用户管理 ====================
export const userApi = {
  /** 分页列表 → { records, total, current, size } */
  list: (page = 1, size = 10, keyword?: string) =>
    request.get('/user/list', { params: { page, size, keyword } }),

  /** 启停用户 */
  toggleStatus: (userId: number, status: number) =>
    request.put(`/user/${userId}/status`, { status }),

  /** 删除用户（软删除） */
  remove: (userId: number) =>
    request.delete(`/user/${userId}`),

  /** 当前用户信息 */
  me: () => request.get('/user/me'),
}

// ==================== 问答 ====================
export const chatApi = {
  /** 提问 → QaRecord */
  ask: (question: string, conversationId?: number) =>
    request.post('/chat/ask', { question, conversationId }),

  /** 问答历史 → QaRecord[] */
  history: () => request.get('/chat/history'),

  /** 会话列表 → Conversation[] */
  conversations: () => request.get('/chat/conversations'),

  /** 会话消息 → Message[] */
  messages: (convId: number) =>
    request.get(`/chat/conversations/${convId}/messages`),

  /** 删除会话 */
  deleteConversation: (convId: number) =>
    request.delete(`/chat/conversations/${convId}`),
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
    request.get('/documents', { params: { page, size } }),

  /** 上传文档 → FormData */
  upload: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return request.post('/documents', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** 删除文档 */
  remove: (id: number) => request.delete(`/documents/${id}`),
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
