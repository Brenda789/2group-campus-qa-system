import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Col,
  Row,
  Statistic,
  Typography,
  Tag,
  Empty,
  Button,
  Space,
  Spin,
  Tooltip,
  Progress,
  Divider,
  Result,
} from 'antd'
import {
  CommentOutlined,
  FileTextOutlined,
  UserOutlined,
  ReloadOutlined,
  SmileOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { adminApi } from '../api'

const { Title, Text } = Typography

// ==================== 类型 ====================
interface TrendItem {
  date: string
  count: number
}

interface StatsData {
  userCount: number
  documentCount: number
  qaCount: number
  todayQaCount: number
  positiveRate: number
  vectorStoreSize: number
}

interface TrendData {
  qaTrend: TrendItem[]
  userTrend: TrendItem[]
  docStatus: { ready: number; processing: number; error: number }
  feedbackDist: { positive: number; negative: number; neutral: number }
}

// ==================== 颜色常量 ====================
const COLORS = {
  primary: '#ff385c',
  mint: '#00a699',
  blue: '#1890ff',
  orange: '#fa8c16',
  purple: '#722ed1',
  cyan: '#13c2c2',
  green: '#52c41a',
  red: '#ff4d4f',
}

const PIE_COLORS = ['#52c41a', '#1890ff', '#ff4d4f']
const FEEDBACK_COLORS = ['#52c41a', '#ff4d4f', '#d9d9d9']

// 格式化日期（去掉年份前缀，显示月-日）
const fmtDate = (d: string) => {
  const parts = d.split('-')
  return `${parts[1]}/${parts[2]}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsData>({
    userCount: 0, documentCount: 0, qaCount: 0, todayQaCount: 0,
    positiveRate: 0, vectorStoreSize: 0,
  })
  const [trend, setTrend] = useState<TrendData>({
    qaTrend: [], userTrend: [],
    docStatus: { ready: 0, processing: 0, error: 0 },
    feedbackDist: { positive: 0, negative: 0, neutral: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [lastRefresh, setLastRefresh] = useState('')
  const [spinning, setSpinning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAll = useCallback(async (showSpin = false) => {
    if (showSpin) setSpinning(true)
    setError(false)
    try {
      const [statsRes, trendRes] = await Promise.all([
        adminApi.stats() as Promise<StatsData>,
        adminApi.trend() as Promise<TrendData>,
      ])
      if (statsRes) setStats(statsRes)
      if (trendRes) setTrend(trendRes)
      setLastRefresh(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setSpinning(false)
      setCountdown(30)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    timerRef.current = setInterval(() => fetchAll(), 30000)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [fetchAll])

  // ==================== 文档状态饼图数据 ====================
  const docStatusData = [
    { name: '就绪', value: trend.docStatus.ready, color: PIE_COLORS[0] },
    { name: '处理中', value: trend.docStatus.processing, color: PIE_COLORS[1] },
    { name: '异常', value: trend.docStatus.error, color: PIE_COLORS[2] },
  ].filter(d => d.value > 0)

  // ==================== 反馈分布饼图数据 ====================
  const feedbackData = [
    { name: '满意', value: trend.feedbackDist.positive, color: FEEDBACK_COLORS[0] },
    { name: '不满意', value: trend.feedbackDist.negative, color: FEEDBACK_COLORS[1] },
    { name: '未评价', value: trend.feedbackDist.neutral, color: FEEDBACK_COLORS[2] },
  ]

  // ==================== 渲染 ====================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" description="加载仪表盘数据…" />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="warning"
        title="数据加载失败"
        subTitle="后端服务不可达，请确认服务已启动后刷新页面"
        extra={
          <Button type="primary" icon={<ReloadOutlined />} onClick={() => { setLoading(true); fetchAll(true) }}>
            重新加载
          </Button>
        }
      />
    )
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* ====== 标题栏 ====== */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={3} style={{ margin: 0 }}>
            <ThunderboltOutlined style={{ color: COLORS.primary, marginRight: 8 }} />
            管理仪表盘
          </Title>
          <Tag color="processing" style={{ fontWeight: 500 }}>
            实时监控
          </Tag>
        </div>
        <Space size="middle">
          <Tooltip title={`每 30 秒自动刷新 · ${countdown}s 后下次刷新`}>
            <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {lastRefresh || '--:--:--'}
              <span style={{ marginLeft: 6, color: '#bbb' }}>（{countdown}s）</span>
            </Text>
          </Tooltip>
          <Button
            size="small"
            icon={<ReloadOutlined spin={spinning} />}
            onClick={() => fetchAll(true)}
            loading={spinning}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* ====== 统计卡片行 ====== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={4}>
          <Card
            hoverable
            onClick={() => navigate('/admin/chat')}
            style={{ cursor: 'pointer', borderRadius: 14, borderTop: '3px solid #ff385c' }}
          >
            <Statistic
              title="问答总数"
              value={stats.qaCount}
              prefix={<CommentOutlined style={{ color: COLORS.primary }} />}
              styles={{ content: { fontSize: 26 } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            hoverable
            onClick={() => navigate('/admin/chat')}
            style={{ cursor: 'pointer', borderRadius: 14, borderTop: '3px solid #00a699' }}
          >
            <Statistic
              title="今日问答"
              value={stats.todayQaCount}
              prefix={<RiseOutlined style={{ color: COLORS.mint }} />}
              styles={{ content: { fontSize: 26 } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            hoverable
            onClick={() => navigate('/admin/documents')}
            style={{ cursor: 'pointer', borderRadius: 14, borderTop: '3px solid #1890ff' }}
          >
            <Statistic
              title="知识库文档"
              value={stats.documentCount}
              prefix={<FileTextOutlined style={{ color: COLORS.blue }} />}
              suffix="篇"
              styles={{ content: { fontSize: 26 } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card
            hoverable
            onClick={() => navigate('/admin/users')}
            style={{ cursor: 'pointer', borderRadius: 14, borderTop: '3px solid #722ed1' }}
          >
            <Statistic
              title="注册用户"
              value={stats.userCount}
              prefix={<UserOutlined style={{ color: COLORS.purple }} />}
              suffix="人"
              styles={{ content: { fontSize: 26 } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card style={{ borderRadius: 14, borderTop: '3px solid #52c41a' }}>
            <Statistic
              title="满意度"
              value={stats.positiveRate}
              prefix={<SmileOutlined style={{ color: COLORS.green }} />}
              suffix="%"
              precision={1}
              styles={{ content: { fontSize: 26, color: stats.positiveRate >= 80 ? '#52c41a' : '#fa8c16' } }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card style={{ borderRadius: 14, borderTop: '3px solid #13c2c2' }}>
            <Statistic
              title="向量库规模"
              value={stats.vectorStoreSize}
              prefix={<DatabaseOutlined style={{ color: COLORS.cyan }} />}
              suffix="块"
              styles={{ content: { fontSize: 26 } }}
            />
          </Card>
        </Col>
      </Row>

      {/* ====== 图表区域 ====== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* QA 趋势 — 面积图 */}
        <Col xs={24} lg={14} style={{ display: 'flex' }}>
          <Card
            title={<Space><RiseOutlined style={{ color: COLORS.primary }} />问答趋势（近 7 天）</Space>}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                总计 {trend.qaTrend.reduce((s, i) => s + i.count, 0)} 次
              </Text>
            }
            style={{ borderRadius: 14, width: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
          >
            {trend.qaTrend.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            ) : (
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend.qaTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="qaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={36} />
                    <ReTooltip
                      labelFormatter={(l) => `日期: ${l}`}
                      formatter={(v: number) => [`${v} 次`, '问答量']}
                      contentStyle={{ borderRadius: 10, border: '1px solid #f0f0f0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={COLORS.primary}
                      strokeWidth={2.5}
                      fill="url(#qaGradient)"
                      dot={{ r: 4, fill: COLORS.primary, stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: COLORS.primary, stroke: '#fff', strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>

        {/* 文档状态 — 环形图 */}
        <Col xs={24} sm={12} lg={5} style={{ display: 'flex' }}>
          <Card
            title={<Space><FileTextOutlined style={{ color: COLORS.blue }} />文档状态分布</Space>}
            style={{ borderRadius: 14, width: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}
          >
            {docStatusData.length === 0 ? (
              <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 24 }} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={docStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {docStatusData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(v: number) => [`${v} 篇`, '']}
                      contentStyle={{ borderRadius: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                  {docStatusData.map((d, i) => (
                    <div key={d.name} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        backgroundColor: PIE_COLORS[i], display: 'inline-block', marginRight: 4,
                      }} />
                      <Text style={{ fontSize: 12 }}>{d.name} {d.value}</Text>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* 反馈分布 — 环形图 */}
        <Col xs={24} sm={12} lg={5} style={{ display: 'flex' }}>
          <Card
            title={<Space><SmileOutlined style={{ color: COLORS.green }} />用户反馈</Space>}
            style={{ borderRadius: 14, width: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } }}
          >
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={feedbackData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {feedbackData.map((_, idx) => (
                    <Cell key={`fb-${idx}`} fill={FEEDBACK_COLORS[idx % FEEDBACK_COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip
                  formatter={(v: number) => [`${v} 条`, '']}
                  contentStyle={{ borderRadius: 10 }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                  verticalAlign="bottom"
                  height={24}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ====== 底部行 ====== */}
      <Row gutter={[16, 16]}>
        {/* 用户注册趋势 — 柱状图 */}
        <Col xs={24} lg={14}>
          <Card
            title={<Space><UserOutlined style={{ color: COLORS.purple }} />新用户注册（近 7 天）</Space>}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                新增 {trend.userTrend.reduce((s, i) => s + i.count, 0)} 人
              </Text>
            }
            style={{ borderRadius: 14 }}
          >
            {trend.userTrend.length === 0 ? (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trend.userTrend} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={36} />
                  <ReTooltip
                    labelFormatter={(l) => `日期: ${l}`}
                    formatter={(v: number) => [`${v} 人`, '注册量']}
                    contentStyle={{ borderRadius: 10 }}
                  />
                  <Bar
                    dataKey="count"
                    fill={COLORS.purple}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* 系统健康度 + 快捷入口 */}
        <Col xs={24} lg={10}>
          <Card
            title={<Space><CheckCircleOutlined style={{ color: COLORS.green }} />系统状态</Space>}
            style={{ borderRadius: 14 }}
          >
            {/* 文档处理进度 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text>文档就绪率</Text>
                <Text strong>
                  {stats.documentCount > 0
                    ? `${Math.round(trend.docStatus.ready / Math.max(stats.documentCount, 1) * 100)}%`
                    : '--'}
                </Text>
              </div>
              <Progress
                percent={stats.documentCount > 0
                  ? Math.round(trend.docStatus.ready / Math.max(stats.documentCount, 1) * 100)
                  : 0}
                strokeColor={{
                  '0%': COLORS.primary,
                  '100%': COLORS.mint,
                }}
                railColor="#f0f0f0"
                size={8}
              />
            </div>

            {/* 状态标签行 */}
            <Space size={[8, 8]} wrap style={{ marginBottom: 20 }}>
              <Tag icon={<CheckCircleOutlined />} color="success">
                就绪文档 {trend.docStatus.ready}
              </Tag>
              <Tag icon={<SyncOutlined spin />} color="processing">
                处理中 {trend.docStatus.processing}
              </Tag>
              <Tag icon={<CloseCircleOutlined />} color="error">
                异常文档 {trend.docStatus.error}
              </Tag>
              <Tag icon={<DatabaseOutlined />} color="cyan">
                向量块 {stats.vectorStoreSize}
              </Tag>
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            {/* 快捷入口 */}
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              快捷导航
            </Text>
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Button
                  block
                  icon={<CommentOutlined />}
                  onClick={() => navigate('/admin/chat')}
                  style={{ borderRadius: 8 }}
                >
                  问答记录
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<UserOutlined />}
                  onClick={() => navigate('/admin/users')}
                  style={{ borderRadius: 8 }}
                >
                  用户管理
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<FileTextOutlined />}
                  onClick={() => navigate('/admin/documents')}
                  style={{ borderRadius: 8 }}
                >
                  知识库管理
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  icon={<ReloadOutlined />}
                  onClick={() => fetchAll(true)}
                  loading={spinning}
                  style={{ borderRadius: 8 }}
                >
                  刷新数据
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

