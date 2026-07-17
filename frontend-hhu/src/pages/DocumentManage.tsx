import { useState, useEffect, useCallback } from 'react'
import { Table, Tag, Button, message, Upload, Popconfirm, Input, Select, Space, Card, Typography, Modal } from 'antd'
import { UploadOutlined, ReloadOutlined, SearchOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons'
import { docApi, adminApi } from '../api'

const { Title, Text } = Typography

const statusLabel: Record<string, string> = {
  READY: '已完成',
  PROCESSING: '处理中',
  PARSING: '解析中',
  SPLITTING: '切片中',
  EMBEDDING: '向量化中',
  ERROR: '处理失败',
}

const statusColor: Record<string, string> = {
  READY: 'green',
  PROCESSING: 'blue',
  PARSING: 'processing',
  SPLITTING: 'processing',
  EMBEDDING: 'processing',
  ERROR: 'red',
}

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'READY', label: '已完成' },
  { value: 'PROCESSING', label: '处理中' },
  { value: 'PARSING', label: '解析中' },
  { value: 'SPLITTING', label: '切片中' },
  { value: 'EMBEDDING', label: '向量化中' },
  { value: 'ERROR', label: '处理失败' },
]

export default function DocumentManage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await docApi.list(p, 10, keyword || undefined, statusFilter || undefined)
      setData(res.records)
      setTotal(res.total)
      setPage(p)
    } catch {
      message.error('加载文档列表失败')
    } finally {
      setLoading(false)
    }
  }, [keyword, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  // 有进行中文档时，每 500ms 自动刷新（确保捕捉到所有中间状态）
  useEffect(() => {
    const processing = data.some((d) =>
      ['PROCESSING', 'PARSING', 'SPLITTING', 'EMBEDDING'].includes(d.status)
    )
    if (!processing) return
    const timer = setInterval(() => load(page), 500)
    return () => clearInterval(timer)
  }, [data, page, load])

  const handleUpload = async (info: any) => {
    const file = info.file as File
    setUploading(true)
    try {
      await docApi.upload(file)
      message.success('上传成功，正在处理')
      setUploadOpen(false)
      load(1)
    } catch (e: any) {
      message.error(e?.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await docApi.remove(id)
      message.success('已删除')
      load(page)
    } catch {
      message.error('删除失败')
    }
  }

  const handleReprocess = async (id: number) => {
    try {
      await docApi.reprocess(id)
      message.success('已触发重新处理')
      load(page)
    } catch {
      message.error('重新处理失败')
    }
  }

  const handleVisibility = async (id: number, current: string) => {
    const newVis = current === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'
    try {
      await docApi.setVisibility(id, newVis as 'PUBLIC' | 'PRIVATE')
      message.success(`已设为${newVis === 'PUBLIC' ? '公开' : '私有'}`)
      load(page)
    } catch {
      message.error('操作失败')
    }
  }

  const handleRebuild = async () => {
    setRebuilding(true)
    try {
      await adminApi.rebuildIndex()
      message.success('索引重建完成')
      load(page)
    } catch {
      message.error('索引重建失败')
    } finally {
      setRebuilding(false)
    }
  }

  const handleSearch = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '文档标题', dataIndex: 'title' },
    {
      title: '类型',
      dataIndex: 'fileType',
      render: (t: string) => <Tag>{t?.toUpperCase()}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s: string) => (
        <Tag color={statusColor[s] || 'default'}>
          {['PARSING', 'SPLITTING', 'EMBEDDING'].includes(s) ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#1677ff',
                  animation: 'pulse 1.2s ease-in-out infinite',
                }}
              />
              {statusLabel[s] || s}
            </span>
          ) : (
            statusLabel[s] || s
          )}
        </Tag>
      ),
    },
    { title: '切块数', dataIndex: 'chunkCount' },
    {
      title: '可见性',
      dataIndex: 'visibility',
      width: 100,
      render: (v: string, record: any) => (
        <Tag
          color={v === 'PUBLIC' ? 'blue' : 'default'}
          style={{ cursor: 'pointer' }}
          onClick={() => handleVisibility(record.id, v || 'PRIVATE')}
        >
          {v === 'PUBLIC' ? '公开' : '私有'}
        </Tag>
      ),
    },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space size="small">
          <Popconfirm
            title="确定重新处理该文档？将重新切分和向量化。"
            onConfirm={() => handleReprocess(record.id)}
          >
            <Button size="small">重新处理</Button>
          </Popconfirm>
          <Popconfirm
            title="确定删除该文档？删除后不可恢复。"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
            <FileTextOutlined style={{ marginRight: 10, color: '#005BAC' }} />
            知识库管理
          </Title>
          <Text type="secondary">管理文档切片，构建问答知识库</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="primary" icon={<UploadOutlined />} size="large"
            style={{ borderRadius: 10, fontWeight: 600, height: 42 }}
            onClick={() => setUploadOpen(true)}
          >
            上传文档
          </Button>
          <Button
            icon={<ReloadOutlined />}
            loading={rebuilding}
            onClick={handleRebuild}
          >
            重建索引
          </Button>
        </div>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Input.Search
            placeholder="搜索文档名称"
            allowClear
            onSearch={handleSearch}
            style={{ width: 220 }}
            prefix={<SearchOutlined />}
          />
          <Select
            value={statusFilter}
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            style={{ width: 120 }}
          />
        </Space>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      <Card style={{ borderRadius: 16, border: '1px solid #eef2f7' }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          <InboxOutlined style={{ marginRight: 6 }} />
          支持 PDF / DOCX / TXT / MD 格式，单文件最大 10MB
        </Text>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 10,
            showTotal: (t: number) => `共 ${t} 条`,
            onChange: (p: number) => load(p),
          }}
        />
      </Card>

      {/* 上传文档 Modal */}
      <Modal
        title="上传文档到知识库"
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        footer={null}
        destroyOnClose
      >
        <p style={{ color: '#999', marginBottom: 16 }}>
          支持 PDF / DOCX / TXT / MD，最大 10MB
        </p>
        <Upload.Dragger
          beforeUpload={() => false}
          onChange={handleUpload}
          showUploadList={false}
          accept=".pdf,.docx,.doc,.txt,.md"
          style={{ padding: '24px 0' }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 40, color: '#005BAC' }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 500 }}>
            可将上传文件拖拽至此
          </p>
          <p className="ant-upload-hint" style={{ color: '#999' }}>
            或点击此处选择文件上传
          </p>
        </Upload.Dragger>
      </Modal>
    </>
  )
}
