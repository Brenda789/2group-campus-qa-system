import { useRef } from 'react'
import { Button, Space, Typography } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import ChatWindow, { type ChatWindowHandle } from '../components/ChatWindow'

const { Title } = Typography

export default function AIAssistant() {
  const chatRef = useRef<ChatWindowHandle>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          <img src="/images/hema.png" alt="河海问答助手" style={{ width: 24, height: 24, marginRight: 8, verticalAlign: 'middle' }} />
          AI 问答助手
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => chatRef.current?.openUpload()}
            style={{ borderRadius: 8, fontWeight: 600 }}
            size="large"
          >
            上传文档
          </Button>
        </Space>
      </div>
      <ChatWindow ref={chatRef} mode="embedded" />
    </div>
  )
}
