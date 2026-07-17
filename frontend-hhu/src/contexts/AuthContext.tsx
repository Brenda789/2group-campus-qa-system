import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { authApi } from '../api'

export interface AuthUser {
  username: string
  role: 'admin' | 'user' | 'guest'
}

interface AuthContextValue {
  token: string | null
  user: AuthUser
  role: 'admin' | 'user' | 'guest'
  isLoggedIn: boolean
  isGuest: boolean
  login: (payload: { token?: string; username?: string; role?: 'admin' | 'user' | 'guest' }) => void
  logout: () => void
}

const defaultUser: AuthUser = { username: '', role: 'guest' }

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// 读取已存储的用户信息（localStorage 是登录用户，sessionStorage 是访客）
function readStoredAuth(): { token: string | null; user: AuthUser } {
  if (typeof window === 'undefined') return { token: null, user: defaultUser }
  // 优先 localStorage（登录用户持久化）
  let token = window.localStorage.getItem('token')
  let userStr = window.localStorage.getItem('user')
  // 其次 sessionStorage（访客，关闭标签页后消失）
  if (!token) {
    token = window.sessionStorage.getItem('token')
    userStr = window.sessionStorage.getItem('user')
  }
  if (!token) return { token: null, user: defaultUser }
  try {
    const parsed = userStr ? JSON.parse(userStr) : {}
    const role = (parsed.role || 'user').toLowerCase()
    return {
      token,
      user: {
        username: parsed.username || '',
        role: role === 'admin' ? 'admin' : role === 'guest' ? 'guest' : 'user',
      },
    }
  } catch {
    return { token, user: defaultUser }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ token: string | null; user: AuthUser }>(readStoredAuth)

  const login = useCallback((payload: { token?: string; username?: string; role?: 'admin' | 'user' | 'guest' }) => {
    const nextUser: AuthUser = {
      username: payload.username || '用户',
      role: (payload.role === 'admin' ? 'admin' : payload.role === 'guest' ? 'guest' : 'user') as AuthUser['role'],
    }
    const nextToken = payload.token || ''
    if (typeof window !== 'undefined') {
      if (nextUser.role === 'guest') {
        window.sessionStorage.setItem('token', nextToken)
        window.sessionStorage.setItem('user', JSON.stringify(nextUser))
      } else {
        window.localStorage.setItem('token', nextToken)
        window.localStorage.setItem('user', JSON.stringify(nextUser))
        window.sessionStorage.removeItem('token')
        window.sessionStorage.removeItem('user')
      }
    }
    setState({ token: nextToken, user: nextUser })
  }, [])

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('user')
      window.localStorage.removeItem('role')
      window.sessionStorage.removeItem('token')
      window.sessionStorage.removeItem('user')
    }
    setState({ token: null, user: defaultUser })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    token: state.token,
    user: state.user,
    role: state.user.role,
    isLoggedIn: Boolean(state.token) && state.user.role !== 'guest',
    isGuest: !state.token || state.user.role === 'guest',
    login,
    logout,
  }), [state, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
