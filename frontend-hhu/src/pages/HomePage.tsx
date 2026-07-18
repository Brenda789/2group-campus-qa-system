import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import {
  UploadOutlined, SafetyOutlined, SendOutlined,
  BookOutlined, TrophyOutlined, TeamOutlined, EnvironmentOutlined,
  CaretUpOutlined, CaretDownOutlined, RobotOutlined,
  LoadingOutlined, StopOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { chatApi } from '../api'
import ChatWindow, { type ChatWindowHandle } from '../components/ChatWindow'
import './HomePage.css'

/* ============================================================
   常量
   ============================================================ */
const BG_IMAGES = [
  '/images/campus/jintan.png',
  '/images/campus/jt1.jpg',
  '/images/campus/playground.jpg',
]
const SLIDE_INTERVAL = 6000

/** 环形卡片数据 */
const ringCards = [
  {
    icon: <BookOutlined />,
    title: '百年学府',
    desc: '始于1915年，中国水利高等教育发源地，秉承"艰苦朴素、实事求是"的校训精神。',
    color: '#005BAC',
    bg: 'rgba(0,91,172,0.18)',
  },
  {
    icon: <TrophyOutlined />,
    title: '双一流学科',
    desc: '水利工程、环境科学与工程入选国家"双一流"建设学科，跻身世界一流。',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.18)',
  },
  {
    icon: <TeamOutlined />,
    title: '5万+师生',
    desc: '覆盖工学、理学、管理学等十大学科门类，拥有完备的本硕博人才培养体系。',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.18)',
  },
  {
    icon: <EnvironmentOutlined />,
    title: '一校两地',
    desc: '南京·常州，两地三校区协同办学，西康路校区、江宁校区、金坛校区。',
    color: '#7dd3fc',
    bg: 'rgba(125,211,252,0.18)',
  },
]

/* ============================================================
   HomePage 主组件
   ============================================================ */
