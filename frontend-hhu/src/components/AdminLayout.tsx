import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CommentOutlined,
} from '@ant-design/icons'

const { Sider, Header, Content } = Layout

/** 管理后台布局壳：左侧菜单 + 顶栏 + 内容区 */
export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : {}
  const role = localStorage.getItem('role') || 'user'

  const menuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/admin/chat', icon: <CommentOutlined />, label: '问答记录' },
    ...(role === 'admin'
      ? [
          { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
          { key: '/admin/documents', icon: <FileTextOutlined />, label: '知识库管理' },
        ]
      : []),
  ]

  const handleMenuClick = ({ key }: { key: string }) => navigate(key)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: collapsed ? 14 : 18,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {collapsed ? '河海' : '河海问答助手'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout>
        {/* 顶栏 */}
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
              ],
            }}
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user.username || '用户'}</span>
            </div>
          </Dropdown>
        </Header>

        {/* 内容区 */}
        <Content
          style={{
            margin: 16,
            padding: 24,
            background: '#fff',
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
