import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

/** 请求拦截：自动带 token */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/** 响应拦截：401 时回登录页 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.hash.includes('login')) {
        window.location.href = '/#/login'
      }
    }
    return Promise.reject(err)
  }
)

/** ---------- 认证 ---------- */
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  register: (username: string, password: string, email: string) =>
    api.post('/auth/register', { username, password, email }),
}

/** ---------- 问答 ---------- */
export const chatApi = {
  ask: (question: string) => api.post('/chat/ask', { question }),
  history: () => api.get('/chat/history'),
}

/** ---------- 文档 ---------- */
export const docApi = {
  list: () => api.get('/documents'),
  delete: (id: number) => api.delete(`/documents/${id}`),
}

export default api
