import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'

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
            <Route path="/admin/*" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  )
}
