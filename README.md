# 校园问答助手 v1.0（GitHub 演示版）

一个可直接运行和教学演示的校园知识库问答系统，覆盖用户认证、知识库
管理、文档切块、向量检索、引用式问答、历史记录和用户权限。

本仓库为**精简演示版**：

- 只保留 `knowledge-base/demo/` 下的 2 份示例文档，避免仓库过大。
- 预构建好的 Demo 向量库通过 GitHub Release Asset 分发，clone 后下载即可运行，**无需再次消耗 Embedding Token**。
- `site-snapshot/` 仅保留首页与机器人 Widget 所需的最小资源。

## 功能

- 学生注册、登录与个人问答历史
- 管理员用户角色、状态管理
- TXT、Markdown、PDF、DOCX 文档上传
- 文档解析、自动切块和本地向量索引
- 基于知识库的问答与来源引用
- SSE 流式回答
- 使用 DashScope Embedding 与通义千问生成引用式回答

## 技术栈

- 前端：React 19、TypeScript、Vite、Lucide
- 后端：FastAPI、SQLite、Pydantic
- RAG：LlamaIndex、DashScope Embedding、FAISS、TopK 检索
- 文档：pypdf、python-docx

## 快速开始

需要 Node.js 20+、Python 3.11+ 和 [uv](https://docs.astral.sh/uv/)。

### 1. Clone 仓库

```bash
git clone https://github.com/<your-name>/campus-practice.git
cd campus-practice
```

### 2. 安装依赖

```bash
# 后端
cd backend
uv sync --extra dev

# 前端
cd ../frontend
npm install
```

### 3. 配置 API Key

```bash
cd backend
cp .env.example .env
```

编辑 `.env`，填入有效的 DashScope API Key：

```dotenv
DASHSCOPE_API_KEY=your-dashscope-api-key
EMBEDDING_MODEL=text-embedding-v3
LLM_MODEL=qwen-turbo
```

> 向量库已预先构建好，**只有在你想重新构建时才需要 Embedding Token**。

### 4. 下载预构建向量库

```bash
cd ..
python scripts/download-demo-index.py <your-name>/campus-practice
```

脚本会自动从 Release `v1.0.0-demo` 下载 `campus-qa-demo-index-v1.tar.gz` 并解压到 `backend/data/llama_index_storage/`。

如果下载失败，可手动构建（会消耗 2 个文档的 Embedding Token）：

```bash
cd backend
KNOWLEDGE_BASE_DIR=../knowledge-base/demo uv run python -m app.cli
```

### 5. 启动服务

终端一：后端

```bash
cd backend
uv run uvicorn app.main:app --reload
```

终端二：前端管理后台

```bash
cd frontend
npm run dev
```

终端三：门户首页 + 机器人 Widget

```bash
cd site-snapshot
python3 -m http.server 8080
```

### 6. 访问

| 入口 | 地址 |
|---|---|
| 前台（门户首页 + 机器人） | <http://localhost:8080/index-widget.html> |
| 后台管理系统 | <http://localhost:5173/#/admin> |
| API 文档 | <http://localhost:8000/docs> |

默认管理员：

```text
admin@campus.example
admin123
```

## 验证

```bash
cd backend && uv run pytest -q
cd ../frontend && npm run lint && npm run build
```

## 项目结构

```text
campus-practice/
├── backend/            FastAPI、SQLite、RAG 与测试
├── frontend/           React 管理后台与嵌入式 Widget
├── knowledge-base/
│   └── demo/           2 份演示文档（不上传全量知识库）
├── site-snapshot/      精简后的门户首页与 Widget 资源
├── scripts/            download-demo-index.py 等辅助脚本
├── docs/               文档与界面截图
└── samples/            示例资料
```

## 说明

- `site-snapshot/` 仅保留 `index-widget.html`、机器人 Widget 及首页渲染所需的最小静态资源，大量栏目子页面已移除。
- 预构建向量库对应 `knowledge-base/demo/` 中的 2 份文档，方便 clone 后直接演示。
- 如需接入全量河海大学知识库，请将完整 `knowledge-base/` 目录放回本位置，并运行 `cd backend && uv run python -m app.cli` 重新构建索引。

快照仅用于本地教学演示，页面中的部分外部链接仍会跳转到河海大学线上站点。
