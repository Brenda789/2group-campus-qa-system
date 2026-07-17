import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import Dashboard from './pages/Dashboard'
import UserList from './pages/UserList'
import DocumentManage from './pages/DocumentManage'
import ChatHistory from './pages/ChatHistory'
import ProfilePage from './pages/ProfilePage'
import { useAuth, AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'

const hhuTheme = {
  token: {
    /* Airbnb Rausch Red 作为主品牌色 */
    colorPrimary: '#ff385c',
    colorPrimaryBg: '#fff0f3',
    colorPrimaryBgHover: '#ffe0e6',
    colorPrimaryBorder: '#ffb3bf',
    colorPrimaryHover: '#e00b41',
    colorPrimaryActive: '#c70030',
    /* Airbnb 圆角系统 */
    borderRadius: 8,
    borderRadiusLG: 14,
    /* Airbnb 表面颜色 */
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f7f8fa',
    /* Airbnb 文字系统 — 暖近黑 #222222 */
    colorText: '#222222',
    colorTextSecondary: '#6a6a6a',
    colorBorder: '#e0e0e0',
    colorBorderSecondary: '#f2f2f2',
    /* Airbnb Cereal VF 字体栈 */
    fontFamily: "'Airbnb Cereal VF', Circular, -apple-system, system-ui, Roboto, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
    controlHeight: 38,
    controlHeightLG: 44,
    paddingContentHorizontal: 24,
    /* Airbnb 三层阴影 */
    boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.08) 0px 4px 8px',
    boxShadowSecondary: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.03) 0px 1px 4px, rgba(0,0,0,0.06) 0px 2px 6px',
  },
  components: {
    Card: {
      borderRadiusLG: 20,
      paddingLG: 24,
      boxShadow: 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.06) 0px 4px 8px',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#222222',
      headerSplitColor: 'transparent',
      borderRadius: 12,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(255, 56, 92, 0.22)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
      itemBorderRadius: 8,
      itemMarginInline: 8,
    },
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      controlHeightLG: 44,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 38,
      controlHeightLG: 44,
    },
    Select: {
      borderRadius: 8,
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Modal: {
      borderRadiusLG: 20,
    },
    Statistic: {
      contentFontSize: 28,
    },
  },
}

function AppRoutes() {
  const { isLoggedIn } = useAuth()

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="documents" element={<DocumentManage />} />
          <Route path="chat" element={<ChatHistory />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ConfigProvider theme={hhuTheme} locale={zhCN}>
          <AntApp>
            <AppRoutes />
          </AntApp>
        </ConfigProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
