import { useState, useEffect } from 'react'
import { Table, Modal, Tag, message, Button, Popconfirm, Input, Space, Spin } from 'antd'
import { SearchOutlined, UserOutlined, RobotOutlined, EditOutlined } from '@ant-design/icons'
import { adminApi } from '../api'

export default function ChatHistory() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailMessages, setDetailMessages] = useState<any[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [selectedConvTitle, setSelectedConvTitle] = useState('')
  const [renameVisible, setRenameVisible] = useState(false)
  const [renameConvId, setRenameConvId] = useState<number | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  const load = async (p = 1, kw?: string) => {
    const searchKey = kw ?? keyword
    setLoading(true)
    try {
      const res: any = await adminApi.chatConversations(p, pageSize, searchKey || undefined)
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

  /** 打开会话详情：加载完整对话 */
  const openDetail = async (convId: number, title: string) => {
    setSelectedConvTitle(title)
    setDetailVisible(true)
    setDetailLoading(true)
    setDetailMessages([])
    try {
      const msgs: any = await adminApi.chatConversationMessages(convId)
      setDetailMessages(msgs || [])
    } catch {
      message.error('加载对话详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async (convId: number) => {
    try {
      await adminApi.deleteConversation(convId)
      message.success('已删除')
      load(page)
    } catch (e: any) {
      message.error(e?.message || '删除失败')
    }
  }

  const openRename = (convId: number, title: string) => {
    setRenameConvId(convId)
    setRenameTitle(title)
    setRenameVisible(true)
  }

  const handleRename = async () => {
    if (!renameConvId || !renameTitle.trim()) {
      message.error('标题不能为空')
      return
    }
    if (renameTitle.length > 100) {
      message.error('标题不能超过100个字符')
      return
    }
    setRenameLoading(true)
    try {
      await adminApi.renameConversation(renameConvId, renameTitle.trim())
      message.success('已重命名')
      setRenameVisible(false)
      load(page)
    } catch (e: any) {
      message.error(e?.message || '重命名失败')
    } finally {
      setRenameLoading(false)
    }
  }

  const columns = [
    { title: '会话ID', dataIndex: 'id', width: 80 },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      width: 250,
      render: (t: string, record: any) => (
        <span onClick={(e) => e.stopPropagation()}>
          <span>{t && t.length > 40 ? t.substring(0, 40) + '...' : t}</span>
          <EditOutlined
            onClick={() => openRename(record.id, t)}
            style={{
              marginLeft: 8, fontSize: 12, color: '#999',
              cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#005BAC'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
          />
        </span>
      ),
    },
    {
      title: '问题数',
      width: 80,
      render: (_: any, record: any) => (
        <Tag color="blue">{record.questionCount ?? '—'}</Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 170,
      render: (t: string) => t && t.replace('T', ' ').substring(0, 19),
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, record: any) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => openDetail(record.id, record.title)}>
            查看详情
          </Button>
          <Popconfirm
            title="确定删除该会话？将同时删除该会话下所有问答记录"
            onConfirm={() => handleDelete(record.id)}
            okText="确定" cancelText="取消"
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </span>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>问答记录</h2>
      </Space>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索会话标题关键字"
          allowClear
          onSearch={(value) => { setKeyword(value); load(1, value) }}
          style={{ width: 360 }}
          prefix={<SearchOutlined />}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize,
          showTotal: (t: number) => `共 ${t} 条`,
          onChange: (p: number) => load(p),
        }}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => openDetail(record.id, record.title),
        })}
      />

      {/* 详情弹窗：展示会话内完整对话 */}
      <Modal
        title={`会话详情 · ${selectedConvTitle}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={680}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
            <p style={{ color: '#999' }}>加载对话中...</p>
          </div>
        ) : detailMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bbb', padding: 40 }}>
            暂无消息
          </div>
        ) : (
          <div style={{ maxHeight: 460, overflow: 'auto', padding: '8px 0' }}>
            {detailMessages.map((msg: any, i: number) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id || i}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    marginBottom: 16,
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* 头像 */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: isUser
                      ? 'linear-gradient(135deg, #005BAC, #0ea5e9)'
                      : '#f0f4f9',
                    color: isUser ? '#fff' : '#005BAC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}>
                    {isUser ? <UserOutlined /> : <RobotOutlined />}
                  </div>

                  {/* 消息内容 */}
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{
                      fontSize: 11, color: '#999', marginBottom: 2,
                      textAlign: isUser ? 'right' : 'left',
                    }}>
                      {isUser ? '我' : 'AI 助手'}
                      {msg.createTime && (
                        <span> · {msg.createTime.replace('T', ' ').substring(0, 19)}</span>
                      )}
                    </div>
                    <div style={{
                      padding: '10px 16px',
                      borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isUser
                        ? 'linear-gradient(135deg, #005BAC, #0ea5e9)'
                        : '#f3f4f6',
                      color: isUser ? '#fff' : '#1f2937',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: 14,
                      lineHeight: 1.7,
                    }}>
                      {msg.content}
                    </div>
                    {/* 来源标记 */}
                    {msg.sources && isAssistantSources(msg) && (
                      <div style={{ marginTop: 4 }}>
                        {parseSources(msg.sources).map((s: string, si: number) => (
                          <Tag key={si} color="blue" style={{ fontSize: 11, marginBottom: 2 }}>
                            {s}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* 重命名 Modal */}
      <Modal
        title="重命名会话"
        open={renameVisible}
        onCancel={() => setRenameVisible(false)}
        onOk={handleRename}
        confirmLoading={renameLoading}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Input
          value={renameTitle}
          onChange={(e) => setRenameTitle(e.target.value)}
          placeholder="请输入新标题"
          maxLength={100}
          showCount
          style={{ marginTop: 16 }}
          onPressEnter={handleRename}
        />
      </Modal>
    </>
  )
}

/** 判断 assistant 消息是否有有效来源 */
function isAssistantSources(msg: any): boolean {
  if (!msg.sources) return false
  if (typeof msg.sources === 'string') {
    try { return JSON.parse(msg.sources).length > 0 } catch { return false }
  }
  if (Array.isArray(msg.sources)) return msg.sources.length > 0
  return false
}

/** 安全解析 sources */
function parseSources(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  return []
}
