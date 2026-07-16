import { useEffect, useState } from 'react'
import { Card, Table, Tag, Tabs, Empty, Typography, Tooltip, message } from 'antd'
import { CommentOutlined, HistoryOutlined, MessageOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { chatApi } from '../api'

const { Text, Paragraph, Title } = Typography

interface QaRecord {
  id: number
  question: string
  answer: string
  createTime: string
}

interface Conversation {
  id: number
  title: string
  createTime: string
}

export default function ChatHistory() {
  const [records, setRecords] = useState<QaRecord[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const data = await chatApi.history()
      setRecords(Array.isArray(data) ? data : (data as any)?.records ?? [])
    } catch {
      message.warning('加载问答记录失败')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async () => {
    try {
      const data = await chatApi.conversations()
      setConversations(Array.isArray(data) ? data : (data as any)?.records ?? [])
    } catch {
      setConversations([])
    }
  }

  useEffect(() => {
    fetchHistory()
    fetchConversations()
  }, [])

  const qaColumns: ColumnsType<QaRecord> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      align: 'center',
      render: (id: number) => <Tag>{id}</Tag>,
    },
    {
      title: '提问',
      dataIndex: 'question',
      ellipsis: true,
      render: (q: string) => (
        <Tooltip title={q}>
          <Text strong style={{ color: '#005BAC' }}>{q}</Text>
        </Tooltip>
      ),
    },
    {
      title: '回答',
      dataIndex: 'answer',
      width: 360,
      ellipsis: true,
      render: (a: string) => (
        <Tooltip title={a}>
          <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, color: '#4b5563' }}>
            {a}
          </Paragraph>
        </Tooltip>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 180,
      render: (t: string) => (
        <Text type="secondary">{new Date(t).toLocaleString('zh-CN')}</Text>
      ),
    },
  ]

  const convColumns: ColumnsType<Conversation> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      align: 'center',
      render: (id: number) => <Tag>{id}</Tag>,
    },
    {
      title: '会话标题',
      dataIndex: 'title',
      render: (t: string) => (
        <Text strong style={{ color: '#005BAC' }}>{t}</Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 200,
      render: (t: string) => (
        <Text type="secondary">{new Date(t).toLocaleString('zh-CN')}</Text>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'qa',
      label: (
        <span>
          <MessageOutlined style={{ marginRight: 6 }} />
          问答记录
          <Tag style={{ marginLeft: 8 }}>{records.length}</Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={qaColumns}
          dataSource={records}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无问答记录" /> }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }}
          style={{ marginTop: 12 }}
        />
      ),
    },
    {
      key: 'conv',
      label: (
        <span>
          <HistoryOutlined style={{ marginRight: 6 }} />
          会话列表
          <Tag style={{ marginLeft: 8 }}>{conversations.length}</Tag>
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={convColumns}
          dataSource={conversations}
          locale={{ emptyText: <Empty description="暂无会话" /> }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }}
          style={{ marginTop: 12 }}
        />
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontWeight: 700, display: 'inline' }}>
          <CommentOutlined style={{ marginRight: 10, color: '#005BAC' }} />
          问答记录
        </Title>
        <Text type="secondary" style={{ marginLeft: 14, fontSize: 14 }}>
          查看用户的提问与 AI 回答历史
        </Text>
      </div>

      <Card style={{ borderRadius: 16, border: '1px solid #eef2f7' }}>
        <Tabs defaultActiveKey="qa" items={tabItems} size="large" />
      </Card>
    </div>
  )
}
