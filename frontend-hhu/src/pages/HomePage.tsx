import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Card, message, Space, Tag, Row, Col, Typography, Spin, Modal, Upload } from 'antd'
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
  TeamOutlined,
  TrophyOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { chatApi, docApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text, Paragraph } = Typography

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
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

/** 首页特色卡片数据 */
const features = [
  { icon: <BookOutlined />, title: '百年学府', desc: '始于1915年，中国水利高等教育发源地', color: '#005BAC', bg: '#edf6ff' },
  { icon: <TrophyOutlined />, title: '双一流学科', desc: '水利工程、环境科学与工程入选', color: '#059669', bg: '#ecfdf5' },
  { icon: <TeamOutlined />, title: '5万+师生', desc: '覆盖工学、理学、管理学等多学科', color: '#7c3aed', bg: '#f5f3ff' },
  { icon: <EnvironmentOutlined />, title: '三区办学', desc: '南京·常州，一校多区', color: '#d97706', bg: '#fffbeb' },
]

/** 前台门户首页 + 浮动问答机器人
 *
 *  支持两种模式：
 *  - 访客（未登录）：问答正常使用，会话记录存在浏览器内存中，刷新页面后消失
 *  - 登录用户：会话记录持久化到后端，刷新不丢失
 */
export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, logout } = useAuth()
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
  const [uploadStatus, setUploadStatus] = useState<string>('') // 文档处理状态
  const [uploadDocId, setUploadDocId] = useState<number | null>(null)
  const uploadPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgEnd = useRef<HTMLDivElement>(null)
  const cancelStream = useRef<(() => void) | null>(null)

  // 组件卸载时取消进行中的流式请求 + 清理上传轮询
  useEffect(() => {
    return () => {
      cancelStream.current?.()
      if (uploadPollRef.current) clearInterval(uploadPollRef.current)
    }
  }, [])

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

  const loadConversations = () => {
    if (isLoggedIn) loadConversationsFromApi()
    else loadConversationsFromLocal()
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

  // ==================== 发送消息（流式） ====================

  const send = (text: string) => {
    if (!text.trim() || loading) return
    const q = text.trim()
    setInput('')

    // 取消上一个进行中的流（如果有）
    cancelStream.current?.()

    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    // 先插入空的 assistant bubble（打字机效果将逐字填充）
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    cancelStream.current = chatApi.streamAsk(
      q,
      isLoggedIn ? (activeConvId ?? undefined) : undefined,
      // ---- onToken：逐字追加 ----
      (token) => {
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + token }
          }
          return updated
        })
      },
      // ---- onDone：流结束 ----
      (fullAnswer, resolvedConvId) => {
        cancelStream.current = null
        setLoading(false)

        if (isLoggedIn) {
          // 登录用户：后端已异步保存，刷新会话列表
          if (!activeConvId && resolvedConvId) {
            setActiveConvId(resolvedConvId)
          }
          loadConversationsFromApi()
        } else {
          // 访客：本地存储
          let convId = activeConvId
          if (convId === null) {
            convId = guestNextId
            setGuestNextId((n) => n + 1)
            setActiveConvId(convId)
          }
          setGuestConvs((prev) => {
            const existing = prev[convId!] || []
            return {
              ...prev,
              [convId!]: [
                ...existing,
                { role: 'user', content: q },
                { role: 'assistant', content: fullAnswer },
              ],
            }
          })
          loadConversationsFromLocal()
        }
      },
      // ---- onError：流中断 ----
      (err) => {
        cancelStream.current = null
        setLoading(false)
        message.error('发送失败: ' + err)
        // 最后一个空 bubble 显示错误信息
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx]?.role === 'assistant' && !updated[lastIdx].content) {
            updated[lastIdx] = { ...updated[lastIdx], content: `[错误] ${err}` }
          }
          return updated
        })
      },
    )
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

  // ==================== 上传文档（含状态追踪） ====================

  const STATUS_LABELS: Record<string, string> = {
    PROCESSING: '排队处理中',
    PARSING: '解析文件中',
    SPLITTING: '文本切片中',
    EMBEDDING: '向量化中',
    READY: '处理完成',
    ERROR: '处理失败',
  }

  const clearUploadState = () => {
    setUploading(false)
    setUploadDocId(null)
    setUploadStatus('')
    if (uploadPollRef.current) {
      clearInterval(uploadPollRef.current)
      uploadPollRef.current = null
    }
  }

  const handleUpload = async (info: any) => {
    const file = info.file as File
    setUploading(true)
    setUploadStatus('PROCESSING')

    try {
      const doc: any = await docApi.upload(file)
      if (!doc?.id) {
        message.error('上传返回异常')
        clearUploadState()
        return
      }
      setUploadDocId(doc.id)

      // 每 500ms 轮询文档状态
      uploadPollRef.current = setInterval(async () => {
        try {
          const latest: any = await docApi.getById(doc.id)
          if (!latest) return

          setUploadStatus(latest.status)

          if (latest.status === 'READY') {
            clearUploadState()
            setUploadOpen(false)
            message.success(`处理完成，共 ${latest.chunkCount ?? 0} 个切片`)
          } else if (latest.status === 'ERROR') {
            clearUploadState()
            message.error('文档处理失败，请检查文件格式')
          }
        } catch {
          // 轮询失败不提示，等下次重试
        }
      }, 500)

    } catch (e: any) {
      message.error(e?.message || '上传失败')
      clearUploadState()
    }
  }

  // ==================== 渲染 ====================
  return (
    <div style={{ minHeight: '100vh', background: 'var(--hhu-bg, #f0f4f9)' }}>
      {/* 顶部导航 */}
      <header
        style={{
          background: 'linear-gradient(135deg, #0a2540 0%, #0d3b66 50%, #0f4478 100%)',
          color: '#fff',
          padding: '0 40px',
          height: 64,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #0ea5e9, #005BAC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800,
            boxShadow: '0 4px 12px rgba(14,165,233,0.35)',
          }}>河</span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>河海大学</span>
        </div>
        <Space>
          {/* 上传文档按钮：所有人可见 */}
          <Button
            ghost
            onClick={() => setUploadOpen(true)}
            icon={<UploadOutlined />}
            style={{
              borderRadius: 8, fontWeight: 600, fontSize: 14,
              borderColor: '#7dd3fc', color: '#7dd3fc',
            }}
          >
            上传文档
          </Button>
          {isLoggedIn ? (
            <>
              <span style={{ color: '#a5d8ff', fontSize: 14, fontWeight: 500 }}>
                👋 {user.username}
              </span>
              <Button
                type="primary"
                ghost
                onClick={() => navigate('/admin')}
                icon={<SafetyOutlined />}
                style={{
                  borderRadius: 8, fontWeight: 600, fontSize: 14,
                  borderColor: '#7dd3fc', color: '#7dd3fc',
                }}
              >
                管理后台
              </Button>
              <Button
                type="text"
                onClick={() => { logout(); navigate('/'); }}
                style={{ color: '#94a3b8', fontWeight: 500 }}
              >
                退出
              </Button>
            </>
          ) : (
            <>
              <Button
                type="primary"
                ghost
                onClick={() => navigate('/login')}
                style={{
                  borderRadius: 8, fontWeight: 600, fontSize: 14,
                  borderColor: '#7dd3fc', color: '#7dd3fc',
                }}
              >
                登录
              </Button>
              <Button
                type="primary"
                ghost
                onClick={() => navigate('/login')}
                icon={<SafetyOutlined />}
                style={{
                  borderRadius: 8, fontWeight: 600, fontSize: 14,
                  borderColor: '#7dd3fc', color: '#7dd3fc',
                }}
              >
                管理后台
              </Button>
            </>
          )}
        </Space>
      </header>

      {/* Hero 区域 */}
      <section
        style={{
          position: 'relative',
          background: `url('/images/campus/jintan.png') center/cover no-repeat`,
          padding: '80px 40px 100px',
          textAlign: 'center',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(10,37,64,0.85) 0%, rgba(13,59,102,0.75) 60%, rgba(240,244,249,1) 100%)',
        }} />
        <img
          src="/images/logo.svg"
          alt="河海大学校徽"
          style={{
            width: 200, display: 'block', margin: '0 auto 24px',
            filter: 'drop-shadow(0 8px 24px rgba(14,165,233,0.40))',
          }}
        />
        <Title level={2} style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 16, fontWeight: 400, fontSize: 20 }}>
          艰苦朴素 · 实事求是 · 严格要求 · 勇于探索
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, maxWidth: 600, margin: '0 auto' }}>
          一所以水利为特色、工科为主、多学科协调发展的教育部直属全国重点大学
        </Paragraph>
      </section>

      {/* 特色卡片 */}
      <section style={{ padding: '0 40px 40px', marginTop: -40 }}>
        <Row gutter={[20, 20]}>
          {features.map((f) => (
            <Col xs={24} sm={12} md={6} key={f.title}>
              <Card
                style={{
                  borderRadius: 16,
                  border: '1px solid #eef2f7',
                  textAlign: 'center',
                  cursor: 'default',
                }}
                styles={{ body: { padding: '28px 20px 24px' } }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: f.bg, color: f.color, fontSize: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  {f.icon}
                </div>
                <Title level={5} style={{ marginBottom: 6, fontWeight: 700 }}>{f.title}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{f.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* 底部信息 */}
      <section style={{ padding: '0 40px 60px' }}>
        <Card
          style={{ borderRadius: 16, border: '1px solid #eef2f7' }}
          styles={{ body: { padding: '32px 40px' } }}
        >
          <Row gutter={[40, 20]} align="middle">
            <Col xs={24} md={16}>
              <Title level={4} style={{ marginBottom: 8, fontWeight: 700 }}>
                💬 智能问答助手
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 14 }}>
                基于大语言模型的校园智能问答系统，覆盖校内办事指南、教务政策、生活服务等高频问题。
                点击右下角机器人图标开始提问。
                {!isLoggedIn && ' 登录后可永久保存问答记录。'}
              </Paragraph>
              <Space wrap>
                {QUICK_QUESTIONS.map((q) => (
                  <Tag
                    key={q}
                    style={{
                      cursor: 'pointer', borderRadius: 20, padding: '4px 14px',
                      fontSize: 13, border: '1px solid #dbeafe', background: '#eff6ff', color: '#005BAC',
                    }}
                    onClick={() => { setChatOpen(true); setTimeout(() => send(q), 300) }}
                  >
                    {q}
                  </Tag>
                ))}
              </Space>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                size="large"
                icon={<RobotOutlined />}
                onClick={() => setChatOpen(true)}
                style={{
                  borderRadius: 30, height: 52, padding: '0 32px', fontSize: 16, fontWeight: 600,
                  background: 'linear-gradient(135deg, #005BAC, #0ea5e9)',
                  border: 'none', boxShadow: '0 6px 24px rgba(0,91,172,0.35)',
                }}
              >
                开始提问
              </Button>
            </Col>
          </Row>
        </Card>
      </section>

      {/* 页脚 */}
      <footer style={{
        textAlign: 'center', padding: '28px 40px',
        borderTop: '1px solid #eef2f7',
        color: '#9ca3af', fontSize: 13,
      }}>
        河海大学 · 校园智能问答平台 &copy; {new Date().getFullYear()}
      </footer>

      {/* 浮动问答按钮 */}
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
            background: 'linear-gradient(135deg, #005BAC 0%, #0ea5e9 100%)',
            color: '#fff',
            fontSize: 28,
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(0,91,172,0.40)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,91,172,0.50)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,91,172,0.40)'
          }}
        >
          <RobotOutlined />
        </button>
      )}

      {/* 聊天窗口（含侧边栏） */}
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
        onCancel={() => { clearUploadState(); setUploadOpen(false) }}
        footer={null}
        destroyOnClose
      >
        <p style={{ color: '#999', marginBottom: 16 }}>
          支持 PDF / DOCX / TXT / MD，最大 10MB
          {!isLoggedIn && '。未登录上传的文档为临时文档，服务重启后清理'}
        </p>

        {/* 未开始上传：显示上传按钮 */}
        {!uploadStatus && (
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
        )}

        {/* 上传中 / 处理中：显示进度步骤 */}
        {uploadStatus && (
          <div style={{ padding: '8px 0' }}>
            {(['PROCESSING', 'PARSING', 'SPLITTING', 'EMBEDDING', 'READY', 'ERROR'] as const).map((key) => {
              const label = STATUS_LABELS[key]
              const statusOrder = ['PROCESSING', 'PARSING', 'SPLITTING', 'EMBEDDING', 'READY']
              const currentIdx = statusOrder.indexOf(uploadStatus)
              const stepIdx = statusOrder.indexOf(key)

              // 当前步骤及之前的都亮起
              const isActive = stepIdx <= currentIdx
              const isCurrent = key === uploadStatus
              const isError = key === 'ERROR' && uploadStatus === 'ERROR'

              // ERROR 不在正常流程里，单独处理
              if (key === 'ERROR') {
                if (uploadStatus !== 'ERROR') return null
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', color: '#ff4d4f', fontWeight: 500,
                  }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#ff4d4f', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>✕</span>
                    <span>{STATUS_LABELS.ERROR}</span>
                  </div>
                )
              }

              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  color: isActive ? '#005BAC' : '#ccc',
                  fontWeight: isCurrent ? 600 : 400,
                  transition: 'color 0.3s',
                }}>
                  {/* 步骤圆点 */}
                  {isCurrent ? (
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#005BAC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'pulse 1.2s ease-in-out infinite',
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#fff',
                      }} />
                    </span>
                  ) : isActive ? (
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#005BAC', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>✓</span>
                  ) : (
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: '2px solid #ddd', background: '#fff',
                    }} />
                  )}
                  <span>{label}</span>
                  {isCurrent && <Spin size="small" />}
                </div>
              )
            })}
          </div>
        )}

        {/* 上传中不可关闭提示 */}
        {uploadStatus && uploadStatus !== 'READY' && uploadStatus !== 'ERROR' && (
          <p style={{ color: '#faad14', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            处理中，请勿关闭此窗口
          </p>
        )}
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
