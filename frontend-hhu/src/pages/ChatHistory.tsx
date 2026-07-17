import { useState, useEffect } from 'react'
import { Table, Modal, Tag, message, Descriptions, Input, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { adminApi } from '../api'

/** 安全解析 sources JSON */
function safeParseSources(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}

export default function ChatHistory() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [keyword, setKeyword] = useState('')

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await adminApi.chatHistory(p, 10, keyword || undefined)
      setData(res.records || [])
      setTotal(res.total || 0)
      setPage(p)
    } catch {
      message.error('加载问答记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSearch = (value: string) => {
    setKeyword(value)
    load(1)
  }

  const openDetail = async (id: number) => {
    try {
      const record: any = await adminApi.chatDetail(id)
      setDetail(record)
      setDetailVisible(true)
    } catch {
      message.error('加载详情失败')
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '用户ID',
      dataIndex: 'userId',
      width: 80,
      render: (uid: number) => <Tag>{uid}</Tag>,
    },
    {
      title: '会话ID',
      dataIndex: 'conversationId',
      width: 80,
      render: (cid: number) => cid ? <Tag color="blue">{cid}</Tag> : <Tag>无</Tag>,
    },
    {
      title: '问题',
      dataIndex: 'question',
      ellipsis: true,
      render: (q: string) => (
        <span>{q && q.length > 40 ? q.substring(0, 40) + '...' : q}</span>
      ),
    },
    {
      title: '回答',
      dataIndex: 'answer',
      ellipsis: true,
      render: (a: string) => (
        <span style={{ color: '#666' }}>
          {a && a.length > 50 ? a.substring(0, 50) + '...' : a}
        </span>
      ),
    },
    {
      title: '评价',
      dataIndex: 'feedback',
      width: 70,
      render: (f: number) => {
        if (f === 1) return <Tag color="blue">👍</Tag>
        if (f === -1) return <Tag color="red">👎</Tag>
        return <Tag>—</Tag>
      },
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      width: 160,
      render: (t: string) => t && t.replace('T', ' ').substring(0, 19),
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, record: any) => (
        <a onClick={() => openDetail(record.id)}>查看详情</a>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>问答记录</h2>
        <Space>
          <Input.Search
            placeholder="搜索问题或回答内容"
            allowClear
            onSearch={handleSearch}
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
          />
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 10,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p) => load(p),
        }}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => openDetail(record.id),
        })}
      />

      {/* 详情弹窗 */}
      <Modal
        title="问答详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={640}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="用户ID">{detail.userId}</Descriptions.Item>
            <Descriptions.Item label="会话ID">
              {detail.conversationId ?? '无'}
            </Descriptions.Item>
            <Descriptions.Item label="评价">
              {detail.feedback === 1 ? '👍 赞' : detail.feedback === -1 ? '👎 踩' : '未评价'}
            </Descriptions.Item>
            <Descriptions.Item label="时间">
              {detail.createTime?.replace('T', ' ').substring(0, 19)}
            </Descriptions.Item>
            <Descriptions.Item label="问题">
              <div style={{ whiteSpace: 'pre-wrap' }}>{detail.question}</div>
            </Descriptions.Item>
            <Descriptions.Item label="回答">
              <div style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                {detail.answer}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="参考来源">
              {safeParseSources(detail.sourceDocs).length > 0
                ? safeParseSources(detail.sourceDocs).map((s: string, i: number) => (
                    <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
                      {s}
                    </Tag>
                  ))
                : '无'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  )
}
