import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, message, Tabs } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { authApi } from '../api'
import JSEncrypt from 'jsencrypt'

/**
 * 登录 / 注册页面
 *
 * 密码使用 RSA 公钥加密后传输，后端私钥解密
 * 注意：request 拦截器已自动提取 data 层，
 * 所以 api 调用的返回值直接是业务数据（如 { token, username, role }），无需 .data
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
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

  const onLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const encryptedPwd = encryptPassword(values.password)
      const data: any = await authApi.login(values.username, encryptedPwd)
      // 响应拦截器已取 data 层，直接拿 { token, username, role }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({ username: data.username }))
      localStorage.setItem('role', data.role)
      message.success('登录成功')
      navigate('/admin')
    } catch (e: any) {
      message.error(e?.message || '用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  const onRegister = async (values: {
    username: string
    password: string
    email: string
  }) => {
    setLoading(true)
    try {
      const encryptedPwd = encryptPassword(values.password)
      await authApi.register(values.username, encryptedPwd, values.email)
      // 注册成功后自动登录（登录时也用加密密码）
      const data: any = await authApi.login(values.username, encryptedPwd)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify({ username: data.username }))
      localStorage.setItem('role', data.role)
      message.success('注册成功')
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
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #005BAC 0%, #003d73 100%)',
      }}
    >
      <Card style={{ width: 420, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>河海大学问答助手</h2>
        <Tabs
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form onFinish={onLogin} size="large">
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: '请输入密码' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form onFinish={onRegister} size="large">
                  <Form.Item
                    name="username"
                    rules={[{ required: true, message: '请输入用户名' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="用户名" />
                  </Form.Item>
                  <Form.Item name="email">
                    <Input prefix={<MailOutlined />} placeholder="邮箱（选填）" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[{ required: true, min: 8, message: '密码至少8位，需包含字母和数字' }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
