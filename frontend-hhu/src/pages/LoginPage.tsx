import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, message, Modal } from 'antd'
import {
  UserOutlined, LockOutlined, MailOutlined, SafetyOutlined,
  EyeOutlined, EyeInvisibleOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import { authApi } from '../api'
import JSEncrypt from 'jsencrypt'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

/* ============================================================
   常量
   ============================================================ */
/** 校园实拍图片（来自 public/images/campus/） */
const BG_IMAGES = [
  '/images/campus/jintan.png',
  '/images/campus/jt1.jpg',
  '/images/campus/playground.jpg',
]
const SLIDE_INTERVAL = 6000
const TAB_HEIGHT_MS = 500 // 高度过渡时长（与 CSS transition 匹配）
const FADE_MS = 260 // 内容淡入/淡出时长

/* ============================================================
   LoginPage 主组件
   ============================================================ */
export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  /* ---- 状态 ---- */
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [displayedTab, setDisplayedTab] = useState('login')
  const [forgotPwdVisible, setForgotPwdVisible] = useState(false)
  const publicKeyRef = useRef<string | null>(null)

  // 独立 Form 实例
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()

  // 背景轮播
  const [currentSlide, setCurrentSlide] = useState(0)

  // Tab 高度动画
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const isSwitchingRef = useRef(false)
  const [panelOpacity, setPanelOpacity] = useState(1)

  // 密码可见性
  const [loginPwdVisible, setLoginPwdVisible] = useState(false)
  const [regPwdVisible, setRegPwdVisible] = useState(false)
  const [regConfirmVisible, setRegConfirmVisible] = useState(false)

  // 按钮波纹
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  const rippleIdRef = useRef(0)

  /* ---- 背景轮播 ---- */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BG_IMAGES.length)
    }, SLIDE_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  /* ---- RSA 公钥 ---- */
  useEffect(() => {
    authApi.getPublicKey().then((data: any) => {
      publicKeyRef.current = data
    }).catch(() => {
      message.warning('获取加密公钥失败，将使用明文传输')
    })
  }, [])

  /* ---- 工具函数 ---- */
  const encryptPassword = useCallback((password: string): string => {
    if (!publicKeyRef.current) return password
    const encrypt = new JSEncrypt()
    encrypt.setPublicKey(publicKeyRef.current)
    const encrypted = encrypt.encrypt(password)
    if (!encrypted) throw new Error('密码加密失败')
    return encrypted
  }, [])

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleIdRef.current
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
  }

  /* ---- Tab 切换（JS 驱动高度动画，流畅无弹跳） ---- */
  const switchTab = useCallback((tab: string) => {
    if (tab === activeTab || isSwitchingRef.current) return
    const container = tabContainerRef.current
    if (!container) {
      setActiveTab(tab)
      setDisplayedTab(tab)
      return
    }

    isSwitchingRef.current = true

    // 1. 从 auto 拿到当前真实 px 高度并锁定
    if (container.style.height === 'auto' || !container.style.height) {
      container.style.height = container.scrollHeight + 'px'
    }

    // 2. 内容淡出
    setPanelOpacity(0)

    // 3. 等淡出完成后再切换面板
    setTimeout(() => {
      setActiveTab(tab)
      setDisplayedTab(tab)
      if (tab === 'register') {
        setTimeout(() => registerForm.resetFields())
      }
    }, FADE_MS)
  }, [activeTab, registerForm])

  /* displayedTab 变化后：测量新高度 → transition 展开/收缩 → 淡入 */
  useEffect(() => {
    const container = tabContainerRef.current
    if (!container || !container.style.height || container.style.height === 'auto') return

    // 等 React 把新面板渲染到 DOM
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        const targetH = container.scrollHeight

        // 目标高度和当前接近则跳过动画
        if (Math.abs(container.offsetHeight - targetH) < 2) {
          setPanelOpacity(1)
          container.style.height = targetH + 'px'
          isSwitchingRef.current = false
          return
        }

        container.style.height = targetH + 'px'

        // 高度动画进行到 35% 时淡入新内容
        const fadeInTimer = setTimeout(() => {
          setPanelOpacity(1)
        }, TAB_HEIGHT_MS * 0.35)

        // transitionend 精准收尾
        const onEnd = () => {
          container.removeEventListener('transitionend', onEnd)
          clearTimeout(fadeInTimer)
          setPanelOpacity(1)
          // 静默切到 auto
          container.style.transition = 'none'
          container.style.height = 'auto'
          // 两次 RAF 确保 auto 完全生效后再恢复 transition
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              container.style.transition = ''
              isSwitchingRef.current = false
            })
          })
        }
        container.addEventListener('transitionend', onEnd)

        return () => {
          clearTimeout(fadeInTimer)
          container.removeEventListener('transitionend', onEnd)
        }
      })
      return () => cancelAnimationFrame(raf2)
    })
    return () => cancelAnimationFrame(raf1)
  }, [displayedTab])

  /* ---- 提交逻辑 ---- */
  const onLogin = async (values: any) => {
    setLoading(true)
    try {
      const encryptedPwd = encryptPassword(values.password)
      const data: any = await authApi.login(values.username, encryptedPwd)
      login({ token: data.token, username: values.username, role: data.role || 'admin' })
      message.success('登录成功，正在进入管理后台')
      navigate('/admin')
    } catch (e: any) {
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

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="login-page">
      {/* ===== 背景轮播 ===== */}
      <div className="login-bg-carousel">
        {BG_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`login-bg-slide${i === currentSlide ? ' active' : ''}`}
          />
        ))}
      </div>

      {/* 压暗滤镜 */}
      <div className="login-bg-overlay" />

      {/* 底部圆点指示器 */}
      <div className="login-dot-indicators">
        {BG_IMAGES.map((_, i) => (
          <button
            key={i}
            className={`login-dot${i === currentSlide ? ' active' : ''}`}
            onClick={() => setCurrentSlide(i)}
            aria-label={`背景 ${i + 1}`}
          />
        ))}
      </div>

      {/* ===== 右上角返回按钮 ===== */}
      <button className="login-back-btn" onClick={() => navigate('/')}>
        <ArrowLeftOutlined className="login-back-btn-icon" />
        <span>返回首页</span>
      </button>

      {/* ===== 主内容区 ===== */}
      <div className="login-content">
        {/* 左侧 Hero — 逐行从下往上浮现 */}
        <div className="login-hero">
          <h1 className="login-hero-title">
            <span className="login-hero-line"><span className="login-hero-inner">河海大学</span></span>
            <span className="login-hero-line hhu-accent"><span className="login-hero-inner">智能问答助手</span></span>
          </h1>
          <p className="login-hero-subtitle">
            <span className="login-hero-line"><span className="login-hero-inner">Hohai University · AI-powered Q&A Platform</span></span>
            <span className="login-hero-line"><span className="login-hero-inner">统一管理知识库，智能检索，精准回答</span></span>
          </p>
        </div>

        {/* 右侧 Frozen Glass 卡片 */}
        <div className="login-card-wrapper">
          <div className="login-card">
            {/* 卡片头部 */}
            <div className="login-card-header">
              <div className="login-card-logo">
                <SafetyOutlined />
              </div>
              <h2 className="login-card-title">管理后台</h2>
              <p className="login-card-desc">登录以查看用户与知识库状态</p>
            </div>

            {/* Tab 切换栏 */}
            <div className="login-tab-bar">
              <button
                className={`login-tab-btn${activeTab === 'login' ? ' active' : ''}`}
                onClick={() => switchTab('login')}
              >
                登录
              </button>
              <button
                className={`login-tab-btn${activeTab === 'register' ? ' active' : ''}`}
                onClick={() => switchTab('register')}
              >
                注册
              </button>
              <div
                className="login-tab-indicator"
                style={{
                  left: activeTab === 'login' ? '0%' : '50%',
                  width: '50%',
                }}
              />
            </div>

            {/* Tab 内容 — JS 驱动高度动画 */}
            <div className="login-tab-content" ref={tabContainerRef}>
              <div
                style={{
                  opacity: panelOpacity,
                  transition: `opacity ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
                }}
              >
                {/* 登录 Form — display:none 保活，切回内容不丢 */}
                <div style={{ display: displayedTab === 'login' ? 'block' : 'none' }}>
                  <Form form={loginForm} onFinish={onLogin} size="large">
                    {/* 用户名 */}
                    <Form.Item
                      name="username"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { pattern: /^[\w-]{3,20}$/, message: '用户名仅支持3-20位字母数字下划线或短横线' },
                      ]}
                    >
                      <InputAdapter icon={<UserOutlined />} placeholder="用户名" />
                    </Form.Item>

                    {/* 密码 */}
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <InputAdapter
                        icon={<LockOutlined />}
                        type={loginPwdVisible ? 'text' : 'password'}
                        placeholder="密码"
                        suffix={
                          <button
                            type="button"
                            className="login-pwd-toggle"
                            onClick={() => setLoginPwdVisible(!loginPwdVisible)}
                            tabIndex={-1}
                          >
                            {loginPwdVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                          </button>
                        }
                      />
                    </Form.Item>

                    {/* 附加选项 */}
                    <div className="login-extra-row">
                      <label className="login-checkbox-wrap">
                        <input type="checkbox" className="login-checkbox" />
                        <span>记住我</span>
                      </label>
                      <span className="login-forgot-link" onClick={() => setForgotPwdVisible(true)}>
                        忘记密码？
                      </span>
                    </div>

                    {/* 提交按钮 */}
                    <button
                      type="submit"
                      className={`login-submit-btn${loading ? ' loading' : ''}`}
                      disabled={loading}
                      onClick={addRipple}
                    >
                      {loading ? '验证中…' : '立即登录'}
                      {ripples.map((r) => (
                        <span
                          key={r.id}
                          className="ripple"
                          style={{ left: r.x, top: r.y }}
                        />
                      ))}
                    </button>
                  </Form>
                </div>

                {/* 注册 Form — display:none 保活，切到注册时 resetFields 清零 */}
                <div style={{ display: displayedTab === 'register' ? 'block' : 'none' }}>
                  <Form form={registerForm} onFinish={onRegister} size="large">
                    {/* 用户名 */}
                    <Form.Item
                      name="username"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { pattern: /^[\w-]{3,20}$/, message: '用户名仅支持3-20位字母数字下划线或短横线' },
                      ]}
                    >
                      <InputAdapter icon={<UserOutlined />} placeholder="用户名" autoComplete="off" name="reg-username" />
                    </Form.Item>

                    {/* 邮箱 */}
                    <Form.Item
                      name="email"
                      rules={[{ type: 'email', message: '请输入合法邮箱' }]}
                    >
                      <InputAdapter icon={<MailOutlined />} placeholder="邮箱" autoComplete="off" name="reg-email" />
                    </Form.Item>

                    {/* 密码 */}
                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: '请输入密码' },
                        { min: 8, message: '密码不能少于8位' },
                        { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: '密码必须包含数字和英文字母' },
                      ]}
                    >
                      <InputAdapter
                        icon={<LockOutlined />}
                        type={regPwdVisible ? 'text' : 'password'}
                        placeholder="密码"
                        autoComplete="new-password"
                        name="reg-password"
                        suffix={
                          <button
                            type="button"
                            className="login-pwd-toggle"
                            onClick={() => setRegPwdVisible(!regPwdVisible)}
                            tabIndex={-1}
                          >
                            {regPwdVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                          </button>
                        }
                      />
                    </Form.Item>

                    {/* 确认密码 */}
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
                      <InputAdapter
                        icon={<LockOutlined />}
                        type={regConfirmVisible ? 'text' : 'password'}
                        placeholder="确认密码"
                        autoComplete="new-password"
                        name="reg-confirm"
                        suffix={
                          <button
                            type="button"
                            className="login-pwd-toggle"
                            onClick={() => setRegConfirmVisible(!regConfirmVisible)}
                            tabIndex={-1}
                          >
                            {regConfirmVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                          </button>
                        }
                      />
                    </Form.Item>

                    {/* 提交按钮 */}
                    <button
                      type="submit"
                      className={`login-submit-btn${loading ? ' loading' : ''}`}
                      disabled={loading}
                      onClick={addRipple}
                      style={{ marginTop: 2 }}
                    >
                      {loading ? '注册中…' : '创建账号'}
                      {ripples.map((r) => (
                        <span
                          key={r.id}
                          className="ripple"
                          style={{ left: r.x, top: r.y }}
                        />
                      ))}
                    </button>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 忘记密码 Modal ===== */}
      <Modal
        title="忘记密码"
        open={forgotPwdVisible}
        onCancel={() => setForgotPwdVisible(false)}
        footer={
          <button
            className="login-submit-btn"
            style={{ width: 'auto', padding: '0 28px', height: 38, fontSize: 14, borderRadius: 10 }}
            onClick={() => setForgotPwdVisible(false)}
          >
            我知道了
          </button>
        }
        destroyOnClose
        className="login-modal"
        maskClassName="login-modal-mask"
      >
        <div style={{ padding: '12px 0', lineHeight: 2.3, fontSize: 14, color: 'rgba(255,255,255,0.80)' }}>
          <p style={{ fontWeight: 600, marginBottom: 14, color: '#fff', fontSize: 15 }}>
            请联系张老师重置密码
          </p>
          <p>联系电话：12345678912</p>
          <p>办公地址：A楼502</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 14, fontSize: 13 }}>
            请在工作日 8:00-11:00，14:00-17:00 进行联系
          </p>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   InputAdapter — 液态玻璃输入框适配 antd Form.Item
   antd Form 向子组件注入 value + onChange（已规范化）
   ============================================================ */
interface InputAdapterProps {
  value?: string
  onChange?: (value: string) => void
  icon: React.ReactNode
  placeholder: string
  type?: string
  suffix?: React.ReactNode
  autoComplete?: string
  name?: string
}

function InputAdapter({
  value, onChange, icon, placeholder, type = 'text', suffix, autoComplete, name,
}: InputAdapterProps) {
  return (
    <div className="login-input-wrap login-input-icon-wrap">
      <span className="login-input-icon">{icon}</span>
      <input
        className="login-input"
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        autoComplete={autoComplete}
        name={name}
      />
      {suffix}
    </div>
  )
}
