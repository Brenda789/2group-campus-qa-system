import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { Button, Card, Space, Tag, Row, Col, Typography } from 'antd'
import {
  RobotOutlined,
  UploadOutlined,
  BookOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  TrophyOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import ChatWindow, { type ChatWindowHandle } from '../components/ChatWindow'

const { Title, Text, Paragraph } = Typography

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

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, logout } = useAuth()
  const chatRef = useRef<ChatWindowHandle>(null)

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
            ghost
            onClick={() => chatRef.current?.openUpload()}
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
                onClick={() => chatRef.current?.openChat()}
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

      {/* 浮动聊天窗口 */}
      <ChatWindow ref={chatRef} mode="floating" />
    </div>
  )
}
