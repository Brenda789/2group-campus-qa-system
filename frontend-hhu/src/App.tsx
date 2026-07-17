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
import { useAuth, AuthProvider } from './contexts/AuthContext'

const hhuTheme = {
  token: {
    colorPrimary: '#005BAC',
    colorPrimaryBg: '#edf6ff',
    colorPrimaryBgHover: '#dceeff',
    colorPrimaryBorder: '#8db8e0',
    colorPrimaryHover: '#1a6fc4',
    colorPrimaryActive: '#004a8f',
    borderRadius: 10,
    borderRadiusLG: 14,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f4f9',
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    colorBorderSecondary: '#f3f4f6',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: 14,
    controlHeight: 38,
    controlHeightLG: 44,
    paddingContentHorizontal: 24,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 4px 14px rgba(0, 0, 0, 0.06)',
  },
  components: {
    Card: {
      borderRadiusLG: 16,
      paddingLG: 24,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
    },
    Table: {
      headerBg: '#f7faff',
      headerColor: '#374151',
      headerSplitColor: 'transparent',
      borderRadius: 12,
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(0, 91, 172, 0.30)',
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
      borderRadiusLG: 16,
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
        </Route>
        <Route path="*" element={<Navigate to={isLoggedIn ? '/' : '/login'} replace />} />
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ConfigProvider theme={hhuTheme} locale={zhCN}>
        <AntApp>
          <AppRoutes />
        </AntApp>
      </ConfigProvider>
    </AuthProvider>
  )
}
