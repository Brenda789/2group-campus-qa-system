import { useState, useEffect } from 'react'
import { Table, Tag, Button, Input, Space, message, Popconfirm, Card, Typography, Modal, Form, Select, Switch } from 'antd'
import { ReloadOutlined, UserOutlined, CheckCircleOutlined, StopOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import { userApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'

const { Title, Text } = Typography

export default function UserList() {
  const { role, user } = useAuth()
  const isAdmin = role === 'admin'
  const { push } = useNotifications()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchText, setSearchText] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [form] = Form.useForm()
  const pageSize = 10

  const load = async (p: number, kw: string) => {
    setLoading(true)
    try {
      const res: any = await userApi.list(p, pageSize, kw)
      setData(res.records || res.data || [])
      setTotal(res.total || 0)
      setPage(p)
      setKeyword(kw)
    } catch {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1, '')
  }, [])

  const handleToggle = async (userId: number, newStatus: number) => {
    try {
      await userApi.toggleStatus(userId, newStatus)
      message.success(newStatus === 1 ? '已启用该用户' : '已禁用该用户')
      push({ type: 'success', category: 'user', message: newStatus === 1 ? `已启用用户 ID:${userId}` : `已禁用用户 ID:${userId}` })
      load(page, keyword)
    } catch {
      message.error('操作失败')
      push({ type: 'error', category: 'user', message: `启停用户 ID:${userId} 失败` })
    }
  }

  const handleDelete = async (userId: number) => {
    try {
      await userApi.remove(userId)
      message.success('删除成功')
      push({ type: 'success', category: 'user', message: `已删除用户 ID:${userId}` })
      load(page, keyword)
    } catch {
      message.error('删除失败')
      push({ type: 'error', category: 'user', message: `删除用户 ID:${userId} 失败` })
    }
  }

  const openCreate = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ role: 'user' })
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setEditingUser(record)
    form.setFieldsValue({
      username: record.username,
      email: record.email || '',
      role: record.role,
      newPassword: '',
      confirmPassword: '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (editingUser) {
        // 编辑模式：更新用户名、邮箱、角色
        await userApi.update(editingUser.id, {
          username: values.username,
          email: values.email,
          role: values.role,
        })
        // 构建变更详情
        const changes: string[] = []
        if (values.username !== editingUser.username) {
          changes.push(`用户名: ${editingUser.username} → ${values.username}`)
        }
        if (values.email !== (editingUser.email || '')) {
          changes.push(`邮箱: ${editingUser.email || '无'} → ${values.email || '无'}`)
        }
        if (values.role !== editingUser.role) {
          changes.push(`角色: ${editingUser.role === 'admin' ? '管理员' : '普通用户'} → ${values.role === 'admin' ? '管理员' : '普通用户'}`)
        }
        // 如果填了新密码，则重置密码
        if (values.newPassword) {
          await userApi.resetPassword(editingUser.id, values.newPassword)
          changes.push('已重置密码')
        }
        const changeDetail = changes.length ? `（${changes.join('，')}）` : ''
        message.success('编辑成功')
        push({ type: 'success', category: 'user', message: `已编辑用户「${values.username}」${changeDetail}` })
      } else {
        await userApi.create(values.username, values.password, values.email || '', values.role || 'user')
        message.success('新增成功')
        push({ type: 'success', category: 'user', message: `已新增用户「${values.username}」` })
      }
      setModalOpen(false)
      load(page, keyword)
    } catch (e: any) {
      if (e?.errorFields) return // form validation error
      message.error(e?.message || '操作失败')
      push({ type: 'error', category: 'user', message: editingUser ? `编辑用户失败` : `新增用户失败` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCSV = () => {
    if (!data.length) {
      message.warning('暂无数据可导出')
      return
    }
    const header = ['id', 'username', 'email', 'role', 'status', 'createTime']
    const rows = data.map((r: any) => header.map((h) => (r[h] ?? '')).join(','))
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_page_${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      render: (role: string) => {
        const isAdminRole = role?.toLowerCase() === 'admin'
        return <Tag color={isAdminRole ? 'blue' : 'default'}>{isAdminRole ? '管理员' : '普通用户'}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: number, record: any) => {
        const isSelf = record.username === user.username
        // 不能禁用自己
        if (isSelf) {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              启用中
            </Tag>
          )
        }
        // 其他用户：管理员可切换，普通用户只看
        return isAdmin ? (
          <Popconfirm
            title={status === 1 ? '确定禁用该用户？' : '确定启用该用户？'}
            onConfirm={() => handleToggle(record.id, status === 1 ? 0 : 1)}
            okText="确定"
            cancelText="取消"
          >
            <Switch
              checked={status === 1}
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          </Popconfirm>
        ) : (
          <Tag icon={status === 1 ? <CheckCircleOutlined /> : <StopOutlined />} color={status === 1 ? 'success' : 'error'}>
            {status === 1 ? '启用' : '禁用'}
          </Tag>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 170,
      render: (t: string) => t || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small">
          {isAdmin && (
            <>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                编辑
              </Button>
              {record.username !== 'admin' && (
                <Popconfirm title="确定删除该用户？此操作不可恢复" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card style={{ borderRadius: 16, border: '1px solid #eef2f7' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
              <UserOutlined style={{ marginRight: 10, color: '#005BAC' }} />
              用户列表
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>支持按用户关键词搜索，并实时启停账号状态</Text>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="搜索用户名或邮箱"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={(value) => {
                setKeyword(value)
                load(1, value)
              }}
              style={{ width: 220 }}
              enterButton
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} size="large">新增用户</Button>
            <Button icon={<ReloadOutlined spin={loading} />} onClick={() => load(page, keyword)} loading={loading} disabled={loading}>刷新</Button>
            <Button onClick={handleExportCSV}>导出 CSV</Button>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p) => load(p, keyword),
          }}
        />

        <Modal
          title={editingUser ? '编辑用户' : '新增用户'}
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={handleSubmit}
          confirmLoading={submitting}
          destroyOnHidden
          okText="保存"
          cancelText="取消"
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }, { pattern: /^[\w\u4e00-\u9fa5-]{2,20}$/, message: '2-20位字母、数字、下划线或中文' }]}
            >
              <Input placeholder="请输入用户名" />
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入合法邮箱' }]}>
              <Input placeholder="请输入邮箱" />
            </Form.Item>
            {editingUser ? (
              <>
                <Form.Item
                  name="newPassword"
                  label="新密码（留空则不修改）"
                  rules={[
                    { min: 6, message: '密码至少6位' },
                  ]}
                >
                  <Input.Password placeholder="请输入新密码" />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const newPwd = getFieldValue('newPassword')
                        if (!newPwd) return Promise.resolve()
                        if (!value) return Promise.reject(new Error('请再次输入新密码'))
                        if (newPwd !== value) return Promise.reject(new Error('两次输入的密码不一致'))
                        return Promise.resolve()
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="请再次输入新密码" />
                </Form.Item>
              </>
            ) : (
              <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
            )}
            <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
              <Select
                options={[
                  { label: '普通用户', value: 'user' },
                  { label: '管理员', value: 'admin' },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </Card>
  )
}
