import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Layout, Menu, Button, Space, Avatar, Dropdown, message, Table, Popconfirm, Card, Statistic,
} from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserOutlined,
  RobotOutlined,
  BookOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { chatApi, docApi } from '../api'

const { Header, Sider, Content } = Layout

type MenuKey = 'dashboard' | 'documents'

/** 管理后台 */
export default function AdminPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    if (!token) navigate('/login')
  }, [token, navigate])

  const [menuKey, setMenuKey] = useState<MenuKey>('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: 'documents', icon: <BookOutlined />, label: '知识库管理' },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{ background: '#001529' }}
      >
        <div style={{ height: 48, margin: 16, color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
          {collapsed ? '🌊' : '🌊 河海问答管理'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[menuKey]}
          onClick={({ key }) => setMenuKey(key as MenuKey)}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: '退出登录',
                    onClick: logout,
                  },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.username || '管理员'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 24, background: '#fff', borderRadius: 8, padding: 24 }}>
          {menuKey === 'dashboard' && <Dashboard />}
          {menuKey === 'documents' && <Documents />}
        </Content>
      </Layout>
    </Layout>
  )
}

/** 仪表盘 */
function Dashboard() {
  const [stats, setStats] = useState({ history: 0 })
  useEffect(() => {
    chatApi.history().then((r) => setStats({ history: r.data.length })).catch(() => {})
  }, [])
  return (
    <div>
      <h2>📊 仪表盘</h2>
      <Space size="large" style={{ marginTop: 16 }}>
        <Card>
          <Statistic title="问答总次数" value={stats.history} prefix={<RobotOutlined />} />
        </Card>
        <Card>
          <Statistic title="知识库文档" value={0} prefix={<FileTextOutlined />} />
        </Card>
      </Space>
    </div>
  )
}

/** 知识库管理 */
function Documents() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDocs = async () => {
    setLoading(true)
    try {
      const res = await docApi.list()
      setDocs(res.data)
    } catch {
      message.error('加载文档列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleDelete = async (id: number) => {
    try {
      await docApi.delete(id)
      message.success('删除成功')
      fetchDocs()
    } catch {
      message.error('删除失败')
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '标题', dataIndex: 'title' },
    { title: '类型', dataIndex: 'fileType', width: 80 },
    { title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => (
        <span style={{ color: s === 'READY' ? 'green' : s === 'ERROR' ? 'red' : 'orange' }}>
          {s}
        </span>
      ),
    },
    { title: '切块数', dataIndex: 'chunkCount', width: 80 },
    {
      title: '操作', width: 80,
      render: (_: any, record: any) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <h2>📚 知识库管理</h2>
      <Table
        dataSource={docs}
        columns={columns}
        rowKey="id"
        loading={loading}
        style={{ marginTop: 16 }}
      />
    </div>
  )
}
