import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from 'antd'
import {
  CommentOutlined, FileTextOutlined, UserOutlined, TeamOutlined,
  RobotOutlined, UploadOutlined, ArrowRightOutlined, PlusOutlined,
} from '@ant-design/icons'
import { adminApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

/* ---- Types ---- */
interface Stats { userCount: number; documentCount: number; qaCount: number; todayQaCount: number }
interface DailyQa { date: string; count: number }
interface DocStatus { name: string; value: number }
interface ChartStats { dailyQa: DailyQa[]; docStatus: DocStatus[]; weeklyTrend: DailyQa[] }

/* ---- SVG Charts with full NaN protection ---- */

function safeMax(arr: number[], fallback = 1) {
  return Math.max(...arr, fallback)
}

/** 柱状图 */
function BarChart({ data, w = 320, h = 170, dark, white }: {
  data: DailyQa[]; w?: number; h?: number; dark?: boolean; white?: boolean;
}) {
  if (!data || data.length === 0) return <svg width={w} height={h} />
  const max = safeMax(data.map(d => d.count ?? 0))
  const yTicks = 4
  const tickStep = Math.max(Math.ceil(max / yTicks), 1)
  const ceiling = tickStep * yTicks
  const pad = { top: 14, right: 14, left: 30, bottom: 26 }
  const pw = Math.max(w - pad.left - pad.right, 1)
  const ph = Math.max(h - pad.top - pad.bottom, 1)
  const n = data.length || 7
  const step = pw / n
  const barW = Math.max(step * 0.55, 10)
  const barColor = white ? 'rgba(255,255,255,0.85)' : 'rgba(0,91,172,0.65)'
  const labelColor = white ? 'rgba(255,255,255,0.70)' : dark ? '#64748b' : 'rgba(255,255,255,0.55)'
  const gridColor = white ? 'rgba(255,255,255,0.20)' : dark ? '#e2e8f0' : 'rgba(255,255,255,0.15)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="dash-chart-svg">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = pad.top + (ph / yTicks) * i
        const val = tickStep * (yTicks - i)
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y}
              stroke={gridColor} strokeWidth={1} strokeDasharray="4 3" />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill={labelColor} fontSize="10">{val}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const cx = pad.left + step * i + step / 2
        const bh = Math.max(((d.count ?? 0) / ceiling) * ph, 2)
        const rx = cx - barW / 2
        return (
          <g key={i}>
            <rect x={rx} y={pad.top + ph - bh} width={barW} height={bh} rx={3} fill={barColor} />
            <text x={cx} y={h - 6} textAnchor="middle" fill={labelColor} fontSize="10">{d.date}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** 饼图（简化版，稳定不崩溃） */
function SimplePie({ data, w = 220, h = 180, dark }: {
  data: DocStatus[]; w?: number; h?: number; dark?: boolean;
}) {
  if (!data || data.length === 0) return <svg width={w} height={h} />
  const total = Math.max(data.reduce((s, d) => s + (d.value ?? 0), 0), 1)
  const colors = ['#005BAC', '#0ea5e9', '#94a3b8']
  const cx = w / 2, cy = h / 2, r = 60
  const trackColor = dark ? '#f1f5f9' : 'rgba(255,255,255,0.08)'
  const textColor = dark ? '#1e293b' : '#fff'
  let cum = 0
  return (
    <svg width={w} height={h} className="dash-chart-svg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={14} />
      {data.map((d, i) => {
        const v = d.value ?? 0
        if (v <= 0) return null
        const angle = (v / total) * 360
        const start = cum * Math.PI / 180 - Math.PI / 2
        const end = (cum + angle) * Math.PI / 180 - Math.PI / 2
        cum += angle
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end)
        const large = angle > 180 ? 1 : 0
        return (
          <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
            fill="none" stroke={colors[i % colors.length]} strokeWidth={14} strokeLinecap="round" />
        )
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fill={textColor} fontSize="15" fontWeight={700}>{total}</text>
    </svg>
  )
}

/** 折线图 */
function LineChart({ data, w = 320, h = 170, dark }: {
  data: DailyQa[]; w?: number; h?: number; dark?: boolean;
}) {
  if (!data || data.length === 0) return <svg width={w} height={h} />
  const max = safeMax(data.map(d => d.count ?? 0))
  const pad = { top: 18, right: 16, bottom: 26, left: 54 }
  const pw = Math.max(w - pad.left - pad.right, 1)
  const ph = Math.max(h - pad.top - pad.bottom, 1)
  const yTicks = 4
  const tickStep = Math.max(Math.ceil(max / yTicks), 1)
  const pts = data.map((d, i) => {
    const x = pad.left + i * (pw / Math.max(data.length - 1, 1))
    const y = pad.top + ph - ((d.count ?? 0) / (tickStep * yTicks)) * ph
    return `${x},${y}`
  }).join(' ')
  const lineColor = dark ? '#005BAC' : '#60a5fa'
  const gridColor = dark ? '#d1d5db' : 'rgba(255,255,255,0.15)'
  const labelColor = dark ? '#475569' : 'rgba(255,255,255,0.55)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="dash-chart-svg">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = pad.top + (ph / yTicks) * i
        const val = tickStep * (yTicks - i)
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y}
              stroke={gridColor} strokeWidth={1} strokeDasharray="4 3" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill={labelColor} fontSize="10">{val}</text>
          </g>
        )
      })}
      {data.length > 1 && (
        <polygon points={`${pad.left},${pad.top + ph} ${pts} ${w - pad.right},${pad.top + ph}`}
          fill="rgba(0,91,172,0.06)" />
      )}
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = pad.left + i * (pw / Math.max(data.length - 1, 1))
        const y = pad.top + ph - ((d.count ?? 0) / (tickStep * yTicks)) * ph
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="#fff" stroke={lineColor} strokeWidth={2} />
            <text x={x} y={h - 6} textAnchor="middle" fill={labelColor} fontSize="10">{d.date}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ---- Main Component ---- */

