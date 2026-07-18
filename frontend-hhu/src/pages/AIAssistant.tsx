import { useRef } from 'react'
import { Button, Space, Typography } from 'antd'
import { UploadOutlined, RobotOutlined } from '@ant-design/icons'
import ChatWindow, { type ChatWindowHandle } from '../components/ChatWindow'

const { Title } = Typography

export default function AIAssistant() {
  const chatRef = useRef<ChatWindowHandle>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          <RobotOutlined style={{ color: '#005BAC', marginRight: 8 }} />
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
