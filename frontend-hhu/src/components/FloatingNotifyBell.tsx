import { useState, useRef, useEffect, useMemo } from 'react'
import { Button, Typography, Tag, Timeline, Space } from 'antd'
import {
  BellOutlined,
  CloseOutlined,
  DeleteOutlined,
  UserOutlined,
  FileTextOutlined,
  ReloadOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { useNotifications } from '../contexts/NotificationContext'
import type { Notification } from '../contexts/NotificationContext'

const { Text } = Typography

const categoryIcon: Record<string, React.ReactNode> = {
  user: <UserOutlined />,
  document: <FileTextOutlined />,
  system: <ReloadOutlined />,
}

const typeColor: Record<string, string> = {
  success: 'green',
  error: 'red',
  info: 'blue',
  processing: 'processing',
}

export default function FloatingNotifyBell() {
  const { notifications, clear, markAllSeen, hasUnseen } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next && hasUnseen) {
      // 展开时标记全部已读
      setTimeout(() => markAllSeen(), 200)
    }
  }

  const recent = useMemo(() => notifications.slice(0, 20), [notifications])

  return (
    <>
      {/* 悬浮小喇叭按钮 */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        title="通知中心"
        style={{
          position: 'fixed',
          right: 30,
          bottom: 44,
          zIndex: 1050,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.35)',
          background: open
            ? 'rgba(255,56,92,0.18)'
            : 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.40)',
          transition: 'all 0.3s cubic-bezier(0.25,0.1,0.25,1)',
          color: open ? '#ff385c' : '#555',
          fontSize: 20,
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.06)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.50)'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.40)'
          }
        }}
      >
        <BellOutlined />
        {/* 红色圆点 */}
        {hasUnseen && (
          <span style={{
            position: 'absolute',
            top: 6,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: '#ff385c',
            border: '2px solid #fff',
          }} />
        )}
      </button>

      {/* 弹出面板 */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          right: 30,
          bottom: 104,
          zIndex: 1049,
          width: 380,
          maxHeight: 'calc(100vh - 160px)',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          borderRadius: 20,
          border: '1.5px solid rgba(255,255,255,0.40)',
          boxShadow: '0 8px 48px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.50)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
          transition: 'all 0.35s cubic-bezier(0.22,0.05,0.19,1)',
          transformOrigin: 'bottom right',
        }}
      >
        {/* 头部 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <Space size={6}>
            <BellOutlined style={{ color: '#ff385c', fontSize: 16 }} />
            <Text strong style={{ fontSize: 15 }}>通知中心</Text>
            {notifications.length > 0 && (
              <Tag color="red" style={{ marginLeft: 4, borderRadius: 10 }}>{notifications.length}</Tag>
            )}
          </Space>
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={clear}
              disabled={notifications.length === 0}
              style={{ color: '#999' }}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setOpen(false)}
              style={{ color: '#999' }}
            />
          </Space>
        </div>

        {/* 列表 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px 16px 20px',
          minHeight: 60,
        }}>
          {recent.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 0',
              gap: 8,
            }}>
              <CheckOutlined style={{ fontSize: 28, color: '#ccc' }} />
              <Text type="secondary" style={{ fontSize: 13 }}>暂无通知</Text>
            </div>
          ) : (
            <Timeline
              items={recent.map((n: Notification) => ({
                color: typeColor[n.type],
                dot: categoryIcon[n.category],
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                        <Tag
                          color={typeColor[n.type]}
                          style={{ marginRight: 6, fontSize: 11, lineHeight: '18px' }}
                        >
                          {n.category === 'user' ? '用户' : n.category === 'document' ? '文档' : '系统'}
                        </Tag>
                        {n.message}
                      </span>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 2 }}>
                      {n.time}
                    </Text>
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </div>
    </>
  )
}
