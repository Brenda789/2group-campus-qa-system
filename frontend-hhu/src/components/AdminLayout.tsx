import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Dropdown, Avatar, Space, Tag, Alert } from 'antd'
import {
  DashboardOutlined, HomeOutlined, UserOutlined, TeamOutlined,
  FileTextOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, CommentOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [offline, setOffline] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout } = useAuth()

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setOffline(!res.ok))
      .catch(() => setOffline(true))
  }, [])

  const isAdmin = role === 'admin'

  const getSelectedKey = () => {
    if (location.pathname.startsWith('/admin/users')) return '/admin/users'
    if (location.pathname.startsWith('/admin/documents')) return '/admin/documents'
    if (location.pathname.startsWith('/admin/chat')) return '/admin/chat'
    if (location.pathname.startsWith('/admin/ai-assistant')) return '/admin/ai-assistant'
    if (location.pathname.startsWith('/admin/profile')) return '/admin/profile'
    return '/admin'
  }

  const navItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/admin/ai-assistant', icon: <img src="/images/hema.png" alt="河海问答助手" style={{ width: 16, height: 16 }} />, label: 'AI问答助手' },
    { key: '/admin/chat', icon: <CommentOutlined />, label: '问答记录' },
    { key: '/admin/documents', icon: <FileTextOutlined />, label: '知识库管理' },
    ...(isAdmin ? [{ key: '/admin/users', icon: <TeamOutlined />, label: '用户管理' }] : []),
    { key: '/admin/profile', icon: <UserOutlined />, label: '个人管理' },
  ]

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* ====== 建筑背景 ====== */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url('/images/campus/sea.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'rgba(255, 255, 255, 0.08)',
        pointerEvents: 'none',
      }} />

      {/* ====== 深色毛玻璃侧边栏 — sticky 不拉伸，自然包裹内容 ====== */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          transform: 'translateY(-50%)',
          left: collapsed ? 16 : 0,
          height: 'fit-content',
          zIndex: 20,
          width: collapsed ? 60 : 240,
          transformOrigin: 'center center',
          borderRadius: 22,
          background: 'rgba(15, 25, 45, 0.40)',
          backdropFilter: 'blur(44px) saturate(190%)',
          WebkitBackdropFilter: 'blur(44px) saturate(190%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 48px rgba(10,25,41,0.40)',
          display: 'flex',
          flexDirection: 'column',
          padding: collapsed ? '16px 10px' : '18px 22px',
          gap: 0,
          transition: `width 0.55s cubic-bezier(0.16, 1, 0.3, 1), left 0.55s cubic-bezier(0.16, 1, 0.3, 1), padding 0.55s cubic-bezier(0.16, 1, 0.3, 1)`,
          overflow: 'hidden',
        }}
      >
        {/* ====== 展开/收起按钮 ====== */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 10,
            width: '100%',
            padding: collapsed ? '8px 0' : '10px 10px',
            border: 'none',
            borderRadius: 10,
            background: 'transparent',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 18,
            cursor: 'pointer',
            outline: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.80)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          <span style={{
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 120,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: 12,
            fontWeight: 500,
            transition: 'opacity 0.3s ease, max-width 0.3s ease',
          }}>河海问答助手</span>
        </button>

        {/* ====== 分隔线 ====== */}
        <div style={{
          height: 1,
          margin: collapsed ? '10px 6px' : '10px 4px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
          flexShrink: 0,
        }} />

        {/* ====== 导航菜单 ====== */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflowY: 'auto',
          paddingTop: 8,
        }}>
          {navItems.map((item) => {
            const active = getSelectedKey() === item.key
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 12,
                  width: '100%',
                  padding: collapsed ? '10px 0' : '12px 12px',
                  border: 'none',
                  borderRadius: 10,
                  background: active
                    ? 'rgba(0,91,172,0.35)'
                    : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.50)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  outline: 'none',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.50)'
                  }
                }}
              >
                <span style={{ fontSize: 18, display: 'flex', flexShrink: 0 }}>{item.icon}</span>
                <span style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? 0 : 140,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.3s ease, max-width 0.3s ease',
                }}>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* ====== 底部署名 ====== */}
        <div style={{
          flexShrink: 0,
          padding: collapsed ? '8px 4px' : '8px 4px',
          color: 'rgba(255,255,255,0.20)',
          fontSize: 10,
          textAlign: 'center',
        }}>
          <span style={{
            display: collapsed ? 'none' : 'block',
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}>
            河海大学 · v1.0
          </span>
        </div>
      </div>

      {/* ====== 右侧主区域 ====== */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 顶栏 */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          height: 64,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          {/* 左侧：校徽 + 返回首页 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src="/images/logo.svg"
              alt="河海大学"
              style={{ height: 36, filter: 'brightness(0) invert(1)' }}
            />
            <button
              onClick={() => navigate('/')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 18px', borderRadius: 50,
                border: 'none', background: 'transparent',
                color: 'rgba(255,255,255,0.75)', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <HomeOutlined style={{ fontSize: 15 }} />
              返回首页
            </button>
          </div>

          {/* 右侧：用户信息 + 退出登录 */}
          <Dropdown
            menu={{ items: [
              { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: () => { logout(); navigate('/login') } },
            ] }}
            trigger={['click']}
          >
            <div style={{
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 14px', borderRadius: 20,
              background: 'rgba(255,255,255,0.80)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <Avatar
                size={28}
                style={{
                  background: isAdmin
                    ? 'linear-gradient(135deg, #d97746, #e89a6b)'
                    : 'linear-gradient(135deg, #005BAC, #0ea5e9)',
                }}
                icon={<UserOutlined />}
              />
              <Space size={6}>
                <span style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#1e293b',
                }}>
                  {user.username || '用户'}
                </span>
                <Tag style={{
                  borderRadius: 10, fontSize: 10, border: 'none',
                  background: '#e8f4ff',
                  color: '#005BAC',
                  padding: '0 8px', fontWeight: 600,
                }}>
                  {isAdmin ? '管理员' : '用户'}
                </Tag>
              </Space>
            </div>
          </Dropdown>
        </div>

        {/* 内容区 */}
        <div style={{
          flex: 1,
          margin: 20,
          padding: 28,
          paddingLeft: collapsed ? 92 : 260,
          transition: 'padding-left 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'auto',
        }}>
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
        </div>
      </div>
    </div>
  )
}
