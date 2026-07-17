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

  /** 修改密码
   *  不设 mock 降级——写操作必须透传后端错误。 */
  changePassword: (oldPassword: string, newPassword: string) =>
    request.put('/user/password', { oldPassword, newPassword }),

  /** 修改个人信息（邮箱）
   *  不设 mock 降级——写操作必须透传后端错误。 */
  updateProfile: (email: string) =>
    request.put('/user/profile', { email }),
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

  /** 问答点赞/踩（1=赞、-1=踩、0=取消） */
  feedback: (recordId: number, value: number) =>
    request.put(`/chat/${recordId}/feedback`, { feedback: value }),
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
    })
  },

  /** 删除文档
   *  不设 mock 降级——写操作必须透传后端错误。 */
  remove: (id: number) => request.delete(`/documents/${id}`),

  /** 重新处理单个文档 */
  reprocess: (id: number) => request.post(`/documents/${id}/reprocess`),

  /** 公开搜索已就绪的文档 */
  search: (keyword?: string) =>
    request.get('/documents/search', { params: { keyword } }).catch(() => {
      console.warn(`${MOCK_PREFIX} doc search fallback`)
      return []
    }),
}

// ==================== 管理后台（Admin） ====================
export const adminApi = {
  /** 仪表盘统计 → { userCount, documentCount, qaCount, todayQaCount } */
  stats: () => request.get('/admin/stats').catch(() => {
    console.warn(`${MOCK_PREFIX} admin stats fallback`)
    return { userCount: 0, documentCount: 0, qaCount: 0, todayQaCount: 0 }
  }),

  /** 全量问答记录分页 → Page<QaRecord> */
  chatHistory: (page = 1, size = 10) =>
    request.get('/admin/chat/history', { params: { page, size } }).catch(() => {
      console.warn(`${MOCK_PREFIX} admin chatHistory fallback`)
      return { records: [], total: 0 }
    }),
  chatDetail: (id: number) =>
    request.get(`/admin/chat/${id}`).catch(() => {
      console.warn(`${MOCK_PREFIX} admin chatDetail fallback id=${id}`)
      throw new Error('后端未连接，无法查看详情')
    }),

  /** 重建向量索引
   *  不设 mock 降级——写操作必须透传后端错误。 */
  rebuildIndex: () => request.post('/admin/rebuild-index'),
}

export default request
