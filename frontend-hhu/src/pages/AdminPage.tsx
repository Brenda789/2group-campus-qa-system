import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'

/**
 * 管理后台入口
 *
 * 进入前校验 token：未登录跳 /login。
 * AdminLayout 提供侧边栏 + 顶栏壳，子页面通过 <Outlet /> 渲染。
 */
export default function AdminPage() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) navigate('/login')
  }, [token, navigate])

  return <AdminLayout />
}
