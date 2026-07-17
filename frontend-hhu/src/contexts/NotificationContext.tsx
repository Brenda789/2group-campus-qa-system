import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'processing'
  category: 'user' | 'document' | 'system'
  message: string
  time: string
}

interface NotificationContextValue {
  notifications: Notification[]
  push: (n: Omit<Notification, 'id' | 'time'>) => void
  clear: () => void
  hasUnseen: boolean
  markAllSeen: () => void
}

const CTX = createContext<NotificationContextValue | undefined>(undefined)

const STORAGE_KEY = 'hhu_notifications'
const SEEN_KEY = 'hhu_notifications_seen_id'
const MAX = 50

function readStored(): Notification[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStored(list: Notification[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)))
  } catch { /* quota exceeded */ }
}

let _idCounter = Date.now()

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(readStored)
  const [lastSeenId, setLastSeenId] = useState<string>(() => {
    try {
      return sessionStorage.getItem(SEEN_KEY) || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    saveStored(notifications)
  }, [notifications])

  const push = useCallback((n: Omit<Notification, 'id' | 'time'>) => {
    const item: Notification = {
      ...n,
      id: String(++_idCounter),
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    }
    setNotifications((prev) => [item, ...prev].slice(0, MAX))
  }, [])

  const clear = useCallback(() => {
    setNotifications([])
    const newId = String(++_idCounter)
    setLastSeenId(newId)
    try { sessionStorage.setItem(SEEN_KEY, newId) } catch {}
  }, [])

  const markAllSeen = useCallback(() => {
    const latestId = notifications.length > 0 ? notifications[0].id : ''
    setLastSeenId(latestId)
    try { sessionStorage.setItem(SEEN_KEY, latestId) } catch {}
  }, [notifications])

  const hasUnseen = notifications.length > 0 && notifications[0].id !== lastSeenId

  const value = useMemo(
    () => ({ notifications, push, clear, hasUnseen, markAllSeen }),
    [notifications, push, clear, hasUnseen, markAllSeen],
  )

  return <CTX.Provider value={value}>{children}</CTX.Provider>
}

export function useNotifications() {
  const ctx = useContext(CTX)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
