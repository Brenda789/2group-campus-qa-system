import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Button,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Typography,
  Spin,
  Divider,
  Result,
} from 'antd'
import {
  UserOutlined,
  MailOutlined,
  KeyOutlined,
  IdcardOutlined,
  SafetyOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { userApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

const { Title, Text } = Typography

interface ProfileData {
  id: number
  username: string
  email: string
  role: string
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // 修改密码
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordForm] = Form.useForm()

  // 修改账户信息（用户名 + 邮箱）
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoSubmitting, setInfoSubmitting] = useState(false)
  const [infoForm] = Form.useForm()

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res: any = await userApi.me()
      setProfile(res)
    } catch {
      message.error('获取个人信息失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  // 管理员没有个人管理页面
  if (role === 'admin') {
    return (
      <Result
        status="403"
        title="管理员无需个人管理页面"
        subTitle="请使用「用户管理」页面管理所有用户信息"
        extra={
          <Button type="primary" onClick={() => navigate('/admin')}>
            前往仪表盘
          </Button>
        }
      />
    )
  }

  // ====== 修改密码 ======
  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields()
      setPasswordSubmitting(true)
      await userApi.changePassword(values.oldPassword, values.newPassword)
      message.success('密码修改成功')
      setPasswordOpen(false)
      passwordForm.resetFields()
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.message || '修改失败')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  // ====== 修改账户信息（用户名 + 邮箱） ======
  const handleUpdateInfo = async () => {
    try {
      const values = await infoForm.validateFields()
      setInfoSubmitting(true)
      await userApi.updateProfile({ email: values.email, username: values.username })
      message.success('账户信息修改成功')
      setInfoOpen(false)
      infoForm.resetFields()
      loadProfile()
    } catch (e: any) {
      if (e?.errorFields) return
      message.error(e?.message || '修改失败')
    } finally {
      setInfoSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Card
      style={{
        borderRadius: 16,
        border: '1px solid #eef2f7',
        maxWidth: 720,
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
          <IdcardOutlined style={{ marginRight: 10, color: '#005BAC' }} />
          个人管理
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          查看和修改您的账户信息
        </Text>
      </div>

      <Descriptions
        bordered
        column={1}
        labelStyle={{ fontWeight: 600, width: 120, background: '#fafbfc' }}
        contentStyle={{ background: '#fff' }}
        size="middle"
      >
        <Descriptions.Item
          label={<><IdcardOutlined style={{ marginRight: 6 }} />用户 ID</>}
        >
          {profile?.id}
        </Descriptions.Item>
        <Descriptions.Item
          label={<><UserOutlined style={{ marginRight: 6 }} />用户名</>}
        >
          <span style={{ fontWeight: 600 }}>{profile?.username}</span>
        </Descriptions.Item>
        <Descriptions.Item
          label={<><MailOutlined style={{ marginRight: 6 }} />邮箱</>}
        >
          {profile?.email || <Text type="secondary">未设置</Text>}
        </Descriptions.Item>
        <Descriptions.Item
          label={<><SafetyOutlined style={{ marginRight: 6 }} />角色</>}
        >
          <Tag color="default">普通用户</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => {
            infoForm.setFieldsValue({
              username: profile?.username || '',
              email: profile?.email || '',
            })
            setInfoOpen(true)
          }}
        >
          修改账户信息
        </Button>

        <Button
          type="default"
          icon={<KeyOutlined />}
          onClick={() => setPasswordOpen(true)}
        >
          修改密码
        </Button>
      </div>

      {/* ====== 修改账户信息弹窗（用户名 + 邮箱） ====== */}
      <Modal
        title="修改账户信息"
        open={infoOpen}
        onCancel={() => {
          setInfoOpen(false)
          infoForm.resetFields()
        }}
        onOk={handleUpdateInfo}
        confirmLoading={infoSubmitting}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={infoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { pattern: /^[\w\u4e00-\u9fa5-]{2,20}$/, message: '2-20位字母、数字、下划线或中文' },
            ]}
          >
            <Input placeholder="请输入新用户名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱地址"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入合法邮箱' },
            ]}
          >
            <Input placeholder="请输入新邮箱地址" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ====== 修改密码弹窗 ====== */}
      <Modal
        title="修改密码"
        open={passwordOpen}
        onCancel={() => {
          setPasswordOpen(false)
          passwordForm.resetFields()
        }}
        onOk={handleChangePassword}
        confirmLoading={passwordSubmitting}
        okText="确认修改"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 16 }}>
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
            rules={[{ required: true, min: 6, message: '密码至少6位' }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value)
                    return Promise.resolve()
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

