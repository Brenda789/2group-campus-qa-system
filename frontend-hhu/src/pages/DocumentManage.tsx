import { useState, useEffect } from 'react'
import { Table, Tag, Button, message, Upload, Popconfirm, Card, Typography } from 'antd'
import { UploadOutlined, ReloadOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons'
import { docApi, adminApi } from '../api'

const { Title, Text } = Typography

export default function DocumentManage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await docApi.list(p, 10)
      setData(res.records)
      setTotal(res.total)
      setPage(p)
    } catch {
      message.error('加载文档列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // 有 PROCESSING 状态的文档时，每 2 秒自动刷新
  useEffect(() => {
    const hasProcessing = data.some((d) => d.status === 'PROCESSING')
    if (!hasProcessing) return
    const timer = setInterval(() => load(page), 2000)
    return () => clearInterval(timer)
  }, [data, page])

  const handleUpload = async (info: any) => {
    const file = info.file as File
    setUploading(true)
    try {
      await docApi.upload(file)
      message.success('上传成功')
      load(1)
    } catch {
      message.error('上传失败')
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
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          READY: 'green',
          PROCESSING: 'orange',
          ERROR: 'red',
        }
        return <Tag color={colorMap[s] || 'default'}>{s}</Tag>
      },
    },
    { title: '切块数', dataIndex: 'chunkCount' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Popconfirm
          title="确定删除该文档？删除后不可恢复"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button size="small" danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4, fontWeight: 700 }}>
            <FileTextOutlined style={{ marginRight: 10, color: '#005BAC' }} />
            知识库管理
          </Title>
          <Text type="secondary">管理文档切片，构建问答知识库</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Upload
            beforeUpload={() => false}
            onChange={handleUpload}
            showUploadList={false}
            accept=".pdf,.docx,.doc,.txt,.md"
          >
            <Button type="primary" icon={<UploadOutlined />} loading={uploading} size="large"
              style={{ borderRadius: 10, fontWeight: 600, height: 42 }}
            >
              上传文档
            </Button>
          </Upload>
          <Button
            icon={<ReloadOutlined />}
            loading={rebuilding}
            onClick={handleRebuild}
          >
            重建索引
          </Button>
          <Button onClick={() => load(1)}>刷新</Button>
        </div>
      </div>

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
    </>
  )
}