export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, logout } = useAuth()
  const chatRef = useRef<ChatWindowHandle>(null)

  /* ---- 背景轮播 ---- */
  const [currentSlide, setCurrentSlide] = useState(0)

  /* ---- 环形卡片索引 + 动画方向 ---- */
  const [cardIndex, setCardIndex] = useState(0)
  const [cardDir, setCardDir] = useState<'down' | 'up'>('down')
  const [cardLocked, setCardLocked] = useState(false)

  /* ---- 搜索输入 ---- */
  const [searchText, setSearchText] = useState('')

  /* ---- 内联多轮对话 ---- */
  type QATurn = { question: string; answer: string; loading: boolean; sources: string[] }
  const [conversation, setConversation] = useState<QATurn[]>([])
  const convIdRef = useRef<number | undefined>(undefined) // 当前会话 ID（登录用户）
  const guestConvIdRef = useRef<number>(0) // 访客模式下的会话 ID（固定一条）
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const isStreaming = conversation.some((t) => t.loading)

  const handleStop = () => {
    cancelRef.current?.()
    cancelRef.current = null
    setConversation((prev) =>
      prev.map((t) => (t.loading ? { ...t, answer: t.answer + '\n\n[已停止生成]', loading: false } : t)),
    )
  }

  const doAsk = (q: string) => {
    cancelRef.current?.()
    const newTurn: QATurn = { question: q, answer: '', loading: true, sources: [] }
    setConversation((prev) => [...prev, newTurn])

    const turnIndex = conversation.length
    cancelRef.current = chatApi.streamAsk(
      q,
      convIdRef.current, // 同一条会话
      (token) => {
        setConversation((prev) => {
          const next = [...prev]
          const t = next[turnIndex]
          if (t) next[turnIndex] = { ...t, answer: t.answer + token }
          return next
        })
      },
      (fullAnswer, resolvedConvId) => {
        cancelRef.current = null
        if (resolvedConvId != null) convIdRef.current = resolvedConvId // 首轮拿到后保存
        setConversation((prev) => {
          const next = [...prev]
          const t = next[turnIndex]
          if (t) next[turnIndex] = { ...t, answer: fullAnswer, loading: false }
          return next
        })
        // 访客模式：将本轮 Q&A 追加到固定的一条 guest 会话中
        if (!isLoggedIn) {
          chatRef.current?.addGuestConversation(guestConvIdRef.current, q, fullAnswer)
        }
      },
      (err) => {
        cancelRef.current = null
        setConversation((prev) => {
          const next = [...prev]
          const t = next[turnIndex]
          if (t) next[turnIndex] = { ...t, answer: `[错误] ${err}`, loading: false }
          return next
        })
      },
      (sources) => {
        setConversation((prev) => {
          const next = [...prev]
          const t = next[turnIndex]
          if (t) next[turnIndex] = { ...t, sources }
          return next
        })
      },
    )
  }

  const handleSearch = () => {
    const q = searchText.trim()
    if (!q) { message.info('请输入您想提问的内容'); return }
    setSearchText('')
    doAsk(q)
  }

  const handleQuickQuestion = (q: string) => {
    doAsk(q)
  }

  /** 开始新对话 */
  const newConversation = () => {
    cancelRef.current?.()
    cancelRef.current = null
    convIdRef.current = undefined
    guestConvIdRef.current = Date.now() // 访客：新 ID → ChatWindow 左侧新增一条
    setConversation([])
    setSearchText('')
  }

  // 面板出现时滚动到底部
  useEffect(() => {
    if (conversation.length > 0 && panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight
    }
  }, [conversation])

  /** 快捷问题 */
  const quickQuestions = [
    '河海大学的校训是什么？',
    '图书馆开放时间？',
    '校园卡如何补办？',
    '奖学金怎么申请？',
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BG_IMAGES.length)
    }, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  /* ---- 卡片组：叠放 + 抽出动画 ---- */
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rotateUp = () => {
    if (cardLocked) return
    setCardDir('up')
    setCardLocked(true)
    setCardIndex((prev) => (prev - 1 + ringCards.length) % ringCards.length)
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    lockTimerRef.current = setTimeout(() => setCardLocked(false), 580)
  }
  const rotateDown = () => {
    if (cardLocked) return
    setCardDir('down')
    setCardLocked(true)
    setCardIndex((prev) => (prev + 1) % ringCards.length)
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    lockTimerRef.current = setTimeout(() => setCardLocked(false), 580)
  }

  /** 每张卡片的视觉 offset：0=active, 1=紧贴下方, 2=再下方, 3=最底 */
  const getCardOffset = (i: number) => {
    const n = ringCards.length
    return (i - cardIndex + n) % n
  }

  /** offset → CSS 类名 */
  const cardOffsetClass = (offset: number) => {
    if (offset === 0) return 'card-pos-0'
    if (offset === 1) return 'card-pos-1'
    if (offset === 2) return 'card-pos-2'
    return 'card-pos-3'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="home-page">
      {/* ===== 背景轮播 ===== */}
      <div className="home-bg-carousel">
        {BG_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`home-bg-slide${i === currentSlide ? ' active' : ''}`}
          />
        ))}
      </div>

      {/* 压暗滤镜 */}
      <div className="home-bg-overlay" />

      {/* ================================================================
          顶部导航栏
         ================================================================ */}
      <nav className="home-nav">
        {/* 左侧 Logo */}
        <div className="home-nav-left">
          <img src="/images/logo.svg" alt="河海大学" className="home-nav-logo" />
        </div>

        {/* 中间按钮 */}
        <div className="home-nav-center">
          <button className="home-nav-btn" onClick={() => chatRef.current?.openUpload()}>
            <UploadOutlined className="home-nav-btn-icon" />
            <span>上传文档</span>
          </button>
          <button className="home-nav-btn" onClick={() => navigate('/admin')}>
            <SafetyOutlined className="home-nav-btn-icon" />
            <span>管理后台</span>
          </button>
        </div>

        {/* 右侧登录/注册/退出 */}
        <div className="home-nav-right">
          {isLoggedIn ? (
            <>
              <span className="home-nav-user">👋 {user.username}</span>
              <button className="home-nav-btn-outline" onClick={() => { logout(); navigate('/') }}>
                退出登录
              </button>
            </>
          ) : (
            <>
              <button className="home-nav-btn" onClick={() => navigate('/login')}>
                登录
              </button>
              <button className="home-nav-btn-solid" onClick={() => navigate('/login')}>
                注册
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ================================================================
          主内容区 — 三栏布局
         ================================================================ */}
      <main className="home-main">
        {/* 左侧叠放卡片组 */}
        <div className="home-left">
          {/* 上切换按钮 */}
          <button className="home-ring-arrow" onClick={rotateUp} aria-label="上一张" style={{ alignSelf: 'center' }}>
            <CaretUpOutlined />
          </button>

          <div className="home-deck-viewport">
            {ringCards.map((card, i) => {
              const offset = getCardOffset(i)
              return (
                <div
                  key={i}
                  className={`home-deck-card ${cardOffsetClass(offset)}`}
                  data-dir={cardDir}
                >
                  <div className="home-ring-icon" style={{ background: card.bg, color: card.color }}>
                    {card.icon}
                  </div>
                  <h3 className="home-ring-title">{card.title}</h3>
                  <p className="home-ring-desc">{card.desc}</p>
                </div>
              )
            })}
          </div>

          {/* 下切换按钮 */}
          <button className="home-ring-arrow" onClick={rotateDown} aria-label="下一张" style={{ alignSelf: 'center' }}>
            <CaretDownOutlined />
          </button>
        </div>

        {/* 中间搜索区 */}
        <div className={`home-center${conversation.length > 0 ? ' has-conv' : ''}`}>
          {conversation.length === 0 && (
            <h2 className="home-center-title">智能问答助手</h2>
          )}
          {conversation.length === 0 && (
            <p className="home-center-sub">
              基于大语言模型的校园智能问答系统 · 输入问题即获精准回答
            </p>
          )}

          {/* 内联多轮对话面板 — 聊天气泡布局 */}
          {conversation.length > 0 && (
            <div className="home-answer-panel" ref={panelRef}>
              {/* 内容不足时用 margin-top:auto 推到底部 */}
              <div className="home-panel-inner">
                {conversation.map((turn, i) => (
                  <div key={i} className="home-qa-turn">
                    {/* 用户问题 — 右对齐灰色气泡 */}
                    <div className="home-chat-row user">
                      <div className="home-chat-bubble user">
                        {turn.question}
                      </div>
                    </div>
                    {/* AI 回答 — 左对齐 */}
                    <div className="home-chat-row assistant">
                      <div className="home-chat-bubble assistant">
                        {turn.loading && !turn.answer && (
                          <span className="home-answer-loading"><LoadingOutlined spin /> 思考中…</span>
                        )}
                        {turn.answer && (
                          <span className="home-answer-text">{turn.answer}</span>
                        )}
                        {turn.loading && turn.answer && (
                          <span className="home-answer-cursor" />
                        )}
                        {/* 来源文档标签 — 紧贴回答文字 */}
                        {turn.sources.length > 0 && (
                          <div className="home-sources-row">
                            {turn.sources.map((src, si) => (
                              <span key={si} className="home-source-tag">{src}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="home-panel-footer">
                <button className="home-answer-close" onClick={newConversation}>开始新对话</button>
              </div>
            </div>
          )}

          <div className="home-search-wrap">
            <input
              className="home-search-input"
              type="text"
              placeholder="输入你想提问的内容…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {isStreaming ? (
              <button className="home-search-btn stop" onClick={handleStop} aria-label="中止回答">
                <StopOutlined />
              </button>
            ) : (
              <button className="home-search-btn" onClick={handleSearch} aria-label="发送">
                <SendOutlined />
              </button>
            )}
          </div>

          {/* 快捷问题 — 仅无问答时显示 */}
          {conversation.length === 0 && (
            <div className="home-quick-questions">
              {quickQuestions.map((q) => (
                <button key={q} className="home-quick-btn" onClick={() => handleQuickQuestion(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右侧留白 */}
        <div className="home-right" />
      </main>

      {/* ===== 底部 ===== */}
      <footer className="home-footer">
        河海大学 · 校园智能问答平台 &copy; {new Date().getFullYear()}
      </footer>

      {/* ===== 底部渐变条 — 自下向上渐隐 ===== */}
      <div className="home-bottom-bar" />

      {/* ===== 右下角机器人悬浮窗 — 白底蓝标 ===== */}
      <button className="home-fab" onClick={() => chatRef.current?.openChat()} aria-label="智能问答助手">
        <RobotOutlined />
      </button>

      {/* ===== 浮动聊天窗口 ===== */}
      <ChatWindow ref={chatRef} mode="floating" />
    </div>
  )
}
