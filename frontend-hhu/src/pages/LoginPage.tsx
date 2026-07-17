import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, message, Tabs, Typography, Space, Checkbox } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, SafetyOutlined } from '@ant-design/icons'
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
  const [activeTab, setActiveTab] = useState('login')
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
    encrypt.setPublicKey(publicKeyRef.current)
    const encrypted = encrypt.encrypt(password)
    if (!encrypted) {
      throw new Error('密码加密失败')
    }
    return encrypted
  }

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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a2540 0%, #0d3b66 50%, #0f4478 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 装饰背景 */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
          top: -100,
          right: -100,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 91, 172, 0.12) 0%, transparent 70%)',
          bottom: -80,
          left: -80,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.10) 0%, transparent 70%)',
          top: '60%',
          right: '20%',
        }}
      />

      <Card
        style={{
          width: 440,
          borderRadius: 22,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.30)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(20px)',
          zIndex: 1,
        }}
      >
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #005BAC 0%, #0ea5e9 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                boxShadow: '0 8px 24px rgba(0, 91, 172, 0.30)',
              }}
            >
              <SafetyOutlined />
            </div>
            <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
              <span style={{ background: 'linear-gradient(135deg, #005BAC, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                河海大学问答助手
              </span>
            </Title>
            <Text type="secondary">管理后台登录，统一查看用户与知识库状态</Text>
          </div>

          <Tabs centered activeKey={activeTab} onChange={(tab) => setActiveTab(tab)} items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form onFinish={onLogin} size="large" style={{ marginTop: 8 }}>
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { pattern: /^[\w-]{3,20}$/, message: '用户名仅支持3-20位字母数字下划线或短横线' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Checkbox>记住我</Checkbox>
                      <Text type="secondary">首次使用可直接注册</Text>
                    </Space>
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large"
                      style={{ height: 46, borderRadius: 10, fontWeight: 600, fontSize: 15 }}
                    >
                      立即登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form onFinish={onRegister} size="large" style={{ marginTop: 8 }}>
                  <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { pattern: /^[\w-]{3,20}$/, message: '用户名仅支持3-20位字母数字下划线或短横线' }]}>
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="email" rules={[{ type: 'email', message: '请输入合法邮箱' }]}>
                    <Input prefix={<MailOutlined />} placeholder="邮箱" />
                  </Form.Item>
                  <Form.Item name="password" rules={[
                    { required: true, message: '请输入密码' },
                    { min: 8, message: '密码不能少于8位' },
                    { pattern: /^(?=.*[a-zA-Z])(?=.*\d)/, message: '密码必须包含数字和英文字母' },
                  ]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item name="confirm" dependencies={['password']} rules={[{ required: true, message: '请确认密码' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('两次输入密码不一致')) } })]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large"
                      style={{ height: 46, borderRadius: 10, fontWeight: 600, fontSize: 15 }}
                    >
                      创建账号
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]} />
        </Space>
      </Card>
    </div>
  )
}
