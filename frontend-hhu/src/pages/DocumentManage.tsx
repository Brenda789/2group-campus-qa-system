import { useState, useEffect } from 'react'
import { Table, Tag, Button, message, Upload, Popconfirm } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { docApi } from '../api'

export default function DocumentManage() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

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
          title="确定删除该文档？删除后不可恢复。"
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
      <div style={{ marginBottom: 16 }}>
        <Upload
          beforeUpload={() => false} // 手动控制上传
          onChange={handleUpload}
          showUploadList={false}
          accept=".pdf,.docx,.doc,.txt,.md"
        >
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
            上传文档
          </Button>
        </Upload>
        <span style={{ marginLeft: 12, color: '#999', fontSize: 12 }}>
          支持 PDF / DOCX / TXT / MD，最大 10MB
        </span>
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
      />
    </>
  )
}
