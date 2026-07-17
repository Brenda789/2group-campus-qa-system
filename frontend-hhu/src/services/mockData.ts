/**
 * 集中式 Mock 数据
 *
 * 当后端不可达时，前端各页面使用此处的模拟数据以保证完整交互流程可跑通。
 * 仅在 API 请求失败（超时/网络错误）时自动激活，不影响正常联调。
 */

// ==================== 用户 ====================
export const mockUsers = [
  { id: 1, username: 'admin', email: 'admin@hhu.edu.cn', role: 'admin', status: 1, createTime: '2026-07-10T10:00:00' },
  { id: 2, username: 'zhangsan', email: 'zhangsan@hhu.edu.cn', role: 'user', status: 1, createTime: '2026-07-12T14:30:00' },
  { id: 3, username: 'lisi', email: 'lisi@hhu.edu.cn', role: 'user', status: 0, createTime: '2026-07-14T09:15:00' },
  { id: 4, username: 'wangwu', email: 'wangwu@hhu.edu.cn', role: 'user', status: 1, createTime: '2026-07-15T16:45:00' },
  { id: 5, username: 'zhaoliu', email: 'zhaoliu@hhu.edu.cn', role: 'admin', status: 1, createTime: '2026-07-16T08:20:00' },
  { id: 6, username: 'sunqi', email: 'sunqi@hhu.edu.cn', role: 'user', status: 0, createTime: '2026-07-13T11:10:00' },
  { id: 7, username: 'zhouba', email: 'zhouba@hhu.edu.cn', role: 'user', status: 1, createTime: '2026-07-11T15:55:00' },
  { id: 8, username: 'wujiu', email: 'wujiu@hhu.edu.cn', role: 'user', status: 1, createTime: '2026-07-16T09:00:00' },
]

// ==================== 文档 ====================
export const mockDocs = [
  { id: 1, title: '河海大学简介.md', fileType: 'md', status: 'READY', chunkCount: 12 },
  { id: 2, title: '学生服务指南.pdf', fileType: 'pdf', status: 'READY', chunkCount: 25 },
  { id: 3, title: '校园地图说明.docx', fileType: 'docx', status: 'PROCESSING', chunkCount: 0 },
  { id: 4, title: '招生简章2026.pdf', fileType: 'pdf', status: 'READY', chunkCount: 30 },
  { id: 5, title: '奖学金申请流程.txt', fileType: 'txt', status: 'READY', chunkCount: 8 },
]

// ==================== 问答记录 ====================
export const mockChatHistory = [
  { id: 1, userId: 2, question: '河海大学有几个校区？', answer: '河海大学共有三个校区：西康路校区（南京）、江宁校区（南京）和常州校区。', createTime: '2026-07-16T09:00:00' },
  { id: 2, userId: 3, question: '江宁校区图书馆开放时间？', answer: '江宁校区图书馆开放时间为每天 7:00-22:30，周末及节假日正常开放。', createTime: '2026-07-16T10:30:00' },
  { id: 3, userId: 2, question: '如何办理校园卡？', answer: '新生入学后由学校统一办理校园卡。如有遗失，可前往信息中心挂失补办，需携带身份证。', createTime: '2026-07-16T11:00:00' },
  { id: 4, userId: 4, question: '学校有哪些食堂？', answer: '河海大学各校区均设有多座食堂：江宁校区有第一食堂、第二食堂、第三食堂及民族餐厅。', createTime: '2026-07-16T14:20:00' },
  { id: 5, userId: 5, question: '怎么申请奖学金？', answer: '奖学金每学年评选一次，学生需在规定时间内提交申请表及相关材料至学院学工办。', createTime: '2026-07-16T15:45:00' },
]

// ==================== 会话 ====================
export const mockConversations = [
  { id: 1, title: '关于校区与图书馆', createTime: '2026-07-16T09:00:00' },
  { id: 2, title: '校园生活指南', createTime: '2026-07-16T14:00:00' },
]

// ==================== 辅助函数 ====================
export function mockUserList(page: number, size: number, keyword?: string) {
  const filtered = keyword
    ? mockUsers.filter(u => u.username.includes(keyword) || u.email.includes(keyword))
    : [...mockUsers]
  const start = (page - 1) * size
  return {
    records: filtered.slice(start, start + size),
    total: filtered.length,
    current: page,
    size,
  }
}

export function mockDocList(page: number, size: number) {
  const start = (page - 1) * size
  return {
    records: mockDocs.slice(start, start + size),
    total: mockDocs.length,
    current: page,
    size,
  }
}
