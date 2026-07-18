import { useState, useEffect } from 'react'
import { Card, Col, Row, Statistic } from 'antd'
import { CommentOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons'
import { adminApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [stats, setStats] = useState({ userCount: 0, documentCount: 0, qaCount: 0, todayQaCount: 0 })

  useEffect(() => {
    adminApi.stats().then((res: any) => {
      if (res) setStats(res)
    }).catch(() => {})
  }, [])

  return (
    <>
      <h2 style={{ marginBottom: 24 }}>管理仪表盘</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="会话总数"
              value={stats.qaCount}
              prefix={<CommentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="今日问答"
              value={stats.todayQaCount}
              prefix={<CommentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="知识库文档"
              value={stats.documentCount}
              prefix={<FileTextOutlined />}
              suffix="篇"
            />
          </Card>
        </Col>
        {isAdmin && (
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="注册用户"
                value={stats.userCount}
                prefix={<UserOutlined />}
                suffix="人"
              />
            </Card>
          </Col>
        )}
      </Row>
    </>
  )
}