export default function Dashboard() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'admin'
  const [stats, setStats] = useState<Stats>({ userCount: 0, documentCount: 0, qaCount: 0, todayQaCount: 0 })
  const [chartData, setChartData] = useState<ChartStats>({ dailyQa: [], docStatus: [], weeklyTrend: [] })
  const [recent, setRecent] = useState<{ question: string; createTime: string }[]>([])
  const [modalChart, setModalChart] = useState<{ title: string; detail: React.ReactNode } | null>(null)

  useEffect(() => {
    adminApi.stats().then((res: any) => { if (res) setStats(res) }).catch(() => {})
    adminApi.chartStats().then((res: any) => { if (res) setChartData(res) }).catch(() => {})
    adminApi.chatHistory(1, 5).then((res: any) => {
      if (res?.records) setRecent(res.records.map((r: any) => ({
        question: r.question || '', createTime: r.createTime || '',
      })))
    }).catch(() => {})
  }, [])

  const fmtTime = (t: string) => {
    if (!t) return ''
    try {
      const d = new Date(t); const diff = Date.now() - d.getTime()
      if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  const bentoCards = [
    { key: 'qa', label: '会话总数', value: stats.qaCount.toLocaleString(), icon: <CommentOutlined />, nav: '/admin/chat' },
    { key: 'today', label: '今日问答', value: stats.todayQaCount.toLocaleString(), icon: <RobotOutlined />, nav: '/admin/ai-assistant' },
    { key: 'docs', label: '知识库文档', value: stats.documentCount.toLocaleString(), icon: <FileTextOutlined />, nav: '/admin/documents' },
    ...(isAdmin ? [{ key: 'users', label: '注册用户', value: stats.userCount.toLocaleString(), icon: <TeamOutlined />, nav: '/admin/users' }] : []),
  ]

  return (
    <div>
      {/* ---- 页头 ---- */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">管理仪表盘</h2>
          <p className="dash-subtitle">欢迎回到管理后台，概览系统运行状态</p>
        </div>
      </div>

      {/* ---- 统计卡片 ---- */}
      <div className="dash-bento-grid">
        {bentoCards.map((card) => (
          <div key={card.key} className="dash-bento-card" onClick={() => navigate(card.nav)}>
            <div className="dash-bento-icon">{card.icon}</div>
            <div className="dash-bento-info">
              <span className="dash-bento-value">{card.value}</span>
              <span className="dash-bento-label">{card.label}</span>
            </div>
            <ArrowRightOutlined className="dash-bento-arrow" />
          </div>
        ))}
      </div>

      {/* ---- 图表卡片 ---- */}
      <div className="dash-chart-grid">
        {/* 柱状图 — 薄荷绿 */}
        <div className="dash-chart-card mint" onClick={() => setModalChart({
          title: '近 7 天问答数',
          detail: (
            <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
              <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12, fontSize: 15 }}>近七日个人问答趋势</p>
              <BarChart data={chartData.dailyQa} w={460} h={220} dark />
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(chartData.dailyQa || []).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: i % 2 === 0 ? '#f8fafc' : 'transparent' }}>
                    <span>{d.date}</span><span style={{ fontWeight: 700, color: '#1e293b' }}>{d.count ?? 0} 次</span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 14, color: '#94a3b8', fontSize: 13 }}>数值越高代表当日使用 AI 助手越活跃。</p>
            </div>
          ),
        })}>
          <div className="dash-chart-title"><span className="dash-chart-dot" />近 7 天问答数</div>
          <div className="dash-chart-body"><BarChart data={chartData.dailyQa} white /></div>
          <div className="dash-chart-footer"><span>点击查看详情</span><ArrowRightOutlined style={{ fontSize: 12 }} /></div>
        </div>

        {/* 饼图 — 文档状态 */}
        <div className="dash-chart-card" onClick={() => setModalChart({
          title: '文档状态分布',
          detail: (
            <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
              <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12, fontSize: 15 }}>知识库文档处理状态</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                <SimplePie data={chartData.docStatus} w={200} h={200} dark />
                <div style={{ flex: 1 }}>
                  {(chartData.docStatus || []).map((d, i) => (
                    <div key={i} style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: ['#005BAC','#0ea5e9','#94a3b8'][i] }} />
                      <span>{d.name}：</span>
                      <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 20 }}>{d.value ?? 0}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>篇</span>
                    </div>
                  ))}
                </div>
              </div>
              <p style={{ marginTop: 12, color: '#94a3b8', fontSize: 13 }}>就绪状态的文档可立即参与问答检索。</p>
            </div>
          ),
        })}>
          <div className="dash-chart-title">文档状态分布</div>
          <div className="dash-chart-body"><SimplePie data={chartData.docStatus} w={200} h={180} dark /></div>
          <div className="dash-chart-footer"><span>点击查看详情</span><ArrowRightOutlined style={{ fontSize: 12 }} /></div>
        </div>

        {/* 折线图 — 全平台趋势 */}
        <div className="dash-chart-card" onClick={() => setModalChart({
          title: '全平台问答趋势',
          detail: (
            <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
              <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12, fontSize: 15 }}>全平台近七日问答量走势</p>
              <LineChart data={chartData.weeklyTrend} w={460} h={220} dark />
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(chartData.weeklyTrend || []).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, background: i % 2 === 0 ? '#f8fafc' : 'transparent' }}>
                    <span>{d.date}</span><span style={{ fontWeight: 700, color: '#1e293b' }}>{d.count ?? 0} 次</span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 14, color: '#94a3b8', fontSize: 13 }}>反映全平台所有用户的每日问答总量趋势。</p>
            </div>
          ),
        })}>
          <div className="dash-chart-title">全平台问答趋势</div>
          <div className="dash-chart-body"><LineChart data={chartData.weeklyTrend} dark /></div>
          <div className="dash-chart-footer"><span>点击查看详情</span><ArrowRightOutlined style={{ fontSize: 12 }} /></div>
        </div>
      </div>

      {/* ---- 第二行：最近问答 + 快捷操作 ---- */}
      <div className="dash-row-2">
        <div className="dash-panel">
          <h3 className="dash-panel-title"><span className="dash-dot blue" />最近问答</h3>
          {recent.length === 0 && <div className="dash-empty">暂无问答记录</div>}
          <div className="dash-recent-list">
            {recent.slice(0, 5).map((item, i) => (
              <div key={i} className="dash-recent-item">
                <span className={`dash-recent-dot${i % 2 === 0 ? '' : ' orange'}`} />
                <span className="dash-recent-text">{item.question}</span>
                <span className="dash-recent-time">{fmtTime(item.createTime)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-panel">
          <h3 className="dash-panel-title"><span className="dash-dot orange" />快捷操作</h3>
          <div className="dash-quick-actions">
            <button className="dash-action-btn" onClick={() => navigate('/admin/ai-assistant')}>
              <span className="dash-action-icon"><RobotOutlined /></span>打开 AI 问答助手</button>
            <button className="dash-action-btn orange" onClick={() => navigate('/admin/documents')}>
              <span className="dash-action-icon"><UploadOutlined /></span>管理知识库文档</button>
            <button className="dash-action-btn" onClick={() => navigate('/admin/chat')}>
              <span className="dash-action-icon"><PlusOutlined /></span>查看问答记录</button>
          </div>
        </div>
      </div>

      {/* ---- Modal ---- */}
      <Modal title={modalChart?.title} open={!!modalChart} onCancel={() => setModalChart(null)} footer={null}
        width={580} className="dash-chart-modal" maskClassName="dash-chart-modal-mask" destroyOnClose>
        <div style={{ padding: '12px 0' }}>{modalChart?.detail}</div>
      </Modal>
    </div>
  )
}
