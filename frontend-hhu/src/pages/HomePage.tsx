import { useState, useRef, useEffect } from 'react'
import { Button, Input, Card, message, Space, Tag, Spin, Modal, Upload } from 'antd'
import {
  RobotOutlined,
  SendOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  MessageOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { chatApi, docApi } from '../api'

interface MessageItem {
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

/** 前台门户首页 + 浮动问答机器人（侧边栏版） */
export default function HomePage() {
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<ConvItem[]>([])
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [hoveredConv, setHoveredConv] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const msgEnd = useRef<HTMLDivElement>(null)

  const loggedIn = !!localStorage.getItem('token')

  // 自动滚动到底部
  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 打开聊天窗口时加载会话列表（仅登录用户）
  useEffect(() => {
    if (chatOpen && loggedIn) loadConversations()
  }, [chatOpen])

  const loadConversations = async () => {
    try {
      const list: any = await chatApi.conversations()
      setConversations(list || [])
    } catch {
      // 未登录时静默失败
    }
  }

  const loadMessages = async (convId: number) => {
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

  // ==================== 发送消息 ====================
  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const q = text.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res: any = await chatApi.ask(q, activeConvId ?? undefined)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          sources: safeParseSources(res.sourceDocs),
        },
      ])
      // 新会话 → 设置为当前活跃会话
      if (!activeConvId && res.conversationId) {
        setActiveConvId(res.conversationId)
      }
      loadConversations() // 刷新侧边栏列表
    } catch {
      message.error('发送失败，请稍后重试')
    } finally {
      setLoading(false)
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

  // ==================== 会话操作 ====================
  const selectConversation = (convId: number) => {
    setActiveConvId(convId)
    loadMessages(convId)
  }

  const newConversation = () => {
    setActiveConvId(null)
    setMessages([])
  }

  const deleteConversation = async (convId: number) => {
    try {
      await chatApi.deleteConversation(convId)
      message.success('已删除')
      if (activeConvId === convId) {
        setActiveConvId(null)
        setMessages([])
      }
      loadConversations()
    } catch {
      message.error('删除失败')
    }
  }

  // ==================== 渲染 ====================
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 顶部导航 */}
      <header
        style={{
          background: '#005BAC',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>🌊 河海大学校园门户</h1>
        <Space>
          <Button ghost onClick={() => setUploadOpen(true)} icon={<UploadOutlined />}>
            上传文档
          </Button>
          {loggedIn ? (
            <Button ghost href="#/admin">管理后台</Button>
          ) : (
            <Button ghost href="#/login" icon={<UserOutlined />}>登录</Button>
          )}
        </Space>
      </header>

      {/* 页面占位 */}
      <main style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#005BAC' }}>欢迎来到河海大学</h2>
        <p>河海大学是一所以水利为特色、工科为主、多学科协调发展的教育部直属全国重点大学</p>
      </main>

      {/* 浮动问答气泡 */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: 56,
            height: 56,
            border: 'none',
            borderRadius: '50%',
            background: '#005BAC',
            color: '#fff',
            fontSize: 28,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,91,172,0.35)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              <RobotOutlined /> 河海问答助手
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
          {/* ======== 左侧：会话列表（仅登录用户可见） ======== */}
          {loggedIn && (
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
          )}

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
                        padding: '8px 14px',
                        borderRadius: 12,
                        background: msg.role === 'user' ? '#005BAC' : '#f0f0f0',
                        color: msg.role === 'user' ? '#fff' : '#333',
                        textAlign: 'left',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
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
        onCancel={() => setUploadOpen(false)}
        footer={null}
        destroyOnClose
      >
        <p style={{ color: '#999', marginBottom: 16 }}>
          支持 PDF / DOCX / TXT / MD，最大 10MB
          {!loggedIn && '。未登录上传为临时文档，服务重启后清理'}
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
