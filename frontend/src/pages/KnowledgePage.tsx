import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useAuth } from "../context/auth-context";
import { api } from "../api";
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Loader,
  Database,
  Layers3,
  CircleCheck,
  Search,
} from "lucide-react";

interface Document {
  id: number;
  title: string;
  filename: string;
  status: string;
  chunk_count: number;
  size: number;
  created_at: string;
  error: string | null;
}

export function KnowledgePage() {
  const { token, isAdmin } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.documents.list(token);
      setDocuments(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !token) return;

    setUploading(true);
    try {
      await api.documents.upload(token, title.trim(), file);
      setTitle("");
      setFile(null);
      await loadDocuments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm("确定删除此文档？")) return;
    try {
      await api.documents.delete(token, id);
      await loadDocuments();
    } catch {
      // ignore
    }
  };

  const handleReprocess = async (id: number) => {
    if (!token) return;
    try {
      await api.documents.reprocess(token, id);
      await loadDocuments();
    } catch {
      // ignore
    }
  };

  if (!isAdmin()) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>知识库</h1>
        </div>
        <p className="no-access">只有管理员可以管理知识库文档</p>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const visibleDocuments = documents.filter((doc) =>
    `${doc.title} ${doc.filename}`.toLowerCase().includes(query.toLowerCase()),
  );
  const readyCount = documents.filter((doc) => doc.status === "READY").length;
  const chunkCount = documents.reduce((sum, doc) => sum + doc.chunk_count, 0);

  return (
    <div className="admin-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">KNOWLEDGE ARCHIVE</span>
          <h1>知识库管理</h1>
          <p>维护校园知识来源，追踪文档处理与索引状态。</p>
        </div>
        <span className="page-index">02</span>
      </header>

      <section className="metric-strip">
        <div>
          <Database size={20} />
          <span>
            <b>{documents.length}</b>资料总数
          </span>
        </div>
        <div>
          <CircleCheck size={20} />
          <span>
            <b>{readyCount}</b>可检索文档
          </span>
        </div>
        <div>
          <Layers3 size={20} />
          <span>
            <b>{chunkCount.toLocaleString()}</b>知识片段
          </span>
        </div>
      </section>

      <form className="upload-form" onSubmit={handleUpload}>
        <div className="section-title">
          <div>
            <span>资料入库</span>
            <h2>添加新的知识来源</h2>
          </div>
          <p>支持 TXT、Markdown、PDF、DOCX，单文件不超过 10MB</p>
        </div>
        <div className="upload-row">
          <input
            type="text"
            placeholder="输入资料标题，例如：本科生奖学金管理办法"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <label className="file-picker">
            <FileText size={18} />
            <span>{file ? file.name : "选择资料文件"}</span>
            <input
              type="file"
              accept=".txt,.md,.pdf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </label>
          <button type="submit" disabled={uploading}>
            <Upload size={16} />
            {uploading ? "上传中..." : "上传"}
          </button>
        </div>
      </form>

      <div className="list-toolbar">
        <div>
          <h2>资料目录</h2>
          <span>共 {documents.length} 条记录</span>
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题或文件名"
          />
        </label>
      </div>

      {loading ? (
        <div className="loading">
          <Loader size={24} className="spin" /> 加载中...
        </div>
      ) : (
        <div className="document-list">
          {visibleDocuments.length === 0 && (
            <p className="empty">没有找到匹配的资料</p>
          )}
          {visibleDocuments.map((doc) => (
            <div key={doc.id} className="document-card">
              <div className="doc-info">
                <span className="doc-icon">
                  <FileText size={19} />
                </span>
                <div className="doc-meta">
                  <span className="doc-title">{doc.title}</span>
                  <span className="doc-detail">
                    {doc.filename} · {formatSize(doc.size)} · {doc.chunk_count}{" "}
                    片段
                  </span>
                </div>
                <span className={`doc-status ${doc.status.toLowerCase()}`}>
                  {doc.status === "READY"
                    ? "就绪"
                    : doc.status === "PROCESSING"
                      ? "处理中"
                      : "错误"}
                </span>
              </div>
              <div className="doc-actions">
                <button
                  onClick={() => handleReprocess(doc.id)}
                  title="重新处理"
                >
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => handleDelete(doc.id)} title="删除">
                  <Trash2 size={14} />
                </button>
              </div>
              {doc.error && <div className="doc-error">{doc.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
