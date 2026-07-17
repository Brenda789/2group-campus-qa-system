import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar, Space, Tag, Alert } from 'antd'
import {
  DashboardOutlined,
  HomeOutlined,
  UserOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CommentOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'

const { Sider, Header, Content } = Layout

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [offline, setOffline] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout } = useAuth()

  // 检测后端是否可达
  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        setOffline(!res.ok)
      })
      .catch(() => {
        setOffline(true)
      })
  }, [])

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/admin/users')) return '/admin/users'
    if (location.pathname.startsWith('/admin/documents')) return '/admin/documents'
    if (location.pathname.startsWith('/admin/chat')) return '/admin/chat'
    return '/admin'
  }

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
    logout()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f4f9' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          background: 'linear-gradient(180deg, #0a2540 0%, #0d3b66 40%, #0f4478 100%)',
          borderRight: 'none',
          boxShadow: '2px 0 20px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 16 : 20,
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            letterSpacing: 1,
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <span style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0ea5e9 0%, #005BAC 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800,
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.35)',
          }}>河</span>
          <span style={{
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 200,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.45s ease, max-width 0.45s ease',
          }}>河海问答助手</span>
        </div>
        <div style={{
          padding: collapsed ? '16px 0 8px' : '16px 20px 8px',
          display: 'flex', justifyContent: 'center',
        }}>
          <Tag color="blue" style={{
            borderRadius: collapsed ? '50%' : 20,
            width: collapsed ? 36 : undefined,
            height: collapsed ? 36 : undefined,
            padding: collapsed ? 0 : '2px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(14,165,233,0.18)', border: 'none',
            color: '#7dd3fc', fontWeight: 500, fontSize: collapsed ? 16 : 12,
            transition: 'all 0.45s ease',
          }}>
            {collapsed ? (role === 'admin' ? '管' : '普') : (role === 'admin' ? '🔑 管理员' : '👤 普通用户')}
          </Tag>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent', borderInlineEnd: 'none', marginTop: 4 }}
        />
        <div style={{
          position: 'absolute', bottom: 20, left: 20, right: 20,
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.5)', fontSize: 11,
          textAlign: 'center', lineHeight: 1.6,
        }}>
          <div style={{
            opacity: collapsed ? 0 : 1,
            maxHeight: collapsed ? 0 : 40,
            overflow: 'hidden',
            transition: 'opacity 0.45s ease, max-height 0.45s ease',
          }}>
            河海大学 · 校园智能问答<br />v1.0
          </div>
        </div>
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#ffffff',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #eef2f7',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            height: 60,
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 38, height: 38, color: '#6b7280' }}
          />
          <Button type="text" icon={<HomeOutlined />} onClick={() => navigate('/')}>
            返回首页
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: handleLogout },
              ],
            }}
          >
            <div style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 14px', borderRadius: 30,
              transition: 'background 0.25s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f7fb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar style={{
                background: 'linear-gradient(135deg, #005BAC 0%, #0ea5e9 100%)',
                boxShadow: '0 2px 8px rgba(0,91,172,0.25)',
              }} icon={<UserOutlined />} />
              <Space size={6}>
                <span style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{user.username || '用户'}</span>
                <Tag style={{
                  borderRadius: 12, fontSize: 11, border: 'none',
                  background: role === 'admin' ? '#e8f4ff' : '#f3f4f6',
                  color: role === 'admin' ? '#005BAC' : '#6b7280',
                  padding: '1px 10px',
                }}>
                  {role === 'admin' ? '管理员' : '用户'}
                </Tag>
              </Space>
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: 20,
            padding: 28,
            background: '#ffffff',
            borderRadius: 18,
            overflow: 'auto',
            minHeight: 'calc(100vh - 100px)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          }}
        >
          {offline && (
            <Alert
              type="warning"
              showIcon
              message="后端服务未连接"
              description="当前为离线演示模式，显示的数据均为空占位，请启动后端服务后刷新页面以获取真实数据。"
              style={{ marginBottom: 16, borderRadius: 10 }}
              closable
            />
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
