/**
 * Shared TypeScript types for the campus Q&A admin system.
 * Matches the API contract patterns from the Day2 PDF reference.
 */

// ==================== Generic API wrapper ====================

/** Standard backend JSON envelope: { code, message, data } */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** Paginated list returned by /list endpoints */
export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

// ==================== Auth ====================

export interface LoginResult {
  token: string
  username: string
  role: 'admin' | 'user'
}

export interface RegisterResult {
  id: number
}

// ==================== User ====================

export interface UserItem {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
  status: number    // 0 = disabled, 1 = enabled
  createTime: string
}

// ==================== Chat / QA ====================

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

// ==================== Document ====================

export interface DocumentItem {
  id: number
  title: string
  fileType: string
  status: 'READY' | 'PROCESSING' | 'ERROR'
  chunkCount: number
  createTime: string
}

// ==================== Auth helpers ====================

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function clearAuth(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('role')
}
