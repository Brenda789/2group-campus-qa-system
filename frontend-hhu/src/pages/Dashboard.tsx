import { useState, useEffect } from 'react'
import { Card, Col, Row, Statistic, Typography } from 'antd'
import {
  CommentOutlined,
  FileTextOutlined,
  UserOutlined,
  RiseOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { chatApi, userApi } from '../api'

const { Title, Text } = Typography

const statCards = [
  {
    key: 'qa',
    title: '问答总数',
    icon: <CommentOutlined />,
    color: '#005BAC',
    gradient: 'linear-gradient(135deg, #edf6ff 0%, #e0f0ff 100%)',
    iconBg: 'linear-gradient(135deg, #005BAC 0%, #0ea5e9 100%)',
  },
  {
    key: 'users',
    title: '注册用户',
    icon: <UserOutlined />,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    iconBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  },
  {
    key: 'active',
    title: '活跃用户',
    icon: <RiseOutlined />,
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    iconBg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
  },
]

export default function Dashboard() {
  const [stats, setStats] = useState({ qa: 0, users: 0, active: 0 })

  useEffect(() => {
    chatApi.history().then((res: any) => {
      if (Array.isArray(res)) setStats((s) => ({ ...s, qa: res.length }))
    }).catch(() => {})

    userApi.list(1, 1000).then((res: any) => {
      const records = Array.isArray(res?.records) ? res.records : []
      setStats((s) => ({
        ...s,
        users: Number(res?.total || records.length),
        active: records.filter((r: any) => r.status === 1).length,
      }))
    }).catch(() => {})
  }, [])

  const statValues: Record<string, number> = {
    qa: stats.qa, users: stats.users, active: stats.active,
  }

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>
          <BarChartOutlined style={{ marginRight: 10, color: '#005BAC' }} />
          管理仪表盘
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          概览校园问答系统的关键运营指标
        </Text>
      </div>

      <Row gutter={[20, 20]}>
        {statCards.map((card) => (
          <Col xs={24} sm={8} key={card.key}>
            <Card
              style={{
                borderRadius: 16,
                border: '1px solid #eef2f7',
                overflow: 'hidden',
              }}
              styles={{ body: { padding: '24px 24px 20px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {card.title}
                  </Text>
                  <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8, color: card.color, lineHeight: 1 }}>
                    {statValues[card.key]}
                  </div>
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: card.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, color: '#fff',
                  boxShadow: `0 6px 18px ${card.color}33`,
                }}>
                  {card.icon}
                </div>
              </div>
              <div style={{
                marginTop: 18, paddingTop: 16,
                borderTop: '1px solid #f3f4f6',
              }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  较昨日 <span style={{ color: card.color, fontWeight: 600 }}>持平</span>
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #eef2f7' }}
            title={<span style={{ fontWeight: 600, fontSize: 15 }}>📊 系统状态概览</span>}
          >
            <Row gutter={[40, 16]}>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Statistic title="后端服务" value="运行中" styles={{ content: { color: '#059669', fontSize: 22, fontWeight: 600 } }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Spring Boot · 端口 8000</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Statistic title="数据库" value="已连接" styles={{ content: { color: '#005BAC', fontSize: 22, fontWeight: 600 } }} />
                <Text type="secondary" style={{ fontSize: 12 }}>MySQL 8.0 · campus_qa</Text>
              </Col>
              <Col span={8} style={{ textAlign: 'center' }}>
                <Statistic title="前端框架" value="React 19" styles={{ content: { color: '#7c3aed', fontSize: 22, fontWeight: 600 } }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Vite + Antd 6 + TypeScript</Text>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  )
}
