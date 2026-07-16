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

/** 河海大学主题色 */
const hhuTheme = {
  token: {
    colorPrimary: '#005BAC',
    borderRadius: 6,
    colorBgContainer: '#ffffff',
  },
}

export default function App() {
  return (
    <ConfigProvider theme={hhuTheme} locale={zhCN}>
      <AntApp>
        <HashRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* 管理后台 — AdminPage 是父路由壳，子页面由 AdminLayout 的 <Outlet /> 渲染 */}
            <Route path="/admin" element={<AdminPage />}>
              <Route index element={<Dashboard />} />
              <Route path="users" element={<UserList />} />
              <Route path="documents" element={<DocumentManage />} />
              <Route path="chat" element={<ChatHistory />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  )
}
