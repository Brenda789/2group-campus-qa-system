import axios from 'axios'

/**
 * Axios 实例 + 拦截器
 *
 * 对应 PDF Day2 §04：统一的请求/响应拦截
 * - 请求拦截：自动带 Bearer token
 * - 响应拦截：提取 data 层，统一处理 code !== 200 和 401
 */
const request = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
})

// ==================== 请求拦截：自动带 token（同时检查 localStorage 和 sessionStorage） ====================
request.interceptors.request.use((cfg) => {
  // 登录用户 token 存在 localStorage，访客 token 存在 sessionStorage
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

// ==================== 响应拦截：统一错误处理 ====================
request.interceptors.response.use(
  (res) => {
    const { code, message, data } = res.data
    if (code !== 200) {
      // 业务异常 → 抛出 message 给调用方 catch
      return Promise.reject(new Error(message || '请求失败'))
    }
    // 直接返回 data，调用方无需写 .data
    return data
  },
  (err) => {
    if (err.response?.status === 401) {
      // 清理过期 token（localStorage 登录用户 / sessionStorage 访客）
      const localToken = localStorage.getItem('token')
      const sessionToken = sessionStorage.getItem('token')
      if (localToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('role')
        if (!window.location.hash.includes('login')) {
          window.location.hash = '#/login'
        }
      }
      if (sessionToken) {
        // 访客 token 过期，清除后刷新页面重新获取
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
        window.location.reload()
      }
    }
    return Promise.reject(err)
  },
)

export default request
