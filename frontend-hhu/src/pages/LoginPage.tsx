import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message, Tabs, Typography, Space, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, SafetyOutlined, HomeOutlined } from '@ant-design/icons'
import { authApi } from '../api'
import JSEncrypt from 'jsencrypt'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text } = Typography

/**
 * 登录 / 注册页面
 *
 * 密码使用 RSA 公钥加密后传输，后端私钥解密
 * 使用 AuthContext 统一管理登录状态
 */
export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  /* ===== RSA 公钥加密 ===== */
  const publicKeyRef = useRef<string | null>(null)

  // 页面加载时获取 RSA 公钥
  useEffect(() => {
    authApi.getPublicKey().then((data: any) => {
      publicKeyRef.current = data
    }).catch(() => {
      message.warning('获取加密公钥失败，将使用明文传输')
    })
  }, [])

  /** 使用 RSA 公钥加密密码 */
  const encryptPassword = (password: string): string => {
    if (!publicKeyRef.current) {
      return password // 公钥未就绪时回退明文
    }
    const encrypt = new JSEncrypt()
    // 后端返回的是纯 Base64 DER 格式，JSEncrypt 需要 PEM 格式
    const pemKey = `-----BEGIN PUBLIC KEY-----\n${publicKeyRef.current}\n-----END PUBLIC KEY-----`
    encrypt.setPublicKey(pemKey)
    const encrypted = encrypt.encrypt(password)
    if (!encrypted) {
      throw new Error('密码加密失败')
    }
    return encrypted
  }

  /* ===== 自定义卡片高度平滑过渡 ===== */
  const contentRef = useRef<HTMLDivElement>(null)
  const loginFormRef = useRef<HTMLDivElement>(null)
  const registerFormRef = useRef<HTMLDivElement>(null)
  const [animHeight, setAnimHeight] = useState<number | null>(null)
  const rafRef = useRef<number>(0)

  /** 第一步：锁定当前高度 → 第二步：过渡到目标高度 */
  const handleTabChange = (tab: string) => {
    const container = contentRef.current
    if (!container) {
      setActiveTab(tab as 'login' | 'register')
      return
    }

    // 1. 先锁定当前 px 高度（CSS transition 无法从 auto 过渡）
    const currentPx = container.scrollHeight
    setAnimHeight(currentPx)

    // 2. 等待浏览器绘制锁定高度后，再测量目标并设置过渡
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        // 两个表单始终在 DOM 中，直接测量目标即可
        const target = tab === 'login' ? loginFormRef.current : registerFormRef.current
        if (target) {
          const targetH = target.scrollHeight

          // 3. 切换 tab + 设置目标高度，触发 CSS transition
          setActiveTab(tab as 'login' | 'register')
          setAnimHeight(targetH)
        }
      })
    })
  }

  // 首次渲染后测量初始高度
  useEffect(() => {
    const active = loginFormRef.current
    if (active) {
      setAnimHeight(active.scrollHeight)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onLogin = async (values: any) => {
    setLoading(true)
    try {
      const encryptedPwd = encryptPassword(values.password)
      const data: any = await authApi.login(values.username, encryptedPwd)
      login({ token: data.token, username: values.username, role: data.role || 'admin' })
      message.success('登录成功，正在进入管理后台')
      navigate('/admin')
    } catch (e: any) {
      // 如果后端无法访问，在本地开发环境使用降级登录
      const isNetworkError =
        e?.message?.includes('Network Error') ||
        e?.message?.includes('timeout') ||
        e?.code === 'ECONNABORTED' ||
        e?.code === 'ERR_NETWORK' ||
        e?.code === 'ERR_BAD_RESPONSE'

      if (isNetworkError) {
        login({ token: 'dev-fallback-token', username: values.username, role: 'admin' })
        message.warning('后端未连接，已进入离线演示模式')
        navigate('/admin')
        return
      }
      message.error(e?.message || '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values: any) => {
    setLoading(true)
    try {
      const encryptedPwd = encryptPassword(values.password)
      await authApi.register(values.username, encryptedPwd, values.email)
      // 注册成功后自动登录
      const data: any = await authApi.login(values.username, encryptedPwd)
      login({ token: data.token, username: values.username, role: data.role || 'user' })
      message.success('注册成功，已为你自动登录')
      navigate('/admin')
    } catch (e: any) {
      message.error(e?.message || '注册失败，用户名可能已存在')
    } finally {
      setLoading(false)
    }
  }

  /* ===== 背景轮播 ===== */
  const bgImages = [
    '/images/campus/jintan.png',
    '/images/campus/jintan.png',
    '/images/campus/jintan.png',
  ]
  const [bgIndex, setBgIndex] = useState(0)
  const bgTimerRef = useRef<ReturnType<typeof setInterval>>()

  const resetBgTimer = useCallback(() => {
    clearInterval(bgTimerRef.current)
    bgTimerRef.current = setInterval(() => {
      setBgIndex(prev => (prev + 1) % bgImages.length)
    }, 5000)
  }, [bgImages.length])

  useEffect(() => {
    resetBgTimer()
    return () => clearInterval(bgTimerRef.current)
  }, [resetBgTimer])

  const goToBg = (i: number) => {
    setBgIndex(i)
    resetBgTimer()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: '20%',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      }}
    >
      {/* ===== 右上角返回首页按钮 ===== */}
      <button
        onClick={() => navigate('/')}
        className="glass-home-btn"
        style={{
          position: 'absolute',
          top: 28,
          right: 28,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(44px) saturate(140%)',
          WebkitBackdropFilter: 'blur(44px) saturate(140%)',
          border: '1.5px solid rgba(255, 255, 255, 0.30)',
          borderRadius: 16,
          padding: '10px 20px',
          color: 'rgba(255, 255, 255, 0.92)',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow:
            '0 8px 32px rgba(20, 50, 132, 0.18), 0 2px 8px rgba(20, 50, 132, 0.10), inset 0 1.5px 0 rgba(255,255,255,0.30)',
          transition: 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
          animation: 'fadeSlideIn 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) 0.15s both',
        }}
        onMouseEnter={e => {
          const t = e.currentTarget
          t.style.background = 'rgba(255, 255, 255, 0.30)'
          t.style.borderColor = 'rgba(255, 255, 255, 0.45)'
          t.style.boxShadow = '0 12px 40px rgba(20, 50, 132, 0.28), 0 4px 16px rgba(20, 50, 132, 0.15), inset 0 2px 0 rgba(255,255,255,0.40)'
          t.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          const t = e.currentTarget
          t.style.background = 'rgba(255, 255, 255, 0.22)'
          t.style.borderColor = 'rgba(255, 255, 255, 0.30)'
          t.style.boxShadow = '0 8px 32px rgba(20, 50, 132, 0.18), 0 2px 8px rgba(20, 50, 132, 0.10), inset 0 1.5px 0 rgba(255,255,255,0.30)'
          t.style.transform = 'translateY(0)'
        }}
      >
        <HomeOutlined style={{ fontSize: 16 }} />
        返回首页
      </button>

      {/* ===== 轮播背景 — 交叉淡入淡出 ===== */}
      {bgImages.map((img, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.55) saturate(0.9)',
            opacity: i === bgIndex ? 1 : 0,
            transition: 'opacity 1.5s ease',
            zIndex: 0,
          }}
        />
      ))}

      {/* ===== 左侧欢迎文字 — 从下往上浮现 ===== */}
      <div
        style={{
          position: 'absolute',
          left: '12%',
          top: '32%',
          zIndex: 1,
          maxWidth: 420,
          animation: 'welcomeSlideUp 1.1s cubic-bezier(0.22, 0.05, 0.19, 1) 0.3s both',
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: 44,
            fontWeight: 700,
            textShadow: '0 2px 24px rgba(255,255,255,0.25), 0 8px 48px rgba(0,0,0,0.5)',
            margin: 0,
            lineHeight: 1.55,
            letterSpacing: '-0.5px',
          }}
        >
          欢迎回来，
          <br />
          请登录 / 注册
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 16,
            fontWeight: 400,
            textShadow: '0 1px 12px rgba(0,0,0,0.4)',
            margin: '12px 0 0',
            letterSpacing: '0.2px',
          }}
        >
          Welcome back, please sign in / sign up
        </p>
      </div>

      {/* ===== 左下角圆点指示器 ===== */}
      <div
        style={{
          position: 'absolute',
          left: '12%',
          bottom: '10%',
          zIndex: 1,
          display: 'flex',
          gap: 10,
        }}
      >
        {bgImages.map((_, i) => (
          <button
            key={i}
            onClick={() => goToBg(i)}
            aria-label={`背景 ${i + 1}`}
            style={{
              width: i === bgIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              background: i === bgIndex ? '#fff' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.4s cubic-bezier(0.22, 0.05, 0.19, 1)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* ===== 液态玻璃卡片 ===== */}
      <div
        className="glass-card"
        style={{
          width: 420,
          padding: '44px 38px 38px',
          zIndex: 1,
          animation: 'fadeSlideIn 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
        }}
      >
        {/* ===== Header ===== */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* 图标 */}
          <div
            className="glass-icon-circle"
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#c4e1dd',
            }}
          >
            <SafetyOutlined />
          </div>

          {/* 标题 */}
          <Title
            level={3}
            style={{
              marginBottom: 6,
              fontWeight: 590,
              fontSize: 26,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}
          >
            河海大学问答助手
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: 14, fontWeight: 400, letterSpacing: '-0.2px' }}>
            管理后台 · 统一查看用户与知识库状态
          </Text>
        </div>

        {/* ===== Tabs Header ===== */}
        <Tabs
          centered
          activeKey={activeTab}
          onChange={handleTabChange}
          className="glass-tabs"
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />

        {/* ===== 动画高度容器 — JS 驱动平滑伸缩 ===== */}
        <div
          style={{
            height: animHeight ?? 'auto',
            overflow: 'hidden',
            transition: 'height 1s cubic-bezier(0.22, 0.05, 0.19, 1)',
            willChange: 'height',
            transform: 'translateZ(0)',
          }}
          onTransitionEnd={() => setAnimHeight(null)}
        >
          <div ref={contentRef} style={{ position: 'relative' }}>
            {/* 登录表单 */}
            <div
              ref={loginFormRef}
              style={{
                opacity: activeTab === 'login' ? 1 : 0,
                pointerEvents: activeTab === 'login' ? 'auto' : 'none',
                position: activeTab === 'login' ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transition: 'opacity 0.5s cubic-bezier(0.22, 0.05, 0.19, 1) 0.1s',
              }}
            >
              <Form onFinish={onLogin} size="large" style={{ marginTop: 4 }}>
                <Form.Item
                  name="username"
                  rules={[
                    { required: true, message: '请输入用户名' },
                    { pattern: /^[\w-]{3,20}$/, message: '用户名仅支持3-20位字母数字下划线或短横线' },
                  ]}
                >
                  <Input
                    className="glass-input"
                    prefix={<UserOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
                    placeholder="用户名"
                    style={{ height: 48 }}
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 6, message: '密码至少6位' },
                  ]}
                >
                  <Input.Password
                    className="glass-input"
                    prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
                    placeholder="密码"
                    style={{ height: 48 }}
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 12 }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Checkbox className="glass-check">记住我</Checkbox>
                    <Text style={{ color: 'rgba(255,255,255,0.30)', fontSize: 13 }}>首次使用可直接注册</Text>
                  </Space>
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    className="glass-btn"
                    style={{ height: 50, fontSize: 16 }}
                  >
                    立即登录
                  </Button>
                </Form.Item>
              </Form>
            </div>

            {/* 注册表单 */}
            <div
              ref={registerFormRef}
              style={{
                opacity: activeTab === 'register' ? 1 : 0,
                pointerEvents: activeTab === 'register' ? 'auto' : 'none',
                position: activeTab === 'register' ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transition: 'opacity 0.5s cubic-bezier(0.22, 0.05, 0.19, 1) 0.1s',
              }}
            >
              <Form onFinish={onRegister} size="large" style={{ marginTop: 4 }}>
                <Form.Item
                  name="username"
                  rules={[
                    { required: true, message: '请输入用户名' },
                    { pattern: /^[\w-]{3,20}$/, message: '用户名仅支持3-20位字母数字下划线或短横线' },
                  ]}
                >
                  <Input
                    className="glass-input"
                    prefix={<UserOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
                    placeholder="用户名"
                    style={{ height: 48 }}
                  />
                </Form.Item>
                <Form.Item
                  name="email"
                  rules={[{ type: 'email', message: '请输入合法邮箱' }]}
                >
                  <Input
                    className="glass-input"
                    prefix={<MailOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
                    placeholder="邮箱"
                    style={{ height: 48 }}
                  />
                </Form.Item>
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, min: 6, message: '密码至少6位' },
                    { pattern: /(?=.*[A-Za-z])(?=.*\d).{6,}/, message: '密码需包含字母和数字' },
                  ]}
                >
                  <Input.Password
                    className="glass-input"
                    prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
                    placeholder="密码"
                    style={{ height: 48 }}
                  />
                </Form.Item>
                <Form.Item
                  name="confirm"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve()
                        return Promise.reject(new Error('两次输入密码不一致'))
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    className="glass-input"
                    prefix={<LockOutlined style={{ color: 'rgba(255,255,255,0.45)' }} />}
                    placeholder="确认密码"
                    style={{ height: 48 }}
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    className="glass-btn"
                    style={{ height: 50, fontSize: 16 }}
                  >
                    创建账号
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
