import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/auth-context";
import { api } from "../api";
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Loader,
  Search,
  UserRoundCheck,
  ShieldCheck,
} from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export function UsersPage() {
  const { token, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.users.list(token);
      setUsers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleRole = async (user: UserItem) => {
    if (!token) return;
    const newRole = user.role === "ADMIN" ? "STUDENT" : "ADMIN";
    try {
      await api.users.update(token, user.id, newRole, undefined);
      await loadUsers();
    } catch {
      // ignore
    }
  };

  const toggleActive = async (user: UserItem) => {
    if (!token) return;
    try {
      await api.users.update(token, user.id, undefined, !user.is_active);
      await loadUsers();
    } catch {
      // ignore
    }
  };

  if (!isAdmin()) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>用户管理</h1>
        </div>
        <p className="no-access">只有管理员可以管理用户</p>
      </div>
    );
  }

  const visibleUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const activeCount = users.filter((user) => user.is_active).length;

  return (
    <div className="admin-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">IDENTITY & ACCESS</span>
          <h1>用户与权限</h1>
          <p>查看校园用户，维护账号状态与管理权限。</p>
        </div>
        <span className="page-index">03</span>
      </header>
      <section className="metric-strip">
        <div>
          <Users size={20} />
          <span>
            <b>{users.length}</b>用户总数
          </span>
        </div>
        <div>
          <UserRoundCheck size={20} />
          <span>
            <b>{activeCount}</b>正常账号
          </span>
        </div>
        <div>
          <ShieldCheck size={20} />
          <span>
            <b>{adminCount}</b>管理员
          </span>
        </div>
      </section>
      <div className="list-toolbar">
        <div>
          <h2>用户目录</h2>
          <span>角色与账号状态实时生效</span>
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索姓名或邮箱"
          />
        </label>
      </div>

      {loading ? (
        <div className="loading">
          <Loader size={24} className="spin" /> 加载中...
        </div>
      ) : (
        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>姓名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    暂无用户
                  </td>
                </tr>
              )}
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role.toLowerCase()}`}>
                      {user.role === "ADMIN" ? (
                        <>
                          <Shield size={12} /> 管理员
                        </>
                      ) : (
                        <>
                          <Users size={12} /> 学生
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${user.is_active ? "active" : "inactive"}`}
                    >
                      {user.is_active ? (
                        <>
                          <UserCheck size={12} /> 启用
                        </>
                      ) : (
                        <>
                          <UserX size={12} /> 停用
                        </>
                      )}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleString("zh-CN")}</td>
                  <td>
                    <div className="actions">
                      <button onClick={() => toggleRole(user)}>
                        {user.role === "ADMIN" ? "设为学生" : "设为管理员"}
                      </button>
                      <button onClick={() => toggleActive(user)}>
                        {user.is_active ? "停用" : "启用"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
