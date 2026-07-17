import { useState } from 'react'
import { Card, Form, Input, Button, Typography, Space, message, Divider } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { profileApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text } = Typography

/** 个人管理页面：修改密码和邮箱 */
export default function ProfilePage() {
  const { user } = useAuth()
  const [pwLoading, setPwLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [pwForm] = Form.useForm()
  const [emailForm] = Form.useForm()

  const handleChangePassword = async () => {
    try {
      const values = await pwForm.validateFields()
      setPwLoading(true)
      await profileApi.changePassword(values.oldPassword, values.newPassword)
      message.success('密码修改成功，下次登录请使用新密码')
      pwForm.resetFields()
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.message || '密码修改失败')
    } finally {
      setPwLoading(false)
    }
  }

  const handleUpdateEmail = async () => {
    try {
      const values = await emailForm.validateFields()
      setEmailLoading(true)
      await profileApi.updateProfile(values.email)
      message.success('邮箱更新成功')
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.message || '邮箱更新失败')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <Card style={{ borderRadius: 16, border: '1px solid #eef2f7', maxWidth: 600 }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
            <UserOutlined style={{ marginRight: 10, color: '#005BAC' }} />
            个人管理
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            当前用户：{user.username}
          </Text>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 修改密码 */}
        <div>
          <Title level={5} style={{ fontWeight: 600 }}>
            <LockOutlined style={{ marginRight: 8 }} />
            修改密码
          </Title>
          <Form
            form={pwForm}
            layout="vertical"
            style={{ marginTop: 12 }}
          >
            <Form.Item
              name="oldPassword"
              label="旧密码"
              rules={[{ required: true, message: '请输入旧密码' }]}
            >
              <Input.Password placeholder="请输入旧密码" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, max: 20, message: '新密码长度需在6-20位之间' },
              ]}
            >
              <Input.Password placeholder="请输入新密码" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password placeholder="请确认新密码" />
            </Form.Item>
            <Button
              type="primary"
              onClick={handleChangePassword}
              loading={pwLoading}
              style={{ borderRadius: 8 }}
            >
              更新密码
            </Button>
          </Form>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 修改邮箱 */}
        <div>
          <Title level={5} style={{ fontWeight: 600 }}>
            <MailOutlined style={{ marginRight: 8 }} />
            修改邮箱
          </Title>
          <Form
            form={emailForm}
            layout="vertical"
            style={{ marginTop: 12 }}
          >
            <Form.Item
              name="email"
              label="邮箱地址"
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入合法的邮箱地址' },
              ]}
            >
              <Input placeholder="请输入新邮箱地址" />
            </Form.Item>
            <Button
              type="primary"
              onClick={handleUpdateEmail}
              loading={emailLoading}
              style={{ borderRadius: 8 }}
            >
              更新邮箱
            </Button>
          </Form>
        </div>
      </Space>
    </Card>
  )
}
