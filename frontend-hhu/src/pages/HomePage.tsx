import { useState, useRef, useEffect } from 'react'
import { Button, Input, Card, message, Space, Tag, Row, Col, Typography } from 'antd'
import {
  RobotOutlined,
  SendOutlined,
  CloseOutlined,
  BookOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  TrophyOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { chatApi } from '../api'

const { Title, Text, Paragraph } = Typography

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

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
          <Button
            type="primary"
            ghost
            href="#/login"
            icon={<SafetyOutlined />}
            style={{
              borderRadius: 8, fontWeight: 600, fontSize: 14,
              borderColor: '#7dd3fc', color: '#7dd3fc',
            }}
          >
            管理后台
          </Button>
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
        {/* 暗色遮罩 */}
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

      {/* 聊天窗口 */}
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
            right: 28,
            bottom: 100,
            width: 420,
            height: 540,
            zIndex: 9998,
            boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
            borderRadius: 18,
            border: '1px solid #eef2f7',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          styles={{ body: { flex: 1, overflow: 'auto', padding: '12px 16px' } }}
        >
          {/* 消息列表 */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 320, marginBottom: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: 48 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: 'linear-gradient(135deg, #e8f4ff, #dbeafe)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, color: '#005BAC', margin: '0 auto 16px',
                }}>
                  <RobotOutlined />
                </div>
                <Text style={{ fontSize: 15, fontWeight: 600, color: '#4b5563' }}>你好！我是河海大学问答助手</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>有什么可以帮你？</Text>
                <div style={{ marginTop: 16 }}>
                  {QUICK_QUESTIONS.map((q) => (
                    <Tag
                      key={q}
                      style={{
                        cursor: 'pointer', marginBottom: 8, borderRadius: 20,
                        padding: '4px 14px', fontSize: 13,
                        border: '1px solid #dbeafe', background: '#eff6ff', color: '#005BAC',
                      }}
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
                    maxWidth: '82%',
                    padding: '10px 16px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #005BAC, #0ea5e9)'
                      : '#f3f4f6',
                    color: msg.role === 'user' ? '#fff' : '#1f2937',
                    textAlign: 'left',
                    whiteSpace: 'pre-wrap',
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
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>
                <RobotOutlined spin style={{ marginRight: 6 }} />思考中...
              </div>
            )}
            <div ref={msgEnd} />
          </div>

          {/* 输入框 */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
            <Input.Search
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSearch={send}
              enterButton={
                <Button type="primary" icon={<SendOutlined />} style={{
                  background: 'linear-gradient(135deg, #005BAC, #0ea5e9)',
                  border: 'none', borderRadius: '0 10px 10px 0',
                }} />
              }
              placeholder="输入你的问题..."
              loading={loading}
              style={{ borderRadius: 10 }}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
