import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card, message, Space, Tag, Spin, Modal, Upload } from 'antd'
import {
  RobotOutlined,
  SendOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  MessageOutlined,
  UploadOutlined,
  BookOutlined,
  EnvironmentOutlined,
  TrophyOutlined,
  SafetyOutlined,
  LikeOutlined,
  DislikeOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { chatApi, docApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  recordId?: number   // qa_record ID，用于点赞/踩
  feedback?: number   // 1=赞, -1=踩, 0=未评价
}

interface ConvItem {
  id: number
  title: string
}

/** 快捷问题 */
const QUICK_QUESTIONS = [
  '河海大学的校训是什么？',
  '图书馆开放时间？',
  '校园卡如何补办？',
  '奖学金怎么申请？',
]

/** 前台门户首页 + 浮动问答机器人
 *
 *  支持两种模式：
 *  - 访客（未登录）：问答正常使用，会话记录存在浏览器内存中，刷新页面后消失
 *  - 登录用户：会话记录持久化到后端，刷新不丢失
 */
export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, role, logout } = useAuth()
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<ConvItem[]>([])
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [hoveredConv, setHoveredConv] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const msgEnd = useRef<HTMLDivElement>(null)

  // ======== 访客模式：本地会话存储（刷新即消失） ========
  const [guestConvs, setGuestConvs] = useState<Record<number, Message[]>>({})
  const [guestNextId, setGuestNextId] = useState(1)

  // 自动滚动到底部
  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 打开聊天窗口时加载会话列表
  useEffect(() => {
    if (!chatOpen) return
    if (isLoggedIn) {
      loadConversationsFromApi()
    } else {
      loadConversationsFromLocal()
    }
  }, [chatOpen, isLoggedIn])

  // ==================== 会话列表 ====================

  const loadConversationsFromApi = async () => {
    try {
      const list: any = await chatApi.conversations()
      setConversations(list || [])
    } catch { /* 静默失败 */ }
  }

  const loadConversationsFromLocal = () => {
    const list: ConvItem[] = Object.entries(guestConvs).map(([id, msgs]) => {
      const firstUser = msgs.find(m => m.role === 'user')
      const title = firstUser
        ? (firstUser.content.length > 30 ? firstUser.content.substring(0, 30) + '...' : firstUser.content)
        : '新会话'
      return { id: Number(id), title }
    })
    setConversations(list)
  }

  // ==================== 消息加载 ====================

  const loadMessagesFromApi = async (convId: number) => {
    setConvLoading(true)
    try {
      const list: any = await chatApi.messages(convId)
      setMessages(
        (list || []).map((m: any) => ({
          role: m.role,
          content: m.content,
          sources: safeParseSources(m.sources),
        })),
      )
    } catch {
      message.error('加载消息失败')
    } finally {
      setConvLoading(false)
    }
  }

  const loadMessagesFromLocal = (convId: number) => {
    setMessages(guestConvs[convId] || [])
  }

  // ==================== 发送消息 ====================

  /** SSE 流式发送（登录用户使用，打字机效果） */
  const sendStream = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    // 先放一个空的 assistant 占位消息
    const placeholderIdx = messages.length + 1 // +1 for the user msg just added
    setMessages((prev) => [...prev, { role: 'assistant', content: '...', feedback: 0 }])

    const token = localStorage.getItem('token')
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: q, conversationId: activeConvId ?? undefined }),
      })

      if (!response.ok) throw new Error('流式请求失败')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取流')

      const decoder = new TextDecoder()
      let fullAnswer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // 按 SSE 协议逐行解析
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.substring(5).trim()
            fullAnswer += data
            // 逐 token 更新消息
            setMessages((prev) =>
              prev.map((m, i) =>
                i === placeholderIdx ? { ...m, content: fullAnswer } : m
              )
            )
          }
        }
      }

      // 流式完成后，用同步接口取 recordId、conversationId 等信息
      if (isLoggedIn) {
        try {
          const res: any = await chatApi.ask(q, activeConvId ?? undefined)
          if (res.conversationId && !activeConvId) {
            setActiveConvId(res.conversationId)
          }
          // 更新 recordId 以便点赞
          setMessages((prev) =>
            prev.map((m, i) =>
              i === placeholderIdx ? { ...m, recordId: res.id, content: fullAnswer } : m
            )
          )
          loadConversationsFromApi()
        } catch {
          // 降级：只更新内容
          setMessages((prev) =>
            prev.map((m, i) =>
              i === placeholderIdx ? { ...m, content: fullAnswer } : m
            )
          )
          loadConversationsFromApi()
        }
      }
    } catch {
      message.error('流式响应中断，请稍后重试')
      setMessages((prev) =>
        prev.map((m, i) =>
          i === placeholderIdx ? { ...m, content: m.content === '...' ? '（回答中断，请稍后重试）' : m.content } : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  /** 非流式发送（访客使用，兼容模式） */
  const sendNormal = async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res: any = await chatApi.ask(q, undefined)

      const assistantMsg: Message = {
        role: 'assistant',
        content: res.answer || '（未获取到回答）',
        sources: safeParseSources(res.sourceDocs),
        recordId: res.id,
        feedback: 0,
      }

      // 访客：本地存储
      let convId = activeConvId
      if (convId === null) {
        convId = guestNextId
        setGuestNextId((n) => n + 1)
        setActiveConvId(convId)
      }
      setGuestConvs((prev) => {
        const existing = prev[convId!] || []
        return { ...prev, [convId!]: [...existing, { role: 'user', content: q }, assistantMsg] }
      })
      setMessages((prev) => [...prev, assistantMsg])
      loadConversationsFromLocal()
    } catch {
      message.error('发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  /** 统一发送入口 */
  const send = (text: string) => {
    if (isLoggedIn) {
      sendStream(text)
    } else {
      sendNormal(text)
    }
  }

  // ==================== 点赞/踩 ====================

  const handleFeedback = async (recordId: number, value: number, msgIndex: number) => {
    try {
      await chatApi.feedback(recordId, value)
      setMessages((prev) => prev.map((m, i) =>
        i === msgIndex ? { ...m, feedback: value } : m
      ))
      message.success(value === 1 ? '已点赞' : '已踩')
    } catch {
      message.error('操作失败')
    }
  }

  // ==================== 会话操作 ====================

  const selectConversation = (convId: number) => {
    setActiveConvId(convId)
    if (isLoggedIn) {
      loadMessagesFromApi(convId)
    } else {
      loadMessagesFromLocal(convId)
    }
  }

  const newConversation = () => {
    setActiveConvId(null)
    setMessages([])
  }

  const deleteConversation = async (convId: number) => {
    if (isLoggedIn) {
      try {
        await chatApi.deleteConversation(convId)
        message.success('已删除')
        if (activeConvId === convId) {
          setActiveConvId(null)
          setMessages([])
        }
        loadConversationsFromApi()
      } catch {
        message.error('删除失败')
      }
    } else {
      // 访客：直接从本地移除
      setGuestConvs((prev) => {
        const next = { ...prev }
        delete next[convId]
        return next
      })
      if (activeConvId === convId) {
        setActiveConvId(null)
        setMessages([])
      }
      loadConversationsFromLocal()
    }
  }

  // ==================== 上传文档 ====================

  const handleUpload = async (info: any) => {
    const file = info.file as File
    setUploading(true)
    try {
      await docApi.upload(file)
      message.success('上传成功，正在处理')
      setUploadOpen(false)
    } catch (e: any) {
      message.error(e?.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  // ==================== 背景轮播 & 左侧卡片轮播 ====================
  const bgImages = [
    '/images/campus/jintan.png',
    '/images/campus/jintan.png',
    '/images/campus/jintan.png',
  ]
  const [bgIndex, setBgIndex] = useState(0)
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const [cardIndex, setCardIndex] = useState(0)

  const resetBgTimer = useCallback(() => {
    clearInterval(bgTimerRef.current)
    bgTimerRef.current = setInterval(() => setBgIndex(prev => (prev + 1) % bgImages.length), 5000)
  }, [bgImages.length])

  useEffect(() => {
    resetBgTimer()
    return () => clearInterval(bgTimerRef.current)
  }, [resetBgTimer])

  const goToBg = (i: number) => { setBgIndex(i); resetBgTimer() }

  const schoolCards = [
    { title: '百年学府', desc: '河海大学始于1915年，是中国水利高等教育的发源地，百年风雨兼程，培养了无数水利英才。', icon: <BookOutlined /> },
    { title: '双一流学科', desc: '水利工程、环境科学与工程入选国家"双一流"建设学科，工程学进入ESI全球排名前1‰。', icon: <TrophyOutlined /> },
    { title: '三区办学', desc: '学校在南京、常州两地办学，拥有西康路、江宁、金坛三个校区，总占地面积超4000亩。', icon: <EnvironmentOutlined /> },
    { title: '科研实力', desc: '设有国家级科研平台12个，省部级重点实验室40余个，承担多项国家重大科技项目。', icon: <SafetyOutlined /> },
  ]

  const prevCard = () => setCardIndex(prev => (prev - 1 + schoolCards.length) % schoolCards.length)
  const nextCard = () => setCardIndex(prev => (prev + 1) % schoolCards.length)

  // ==================== 渲染 ====================
  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      }}
    >
      {/* ===== 轮播背景 ===== */}
      {bgImages.map((img, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `url(${img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.45) saturate(0.8)',
            opacity: i === bgIndex ? 1 : 0,
            transition: 'opacity 1.5s ease',
            zIndex: 0,
          }}
        />
      ))}

      {/* ===== 底部背景圆点指示器 ===== */}
      <div
        style={{
          position: 'fixed',
          left: '5%',
          bottom: '6%',
          zIndex: 2,
          display: 'flex',
          gap: 10,
        }}
      >
        {bgImages.map((_, i) => (
          <button
            key={i}
            onClick={() => goToBg(i)}
            style={{
              width: i === bgIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: i === bgIndex ? '#fff' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.4s cubic-bezier(0.22,0.05,0.19,1)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* ===== 顶部导航栏 — 渐变变深 → 透明 ===== */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          padding: '0 32px',
          background: 'linear-gradient(180deg, rgba(6,11,20,0.70) 0%, rgba(6,11,20,0.25) 50%, transparent 100%)',
          backdropFilter: 'blur(28px) saturate(120%)',
          WebkitBackdropFilter: 'blur(28px) saturate(120%)',
          maskImage: 'linear-gradient(180deg, #000 0%, #000 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 50%, transparent 100%)',
        }}
      >
        {/* 左侧：Logo */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 180 }}>
          <img
            src="/images/logo.svg"
            alt="河海大学"
            style={{ height: 36, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}
          />
        </div>

        {/* 中间：功能按钮 — 纯文字 + 悬停圆形展开 */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flex: 1 }}>
          <button className="nav-text-btn" onClick={() => setUploadOpen(true)}>
            <UploadOutlined style={{ fontSize: 15 }} />
            上传文档
          </button>
          {role !== 'admin' && (
            <button className="nav-text-btn" onClick={() => navigate('/admin/profile')}>
              <UserOutlined style={{ fontSize: 15 }} />
              个人管理
            </button>
          )}
          <button className="nav-text-btn" onClick={() => navigate('/admin')}>
            <SafetyOutlined style={{ fontSize: 15 }} />
            管理后台
          </button>
        </div>

        {/* 右侧：登录/注册 或 退出 */}
        <div style={{ display: 'flex', gap: 10, minWidth: 180, justifyContent: 'flex-end' }}>
          {isLoggedIn ? (
            <>
              <span style={{ color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: 500, lineHeight: '38px' }}>
                👋 {user.username}
              </span>
              <Button
                onClick={() => { logout(); navigate('/'); }}
                style={{
                  borderRadius: 12,
                  fontWeight: 500,
                  fontSize: 14,
                  height: 38,
                  background: 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.70)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,80,80,0.20)'
                  e.currentTarget.style.color = '#ffcccc'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.70)'
                }}
              >
                退出登录 Logout
              </Button>
            </>
          ) : (
            <>
              <button className="nav-text-btn" onClick={() => navigate('/login')}>
                登录 Sign In
              </button>
              <button
                className="nav-text-btn"
                onClick={() => navigate('/login')}
                style={{ color: '#c4e1dd' }}
              >
                注册 Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {/* ===== 主体区域 ===== */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 64px)',
          padding: '0 5%',
          gap: '5%',
        }}
      >
        {/* ===== 左侧：环形卡片轮播 ===== */}
        <div
          style={{
            position: 'relative',
            width: 300,
            height: 360,
            flexShrink: 0,
          }}
        >
          {/* 卡片堆叠效果 */}
          {schoolCards.map((card, i) => {
            const offset = i - cardIndex
            const isActive = offset === 0
            const absOffset = Math.abs(offset)
            return (
              <div
                key={i}
                className="glass-card"
                onClick={() => {
                  if (offset === -1) prevCard()
                  if (offset === 1) nextCard()
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  transform: `translateY(${offset * 16}px) scale(${1 - absOffset * 0.06})`,
                  opacity: 1 - absOffset * 0.45,
                  zIndex: isActive ? 3 : 2 - absOffset,
                  cursor: absOffset === 1 ? 'pointer' : 'default',
                  pointerEvents: absOffset <= 1 ? 'auto' : 'none',
                  transition: 'all 0.5s cubic-bezier(0.22,0.05,0.19,1)',
                }}
              >
                <div
                  style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'rgba(196,225,221,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#c4e1dd', marginBottom: 16,
                  }}
                >
                  {card.icon}
                </div>
                <h3 style={{ color: 'rgba(255,255,255,0.92)', fontSize: 19, fontWeight: 600, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
                  {card.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                  {card.desc}
                </p>
              </div>
            )
          })}

          {/* 上下箭头 */}
          <button
            onClick={prevCard}
            style={{
              position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: 'rgba(255,255,255,0.75)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 5, transition: 'all 0.3s ease',
            }}
          >▲</button>
          <button
            onClick={nextCard}
            style={{
              position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: 'rgba(255,255,255,0.75)', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 5, transition: 'all 0.3s ease',
            }}
          >▼</button>
        </div>

        {/* ===== 中部：智能问答搜索框 ===== */}
        <div
          style={{
            flex: 1,
            maxWidth: 620,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              color: '#fff',
              fontSize: 36,
              fontWeight: 700,
              textShadow: '0 2px 20px rgba(255,255,255,0.20), 0 6px 40px rgba(0,0,0,0.5)',
              margin: '0 0 8px',
              letterSpacing: '-0.5px',
            }}
          >
            河海大学智能问答助手
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 15, margin: '0 0 36px' }}>
            基于大语言模型的校园智能问答系统，随时为您解答
          </p>

          {/* 搜索框 — 液态玻璃 */}
          <div
            className="liquid-search"
            style={{ boxShadow: '0 8px 40px rgba(20,50,132,0.30)' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  setChatOpen(true)
                  setTimeout(() => send(input), 200)
                }
              }}
              placeholder="输入你想提问的内容..."
              className="liquid-search-input"
            />
            <button
              onClick={() => { if (input.trim()) { setChatOpen(true); setTimeout(() => send(input), 200) } }}
              className="liquid-search-btn"
              title="发送"
            >
              <SendOutlined style={{ fontSize: 20 }} />
            </button>
          </div>

          {/* 快捷问题标签 */}
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {QUICK_QUESTIONS.map((q) => (
              <span
                key={q}
                onClick={() => { setChatOpen(true); setTimeout(() => send(q), 300) }}
                style={{
                  cursor: 'pointer',
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  background: 'rgba(255,255,255,0.10)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.60)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.60)'
                }}
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* ===== 页脚 ===== */}
      <footer
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '20px 40px',
          color: 'rgba(255,255,255,0.30)',
          fontSize: 12,
        }}
      >
        河海大学 · 校园智能问答平台 &copy; {new Date().getFullYear()}
      </footer>

      {/* ===== 右下角机器人悬浮按钮 ===== */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: 'fixed',
            right: 28,
            bottom: 28,
            width: 60,
            height: 60,
            border: 'none',
            borderRadius: 18,
            background: '#ffffff',
            color: '#005BAC',
            fontSize: 28,
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.25)'
          }}
        >
          <RobotOutlined />
        </button>
      )}

      {/* ===== 聊天窗口（保持原有逻辑） ===== */}
      {chatOpen && (
        <Card
          title={
            <Space>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #005BAC, #0ea5e9)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, color: '#fff',
              }}><RobotOutlined /></span>
              <span style={{ fontWeight: 700, fontSize: 15 }}>河海问答助手</span>
              {!isLoggedIn && (
                <Tag style={{
                  borderRadius: 10, fontSize: 10, border: '1px solid #fbbf24',
                  background: '#fef3c7', color: '#92400e',
                }}>
                  访客模式 · 刷新后记录消失
                </Tag>
              )}
            </Space>
          }
          extra={
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => setChatOpen(false)}
            />
          }
          style={{
            position: 'fixed',
            right: 24,
            bottom: 88,
            width: 680,
            height: 520,
            zIndex: 9998,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}
          styles={{ body: { padding: 0, flex: 1, display: 'flex', overflow: 'hidden' } }}
        >
          {/* ======== 左侧：会话列表 ======== */}
          <div
            style={{
              width: 200,
              minWidth: 200,
              borderRight: '1px solid #f0f0f0',
              display: 'flex',
              flexDirection: 'column',
              background: '#fafafa',
            }}
          >
            {/* 新对话按钮 */}
            <div style={{ padding: 12 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={newConversation}
                style={{ whiteSpace: 'nowrap' }}
              >
                新对话
              </Button>
              {!isLoggedIn && (
                <div style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 6 }}>
                  💡 登录后可永久保存
                </div>
              )}
            </div>

            {/* 会话列表 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  onMouseEnter={() => setHoveredConv(conv.id)}
                  onMouseLeave={() => setHoveredConv(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    marginBottom: 2,
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: activeConvId === conv.id ? '#e6f0ff' : 'transparent',
                    border: activeConvId === conv.id ? '1px solid #b3d4ff' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                      color: activeConvId === conv.id ? '#005BAC' : '#333',
                      fontWeight: activeConvId === conv.id ? 500 : 400,
                    }}
                  >
                    <MessageOutlined style={{ marginRight: 6, fontSize: 12, color: '#999' }} />
                    {conv.title}
                  </span>
                  <DeleteOutlined
                    onClick={(e) => {
                      e.stopPropagation()
                      Modal.confirm({
                        title: '确定删除该会话？',
                        content: '删除后无法恢复',
                        okText: '删除',
                        okType: 'danger',
                        cancelText: '取消',
                        onOk: () => deleteConversation(conv.id),
                      })
                    }}
                    style={{
                      fontSize: 12,
                      color: hoveredConv === conv.id ? '#ff4d4f' : '#bbb',
                      cursor: 'pointer',
                      marginLeft: 4,
                      transition: 'color 0.15s',
                    }}
                  />
                </div>
              ))}
              {conversations.length === 0 && (
                <div style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 24 }}>
                  暂无历史会话
                </div>
              )}
            </div>
          </div>

          {/* ======== 右侧：对话区 ======== */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* 消息区域 */}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {/* 无活跃会话 → 欢迎页 + 引导问题 */}
              {activeConvId === null && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', marginTop: 60 }}>
                  <RobotOutlined style={{ fontSize: 48 }} />
                  <p>你好！我是河海大学问答助手，有什么可以帮你？</p>
                  <div style={{ marginTop: 12 }}>
                    {QUICK_QUESTIONS.map((q) => (
                      <Tag
                        key={q}
                        color="blue"
                        style={{ cursor: 'pointer', marginBottom: 8 }}
                        onClick={() => send(q)}
                      >
                        {q}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {/* 加载中 */}
              {convLoading && (
                <div style={{ textAlign: 'center', marginTop: 60 }}>
                  <Spin />
                  <p style={{ color: '#999', marginTop: 8 }}>加载消息中...</p>
                </div>
              )}

              {/* 消息列表 */}
              {!convLoading &&
                messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 12,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        maxWidth: '85%',
                        padding: '10px 16px',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #005BAC, #0ea5e9)'
                          : '#f3f4f6',
                        color: msg.role === 'user' ? '#fff' : '#1f2937',
                        textAlign: 'left',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: 14,
                        lineHeight: 1.6,
                        boxShadow: msg.role === 'user' ? '0 2px 10px rgba(0,91,172,0.25)' : 'none',
                      }}
                    >
                      {msg.content}
                    </div>
                    {/* 点赞/踩按钮（仅登录用户 + 助手消息 + 有 recordId） */}
                    {isLoggedIn && msg.role === 'assistant' && msg.recordId && (
                      <div style={{ marginTop: 4, display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
                        <span
                          onClick={() => handleFeedback(msg.recordId!, msg.feedback === 1 ? 0 : 1, i)}
                          style={{
                            cursor: 'pointer', fontSize: 14,
                            color: msg.feedback === 1 ? '#005BAC' : '#999',
                            transition: 'color 0.2s',
                          }}
                          title="赞"
                        ><LikeOutlined /></span>
                        <span
                          onClick={() => handleFeedback(msg.recordId!, msg.feedback === -1 ? 0 : -1, i)}
                          style={{
                            cursor: 'pointer', fontSize: 14,
                            color: msg.feedback === -1 ? '#ff4d4f' : '#999',
                            transition: 'color 0.2s',
                          }}
                          title="踩"
                        ><DislikeOutlined /></span>
                      </div>
                    )}
                  </div>
                ))}
              {loading && (
                <div style={{ color: '#999', textAlign: 'center' }}>
                  <RobotOutlined spin /> 思考中...
                </div>
              )}
              <div ref={msgEnd} />
            </div>

            {/* 输入框 */}
            <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px' }}>
              <Input.Search
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onSearch={send}
                enterButton={<SendOutlined />}
                placeholder="输入你的问题..."
                loading={loading}
              />
            </div>
          </div>
        </Card>
      )}

      {/* 上传文档 Modal */}
      <Modal
        title="上传文档到知识库"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        footer={null}
        destroyOnClose
      >
        <p style={{ color: '#999', marginBottom: 16 }}>
          支持 PDF / DOCX / TXT / MD，最大 10MB
          {!isLoggedIn && '。未登录上传的文档为临时文档，服务重启后清理'}
        </p>
        <Upload
          beforeUpload={() => false}
          onChange={handleUpload}
          showUploadList={false}
          accept=".pdf,.docx,.doc,.txt,.md"
        >
          <Button type="primary" icon={<UploadOutlined />} loading={uploading} block>
            选择文件上传
          </Button>
        </Upload>
      </Modal>
    </div>
  )
}

/** 安全解析 sources，兼容 null / 空串 / 已解析数组 */
function safeParseSources(raw: any): string[] | undefined {
  if (!raw) return undefined
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }
  return undefined
}
