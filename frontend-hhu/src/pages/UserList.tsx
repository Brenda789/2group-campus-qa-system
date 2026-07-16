import { useState, useEffect } from 'react'
import { Table, Tag, Button, Input, Space, message, Popconfirm } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { userApi } from '../api'

export default function UserList() {
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')

  const load = async (p = 1, kw = keyword) => {
    setLoading(true)
    try {
      const res: any = await userApi.list(p, 10, kw || undefined)
      setData(res.records)
      setTotal(res.total)
      setPage(p)
    } catch {
      message.error('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggle = async (userId: number, newStatus: number) => {
    try {
      await userApi.toggleStatus(userId, newStatus)
      message.success(newStatus === 1 ? '已启用' : '已禁用')
      load(page)
    } catch {
      message.error('操作失败')
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      render: (r: string) => (
        <Tag color={r === 'admin' ? 'blue' : 'default'}>{r}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s: number) => (s === 1 ? '✅ 启用' : '⛔ 禁用'),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      render: (t: string) => t?.substring(0, 16),
    },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 1 ? (
            <Popconfirm
              title="确定禁用该用户？"
              onConfirm={() => handleToggle(record.id, 0)}
            >
              <Button size="small" danger>
                禁用
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="确定启用该用户？"
              onConfirm={() => handleToggle(record.id, 1)}
            >
              <Button size="small" type="primary">
                启用
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索用户名"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => load(1)}
          style={{ width: 240 }}
        />
        <Button type="primary" onClick={() => load(1)}>
          搜索
        </Button>
      </Space>
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
