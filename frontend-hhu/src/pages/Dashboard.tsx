import { useState, useEffect } from 'react'
import { Card, Col, Row, Statistic } from 'antd'
import { CommentOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons'
import { chatApi } from '../api'

export default function Dashboard() {
  const [qaCount, setQaCount] = useState(0)

  useEffect(() => {
    chatApi.history().then((res: any) => {
      if (Array.isArray(res)) setQaCount(res.length)
    }).catch(() => {})
  }, [])

  return (
    <>
      <h2 style={{ marginBottom: 24 }}>管理仪表盘</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="问答总数"
              value={qaCount}
              prefix={<CommentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="知识库文档"
              value={0}
              prefix={<FileTextOutlined />}
              suffix="篇"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="注册用户"
              value={0}
              prefix={<UserOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}
