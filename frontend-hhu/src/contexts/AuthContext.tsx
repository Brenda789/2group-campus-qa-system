import { createContext, useContext, useMemo, useState } from 'react'

export interface AuthUser {
  username: string
  role: 'admin' | 'user'
}

interface AuthContextValue {
  token: string | null
  user: AuthUser
  role: 'admin' | 'user'
  isLoggedIn: boolean
  login: (payload: { token?: string; username?: string; role?: 'admin' | 'user' }) => void
  logout: () => void
}

const defaultUser: AuthUser = { username: '', role: 'user' }

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthUser {
  if (typeof window === 'undefined') return defaultUser
  try {
    const raw = window.localStorage.getItem('user')
    if (!raw) return defaultUser
    const parsed = JSON.parse(raw) as Partial<AuthUser>
    return {
      username: parsed.username || '',
      role: parsed.role?.toLowerCase() === 'admin' ? 'admin' : 'user',
    }
  } catch {
    return defaultUser
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('token')
  })
  const [user, setUser] = useState<AuthUser>(readStoredUser)

  const login = (payload: { token?: string; username?: string; role?: 'admin' | 'user' }) => {
    const nextUser: AuthUser = {
      username: payload.username || '用户',
      role: payload.role === 'admin' ? 'admin' : 'user',
    }
    const nextToken = payload.token || ''

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('token', nextToken)
      window.localStorage.setItem('user', JSON.stringify(nextUser))
      window.localStorage.setItem('role', nextUser.role)
    }

    setToken(nextToken)
    setUser(nextUser)
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token')
      window.localStorage.removeItem('user')
      window.localStorage.removeItem('role')
    }
    setToken(null)
    setUser(defaultUser)
  }

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    role: user.role,
    isLoggedIn: Boolean(token),
    login,
    logout,
  }), [token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
