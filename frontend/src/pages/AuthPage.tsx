import { useState, type FormEvent } from "react";
import { useAuth } from "../context/auth-context";
import { api } from "../api";
import {
  BookOpen,
  LogIn,
  UserPlus,
  Waves,
  ShieldCheck,
  Library,
  Quote,
} from "lucide-react";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface LoginPageProps {
  onToggle: () => void;
}

export function AuthPage({ onToggle }: LoginPageProps) {
  return <LoginPage onToggle={onToggle} />;
}

function LoginPage({ onToggle }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      login(data.token, data.user);
    } catch (err: unknown) {
      setError(errorMessage(err, "登录失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="auth-mark">
          <Waves size={28} />
          <span>
            河海大学
            <br />
            <small>HOHAI UNIVERSITY</small>
          </span>
        </div>
        <div className="auth-copy">
          <span>校园知识 · 汇流成河</span>
          <h1>
            把散落的信息，
            <br />
            汇成可信的答案。
          </h1>
          <p>面向河海师生的校园知识管理与智能问答平台。</p>
        </div>
        <div className="auth-principles">
          <div>
            <Library size={20} />
            <span>
              <b>校本知识</b>源自学校公开资料
            </span>
          </div>
          <div>
            <ShieldCheck size={20} />
            <span>
              <b>来源可循</b>每条回答附参考依据
            </span>
          </div>
        </div>
        <Quote className="auth-quote" size={72} />
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <span>
              <BookOpen size={18} />
            </span>
            <div>
              <small>ADMINISTRATION</small>
              <h2>登录管理后台</h2>
              <p>使用管理员账号进入知识工作台</p>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
              />
            </div>
            <div className="form-group">
              <label>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="primary-button" disabled={loading}>
              <LogIn size={18} />
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          <div className="auth-footer">
            <button className="btn-link" onClick={onToggle}>
              <UserPlus size={16} />
              还没有账号？去注册
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

interface RegisterPageProps {
  onToggle: () => void;
}

export function RegisterPage({ onToggle }: RegisterPageProps) {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.register(name, email, password);
      login(data.token, data.user);
    } catch (err: unknown) {
      setError(errorMessage(err, "注册失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="auth-mark">
          <Waves size={28} />
          <span>
            河海大学
            <br />
            <small>HOHAI UNIVERSITY</small>
          </span>
        </div>
        <div className="auth-copy">
          <span>校园知识 · 汇流成河</span>
          <h1>
            从一次提问，
            <br />
            走近一所大学。
          </h1>
          <p>创建账号，保留你的校园问答历史与学习线索。</p>
        </div>
        <Quote className="auth-quote" size={72} />
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <span>
              <UserPlus size={18} />
            </span>
            <div>
              <small>CREATE ACCOUNT</small>
              <h2>注册校园账号</h2>
              <p>填写基本信息，开启知识服务</p>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓名"
                required
                minLength={2}
              />
            </div>
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
              />
            </div>
            <div className="form-group">
              <label>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位字符"
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="primary-button" disabled={loading}>
              <UserPlus size={18} />
              {loading ? "注册中..." : "注册"}
            </button>
          </form>

          <div className="auth-footer">
            <button className="btn-link" onClick={onToggle}>
              <LogIn size={16} />
              已有账号？去登录
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
