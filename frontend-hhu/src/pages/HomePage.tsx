import { useState, useRef, useEffect } from 'react'
import { Button, Input, Card, message, Space, Tag } from 'antd'
import {
  RobotOutlined,
  SendOutlined,
  CloseOutlined,
  HistoryOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { chatApi } from '../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

/** 快捷问题 */
const QUICK_QUESTIONS = [
  '河海大学的校训是什么？',
  '图书馆开放时间？',
  '校园卡如何补办？',
  '奖学金怎么申请？',
]

/** 前台门户首页 + 浮动问答机器人 */
export default function HomePage() {
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const q = text.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await chatApi.ask(q)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.answer, sources: res.data.sourceDocs },
      ])
    } catch {
      message.error('发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

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
          <Button ghost href="#/login">管理后台</Button>
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

      {/* 聊天窗口 */}
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
            width: 400,
            height: 520,
            zIndex: 9998,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
          }}
          bodyStyle={{ flex: 1, overflow: 'auto', padding: 12 }}
        >
          {/* 消息列表 */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 320, marginBottom: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
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
            {messages.map((msg, i) => (
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
                    maxWidth: '80%',
                    padding: '8px 14px',
                    borderRadius: 12,
                    background: msg.role === 'user' ? '#005BAC' : '#f0f0f0',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    textAlign: 'left',
                    whiteSpace: 'pre-wrap',
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
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
            <Input.Search
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSearch={send}
              enterButton={<SendOutlined />}
              placeholder="输入你的问题..."
              loading={loading}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
