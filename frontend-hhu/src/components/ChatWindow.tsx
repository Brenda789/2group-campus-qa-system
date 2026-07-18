import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button, Input, Card, message, Space, Tag, Spin, Modal, Upload } from 'antd'
import {
  RobotOutlined,
  SendOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  MessageOutlined,
  UploadOutlined,
  InboxOutlined,
  LikeOutlined,
  DislikeOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { chatApi, docApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  recordId?: number
  feedback?: number
}

interface ConvItem {
  id: number
  title: string
}

/** 快捷问题 */
const QUICK_QUESTIONS = [
  '河海大学的校训是什么？',
  '图书馆开放时间？',
  '校园卡如何补办？',
  '奖学金怎么申请？',
]

/** 通用聊天窗口组件，支持两种模式：
 *  - floating（首页浮动弹窗）：position:fixed + 关闭按钮
 *  - embedded（管理后台内嵌）：铺满父容器，无关闭按钮
 */
export interface ChatWindowHandle {
  openUpload: () => void
  openChat: () => void
}

const ChatWindow = forwardRef<ChatWindowHandle, { mode?: 'floating' | 'embedded' }>(function ChatWindow({ mode = 'floating' }, ref) {
  const { isLoggedIn } = useAuth()
  const [chatOpen, setChatOpen] = useState(mode === 'embedded')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<ConvItem[]>([])
  const [activeConvId, setActiveConvId] = useState<number | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [hoveredConv, setHoveredConv] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<{ name: string; status: string; chunkCount?: number }[]>([])
  const uploadPollRefs = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map())
  const pollCounterRef = useRef(0)
  const msgEnd = useRef<HTMLDivElement>(null)
  const cancelStream = useRef<(() => void) | null>(null)
  const [renameVisible, setRenameVisible] = useState(false)
  const [renameConvId, setRenameConvId] = useState<number | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)

  // 暴露 openUpload 给父组件
  useImperativeHandle(ref, () => ({ openUpload: () => setUploadOpen(true), openChat: () => setChatOpen(true) }), [])

  const [guestConvs, setGuestConvs] = useState<Record<number, Message[]>>({})
  const [guestNextId, setGuestNextId] = useState(1)

  // 清理
  useEffect(() => {
    return () => {
      cancelStream.current?.()
      uploadPollRefs.current.forEach((timer) => clearInterval(timer))
      uploadPollRefs.current.clear()
    }
  }, [])

  // 自动滚动
  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 加载会话列表
  useEffect(() => {
    if (!chatOpen) return
    if (isLoggedIn) loadConversationsFromApi()
    else loadConversationsFromLocal()
  }, [chatOpen, isLoggedIn])

  const loadConversationsFromApi = async () => {
    try {
      const list: any = await chatApi.conversations()
      setConversations(list || [])
    } catch { /* */ }
  }

  const loadConversationsFromLocal = () => {
    const list: ConvItem[] = Object.entries(guestConvs).map(([id, msgs]) => {
      const firstUser = msgs.find(m => m.role === 'user')
      const title = firstUser
        ? (firstUser.content.length > 30 ? firstUser.content.substring(0, 30) + '...' : firstUser.content)
        : '新会话'
      return { id: Number(id), title }
    })
    setConversations(list)
  }

  const loadConversations = () => {
    if (isLoggedIn) loadConversationsFromApi()
    else loadConversationsFromLocal()
  }

  const loadMessagesFromApi = async (convId: number) => {
    setConvLoading(true)
    try {
      const list: any = await chatApi.messages(convId)
      setMessages(
        (list || []).map((m: any) => ({
          role: m.role,
          content: m.content,
          sources: safeParseSources(m.sources),
        })),
      )
    } catch {
      message.error('加载消息失败')
    } finally {
      setConvLoading(false)
    }
  }

  const loadMessagesFromLocal = (convId: number) => {
    setMessages(guestConvs[convId] || [])
  }

  // ==================== 发送消息（流式） ====================
  const send = (text: string) => {
    if (!text.trim() || loading) return
    const q = text.trim()
    setInput('')
    cancelStream.current?.()
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    cancelStream.current = chatApi.streamAsk(
      q,
      isLoggedIn ? (activeConvId ?? undefined) : undefined,
      (token) => {
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + token }
          }
          return updated
        })
      },
      (fullAnswer, resolvedConvId) => {
        cancelStream.current = null
        setLoading(false)
        if (isLoggedIn) {
          if (!activeConvId && resolvedConvId) setActiveConvId(resolvedConvId)
          loadConversationsFromApi()
        } else {
          let convId = activeConvId
          if (convId === null) {
            convId = guestNextId
            setGuestNextId((n) => n + 1)
            setActiveConvId(convId)
          }
          setGuestConvs((prev) => {
            const existing = prev[convId!] || []
            return { ...prev, [convId!]: [...existing, { role: 'user', content: q }, { role: 'assistant', content: fullAnswer }] }
          })
          loadConversationsFromLocal()
        }
      },
      (err) => {
        cancelStream.current = null
        setLoading(false)
        message.error('发送失败: ' + err)
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx]?.role === 'assistant' && !updated[lastIdx].content) {
            updated[lastIdx] = { ...updated[lastIdx], content: `[错误] ${err}` }
          }
          return updated
        })
      },
    )
  }

  // ==================== 停止生成 ====================
  const handleStop = () => {
    cancelStream.current?.()
    cancelStream.current = null
    setLoading(false)
    setMessages((prev) => {
      const updated = [...prev]
      const lastIdx = updated.length - 1
      if (lastIdx >= 0 && updated[lastIdx]?.role === 'assistant') {
        if (updated[lastIdx].content) {
          updated[lastIdx] = { ...updated[lastIdx], content: updated[lastIdx].content + '\n\n[已停止生成]' }
        } else {
          updated[lastIdx] = { ...updated[lastIdx], content: '[已停止生成]' }
        }
      }
      return updated
    })
  }

  const selectConversation = (convId: number) => {
    setActiveConvId(convId)
    if (isLoggedIn) loadMessagesFromApi(convId)
    else loadMessagesFromLocal(convId)
  }

  const newConversation = () => {
    setActiveConvId(null)
    setMessages([])
  }

  const openRename = (convId: number, title: string) => {
    setRenameConvId(convId)
    setRenameTitle(title)
    setRenameVisible(true)
  }

  const handleRename = async () => {
    if (!renameConvId || !renameTitle.trim()) { message.error('标题不能为空'); return }
    if (renameTitle.length > 100) { message.error('标题不能超过100个字符'); return }
    setRenameLoading(true)
    try {
      await chatApi.renameConversation(renameConvId, renameTitle.trim())
      message.success('已重命名')
      setRenameVisible(false)
      loadConversations()
    } catch (e: any) {
      message.error(e?.message || '重命名失败')
    } finally { setRenameLoading(false) }
  }

  const deleteConversation = async (convId: number) => {
    if (isLoggedIn) {
      try {
        await chatApi.deleteConversation(convId)
        message.success('已删除')
        if (activeConvId === convId) { setActiveConvId(null); setMessages([]) }
        loadConversationsFromApi()
      } catch { message.error('删除失败') }
    } else {
      setGuestConvs((prev) => { const next = { ...prev }; delete next[convId]; return next })
      if (activeConvId === convId) { setActiveConvId(null); setMessages([]) }
      loadConversationsFromLocal()
    }
  }

  // ==================== 点赞/踩 ====================
  const handleFeedback = async (msgIndex: number, value: number) => {
    const msg = messages[msgIndex]
    if (!msg?.recordId) return
    const newValue = msg.feedback === value ? 0 : value
    try {
      await chatApi.feedback(msg.recordId, newValue)
      setMessages((prev) => { const updated = [...prev]; updated[msgIndex] = { ...updated[msgIndex], feedback: newValue }; return updated })
    } catch { message.error('评价失败') }
  }

  // ==================== 上传文档 ====================
  const STATUS_LABELS: Record<string, string> = {
    PROCESSING: '排队处理中', PARSING: '解析文件中', SPLITTING: '文本切片中',
    EMBEDDING: '向量化中', READY: '处理完成', ERROR: '处理失败',
  }

  const clearUploadState = () => {
    setUploading(false); setUploadFiles([])
    uploadPollRefs.current.forEach((timer) => clearInterval(timer))
    uploadPollRefs.current.clear()
  }

  const handleUpload = async (info: any) => {
    const files: File[] = info.fileList?.length > 0
      ? info.fileList.map((f: any) => f.originFileObj || f).filter(Boolean)
      : info.file ? [info.file] : []
    if (files.length === 0) return
    setUploading(true)
    // 初始化文件列表
    const initialFiles = files.map((f) => ({ name: f.name, status: 'PROCESSING' }))
    setUploadFiles(initialFiles)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const doc: any = await docApi.upload(file)
        if (!doc?.id) {
          setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'ERROR' } : f))
          continue
        }
        // 启动轮询
        const pollId = ++pollCounterRef.current
        const timer = setInterval(async () => {
          try {
            const latest: any = await docApi.getById(doc.id)
            if (!latest) return
            setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: latest.status, chunkCount: latest.chunkCount } : f))
            if (latest.status === 'READY' || latest.status === 'ERROR') {
              const t = uploadPollRefs.current.get(pollId)
              if (t) { clearInterval(t); uploadPollRefs.current.delete(pollId) }
              // 检查是否全部完成
              setUploadFiles((prev) => {
                const allDone = prev.every((f) => f.status === 'READY' || f.status === 'ERROR')
                if (allDone) {
                  const okCount = prev.filter((f) => f.status === 'READY').length
                  const failCount = prev.filter((f) => f.status === 'ERROR').length
                  if (failCount === 0) message.success(`全部处理完成，共 ${okCount} 个文档`)
                  else message.info(`处理完成：${okCount} 个成功${failCount > 0 ? `，${failCount} 个失败` : ''}`)
                  setTimeout(() => { setUploading(false); setUploadOpen(false); setUploadFiles([]) }, 2000)
                }
                return prev
              })
            }
          } catch { /* */ }
        }, 500)
        uploadPollRefs.current.set(pollId, timer)
      } catch {
        setUploadFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'ERROR' } : f))
      }
    }
  }

  // ==================== 聊天窗口 UI ====================
  const chatCard = (
    <Card
      title={
        <Space>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #005BAC, #0ea5e9)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff' }}><RobotOutlined /></span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>河海问答助手</span>
          {!isLoggedIn && <Tag style={{ borderRadius: 10, fontSize: 10, border: '1px solid #fbbf24', background: '#fef3c7', color: '#92400e' }}>访客模式 · 刷新后记录消失</Tag>}
        </Space>
      }
      extra={
        mode === 'floating' ? (
          <Space>
            <Button ghost onClick={() => setUploadOpen(true)} icon={<UploadOutlined />} style={{ borderRadius: 8 }} size="small">上传文档</Button>
            <Button type="text" icon={<CloseOutlined />} onClick={() => setChatOpen(false)} />
          </Space>
        ) : (
          <Button ghost onClick={() => setUploadOpen(true)} icon={<UploadOutlined />} style={{ borderRadius: 8 }} size="small">上传文档</Button>
        )
      }
      style={mode === 'floating' ? {
        position: 'fixed', right: 24, bottom: 88, width: 680, height: 520,
        zIndex: 9998, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
      } : {
        width: '100%', height: 'calc(100vh - 140px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column',
      }}
      styles={{ body: { padding: 0, flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 } }}
    >
      {/* 左侧：会话列表 */}
      <div style={{ width: 200, minWidth: 200, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
        <div style={{ padding: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={newConversation} style={{ whiteSpace: 'nowrap' }}>新对话</Button>
          {!isLoggedIn && <div style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 6 }}>💡 登录后可永久保存</div>}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
          {conversations.map((conv) => (
            <div
              key={conv.id} onClick={() => selectConversation(conv.id)}
              onMouseEnter={() => setHoveredConv(conv.id)} onMouseLeave={() => setHoveredConv(null)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', marginBottom: 2, borderRadius: 6, cursor: 'pointer', background: activeConvId === conv.id ? '#e6f0ff' : 'transparent', border: activeConvId === conv.id ? '1px solid #b3d4ff' : '1px solid transparent', transition: 'all 0.15s' }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: activeConvId === conv.id ? '#005BAC' : '#333', fontWeight: activeConvId === conv.id ? 500 : 400 }}>
                <MessageOutlined style={{ marginRight: 6, fontSize: 12, color: '#999' }} />{conv.title}
              </span>
              <EditOutlined onClick={(e) => { e.stopPropagation(); openRename(conv.id, conv.title) }}
                style={{ fontSize: 12, color: hoveredConv === conv.id ? '#005BAC' : 'transparent', cursor: 'pointer', marginRight: 6, transition: 'color 0.15s' }} />
              <DeleteOutlined onClick={(e) => { e.stopPropagation(); Modal.confirm({ title: '确定删除该会话？', content: '删除后无法恢复', okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => deleteConversation(conv.id) }) }}
                style={{ fontSize: 12, color: hoveredConv === conv.id ? '#ff4d4f' : '#bbb', cursor: 'pointer', marginLeft: 4, transition: 'color 0.15s' }} />
            </div>
          ))}
          {conversations.length === 0 && <div style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 24 }}>暂无历史会话</div>}
        </div>
      </div>

      {/* 右侧：对话区 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {activeConvId === null && messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', marginTop: 60 }}>
              <RobotOutlined style={{ fontSize: 48 }} />
              <p>你好！我是河海大学问答助手，有什么可以帮你？</p>
              <div style={{ marginTop: 12 }}>
                {QUICK_QUESTIONS.map((q) => <Tag key={q} color="blue" style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => send(q)}>{q}</Tag>)}
              </div>
            </div>
          )}
          {convLoading && <div style={{ textAlign: 'center', marginTop: 60 }}><Spin /><p style={{ color: '#999', marginTop: 8 }}>加载消息中...</p></div>}
          {!convLoading && messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 12, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              <div style={{ display: 'inline-block', maxWidth: '85%', padding: '10px 16px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? 'linear-gradient(135deg, #005BAC, #0ea5e9)' : '#f3f4f6', color: msg.role === 'user' ? '#fff' : '#1f2937', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.6, boxShadow: msg.role === 'user' ? '0 2px 10px rgba(0,91,172,0.25)' : 'none' }}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.content && !msg.content.startsWith('[错误]') && (
                <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
                  <Button type="text" size="small" icon={<LikeOutlined style={{ color: msg.feedback === 1 ? '#005BAC' : '#999' }} />} onClick={() => handleFeedback(i, 1)} style={{ fontSize: 12, padding: '0 4px', height: 24 }} />
                  <Button type="text" size="small" icon={<DislikeOutlined style={{ color: msg.feedback === -1 ? '#ff4d4f' : '#999' }} />} onClick={() => handleFeedback(i, -1)} style={{ fontSize: 12, padding: '0 4px', height: 24 }} />
                </div>
              )}
            </div>
          ))}
          {loading && <div style={{ color: '#999', textAlign: 'center' }}><RobotOutlined spin /> 思考中...</div>}
          <div ref={msgEnd} />
        </div>
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 12px' }}>
          {loading ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入你的问题..." disabled />
              <Button type="primary" danger icon={<StopOutlined />} onClick={handleStop}>停止</Button>
            </div>
          ) : (
            <Input.Search value={input} onChange={(e) => setInput(e.target.value)} onSearch={send} enterButton={<SendOutlined />} placeholder="输入你的问题..." />
          )}
        </div>
      </div>
    </Card>
  )

  return (
    <>
      {/* 浮动模式：机器人按钮 + 点击弹出 */}
      {mode === 'floating' && !chatOpen && (
        <button onClick={() => setChatOpen(true)}
          style={{ position: 'fixed', right: 28, bottom: 28, width: 60, height: 60, border: 'none', borderRadius: 18, background: 'linear-gradient(135deg, #005BAC 0%, #0ea5e9 100%)', color: '#fff', fontSize: 28, cursor: 'pointer', boxShadow: '0 8px 28px rgba(0,91,172,0.40)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,91,172,0.50)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,91,172,0.40)' }}
        ><RobotOutlined /></button>
      )}
      {chatOpen && chatCard}

      {/* 上传文档 Modal */}
      <Modal title="上传文档到知识库" open={uploadOpen} onCancel={() => { clearUploadState(); setUploadOpen(false) }} footer={null} destroyOnClose zIndex={10000} width={560}>
        <p style={{ color: '#999', marginBottom: 16 }}>支持 PDF / DOCX / TXT / MD，最大 10MB，可同时上传多个文件{!isLoggedIn && '。未登录上传的文档为临时文档，服务重启后清理'}</p>
        {uploadFiles.length === 0 && (
          <Upload.Dragger beforeUpload={() => false} onChange={handleUpload} showUploadList={false} accept=".pdf,.docx,.doc,.txt,.md" style={{ padding: '24px 0' }} multiple>
            <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 40, color: '#005BAC' }} /></p>
            <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 500 }}>可将上传文件拖拽至此（支持多文件）</p>
            <p className="ant-upload-hint" style={{ color: '#999' }}>或点击此处选择文件上传</p>
          </Upload.Dragger>
        )}
        {uploadFiles.length > 0 && (
          <div style={{ padding: '8px 0', maxHeight: 400, overflow: 'auto' }}>
            {uploadFiles.map((f, idx) => {
              const isDone = f.status === 'READY'
              const isErr = f.status === 'ERROR'
              const isProcessing = !isDone && !isErr
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', marginBottom: 8,
                  borderRadius: 10, border: '1px solid #f0f0f0',
                  background: isDone ? '#f6ffed' : isErr ? '#fff2f0' : '#fafafa',
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isDone ? '#52c41a' : isErr ? '#ff4d4f' : '#005BAC',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {isDone ? '✓' : isErr ? '✕' : <Spin size="small" style={{ color: '#fff' }} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <Tag color={isDone ? 'green' : isErr ? 'red' : isProcessing ? 'blue' : 'default'}
                      style={{ fontSize: 11, marginTop: 2 }}>
                      {STATUS_LABELS[f.status] || f.status}
                      {isDone && f.chunkCount != null ? ` · ${f.chunkCount} 切片` : ''}
                    </Tag>
                  </div>
                </div>
              )
            })}
            {uploadFiles.some((f) => f.status !== 'READY' && f.status !== 'ERROR') && (
              <p style={{ color: '#faad14', fontSize: 12, marginTop: 8, textAlign: 'center' }}>处理中，请勿关闭此窗口</p>
            )}
            {uploadFiles.every((f) => f.status === 'READY' || f.status === 'ERROR') && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Button type="primary" onClick={() => { clearUploadState(); setUploadOpen(false) }}>
                  关闭
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 重命名 Modal */}
      <Modal title="重命名会话" open={renameVisible} onCancel={() => setRenameVisible(false)} onOk={handleRename} confirmLoading={renameLoading} okText="保存" cancelText="取消" destroyOnClose>
        <Input value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} placeholder="请输入新标题" maxLength={100} showCount style={{ marginTop: 16 }} onPressEnter={handleRename} />
      </Modal>
    </>
  )
})

export default ChatWindow

function safeParseSources(raw: any): string[] | undefined {
  if (!raw) return undefined
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return undefined } }
  return undefined
}
