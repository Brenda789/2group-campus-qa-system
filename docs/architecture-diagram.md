# 河海大学校园问答助手 — 系统架构图

> Day 1 产出 · 2026-07-15

## 整体架构

```mermaid
graph TB
    subgraph 用户层["👤 用户层"]
        A1["🖥 官网访客<br/>PC / 移动端浏览器"]
        A2["🔧 系统管理员<br/>浏览器管理后台"]
    end

    subgraph 前端层["🎨 前端表现层 （React 19 + Ant Design + Tailwind CSS）"]
        B1["🏠 门户首页<br/>HomePage"]
        B2["🤖 浮动问答机器人<br/>ChatWidget"]
        B3["🔐 登录/注册页<br/>LoginPage"]
        B4["📊 管理后台<br/>AdminPage"]
        B5["📡 Axios API 层<br/>自动 JWT 注入"]
    end

    subgraph 网关层["🔀 网关 / 跨域"]
        C1["Nginx / CORS<br/>Vite Proxy :5173 → :8000"]
    end

    subgraph 后端层["⚙️ 后端服务层 （Spring Boot 4.0 + JDK 21）"]
        direction TB
        D0["🛡 JwtAuthFilter<br/>JWT 令牌校验"]
        D1["🔐 AuthController<br/>注册 / 登录"]
        D2["💬 ChatController<br/>问答 / 历史"]
        D3["📄 DocumentController<br/>文档管理"]
        D4["🏥 HealthController<br/>健康检查"]

        subgraph 业务层["📦 Service 业务层"]
            E1["SysUserService<br/>用户认证 · BCrypt"]
            E2["QaService<br/>问答逻辑"]
            E3["KbDocumentService<br/>文档管理"]
        end

        subgraph 数据访问层["🗄 Mapper 持久层 （MyBatis）"]
            F1["SysUserMapper"]
            F2["QaRecordMapper"]
            F3["KbDocumentMapper"]
        end
    end

    subgraph 数据层["💾 数据层"]
        G1[("🐬 MySQL 8.0<br/>campus_qa 库")]
        G2[("📁 文件存储<br/>uploads/")]
    end

    subgraph AI层["🧠 AI 能力层 （Day 3-4 接入）"]
        H1["🔍 FAISS<br/>向量检索引擎"]
        H2["📐 DashScope<br/>Embedding API"]
        H3["💡 通义千问<br/>LLM 生成"]
    end

    A1 -->|HTTPS| B1
    A1 -->|点击气泡| B2
    A2 -->|HTTPS| B3
    A2 -->|登录后| B4
    B1 & B2 & B3 & B4 --> B5
    B5 -->|REST / SSE| C1
    C1 --> D0
    D0 -->|校验通过| D1 & D2 & D3 & D4
    D1 --> E1
    D2 --> E2
    D3 --> E3
    E1 --> F1
    E2 --> F2
    E3 --> F3
    F1 & F2 & F3 --> G1
    E3 --> G2
    E2 -.->|后续版本| H1
    H1 -.-> H2
    H1 -.-> H3

    style 用户层 fill:#e6f7ff,stroke:#005BAC,stroke-width:2px,color:#000
    style 前端层 fill:#f0f5ff,stroke:#005BAC,stroke-width:2px,color:#000
    style 后端层 fill:#fff7e6,stroke:#fa8c16,stroke-width:2px,color:#000
    style 业务层 fill:#fffbe6,stroke:#faad14,stroke-width:1px,color:#000
    style 数据访问层 fill:#f6ffed,stroke:#52c41a,stroke-width:1px,color:#000
    style 数据层 fill:#f9f0ff,stroke:#722ed1,stroke-width:2px,color:#000
    style AI层 fill:#fff0f6,stroke:#eb2f96,stroke-width:1px,stroke-dasharray:5,color:#000
    style 网关层 fill:#f5f5f5,stroke:#8c8c8c,stroke-width:1px,color:#000
```

## 分层架构

```mermaid
graph LR
    subgraph 表现层["表现层 Presentation"]
        P1["React 19<br/>Ant Design 5.x<br/>Tailwind CSS"]
    end

    subgraph 应用层["应用层 Application"]
        P2["Spring Boot 4.0<br/>REST Controllers<br/>JWT Auth Filter"]
    end

    subgraph 业务层2["业务层 Business"]
        P3["Spring Service<br/>BCrypt 密码加密<br/>问答逻辑"]
    end

    subgraph 持久层["持久层 Persistence"]
        P4["MyBatis 4.x<br/>MySQL Connector<br/>HikariCP 连接池"]
    end

    subgraph 数据库["数据库"]
        P5["MySQL 8.0<br/>campus_qa"]
    end

    表现层 -->|HTTP / JSON| 应用层
    应用层 --> 业务层2
    业务层2 --> 持久层
    持久层 --> 数据库

    style 表现层 fill:#e6f7ff,stroke:#005BAC,stroke-width:2px,color:#000
    style 应用层 fill:#fff7e6,stroke:#fa8c16,stroke-width:2px,color:#000
    style 业务层2 fill:#fffbe6,stroke:#faad14,stroke-width:2px,color:#000
    style 持久层 fill:#f6ffed,stroke:#52c41a,stroke-width:2px,color:#000
    style 数据库 fill:#f9f0ff,stroke:#722ed1,stroke-width:2px,color:#000
```

## 数据流（问答请求为例）

```mermaid
sequenceDiagram
    actor User as 👤 用户
    participant Web as 🎨 React 前端
    participant API as ⚙️ Spring Boot
    participant DB as 🐬 MySQL
    participant AI as 🧠 RAG 引擎

    User->>Web: 输入问题 "图书馆几点关门？"
    Web->>Web: 检查 localStorage JWT token
    Web->>API: POST /api/chat/ask<br/>Authorization: Bearer &lt;token&gt;
    API->>API: JwtAuthFilter 校验 token
    API->>API: ChatController 接收请求
    API->>DB: qaRecordMapper.insert(question)
    API-->>Web: { answer: "...", sourceDocs: [...] }
    Web->>Web: 渲染回答 + 来源引用
    Note over AI: Day 3-4 接入向量检索<br/>DashScope Embedding<br/>通义千问 LLM 生成
```

## 项目包结构

```mermaid
graph TB
    subgraph SpringBoot["Spring Boot 后端"]
        direction LR
        SB1["entity/<br/>SysUser · KbDocument · QaRecord"]
        SB2["mapper/<br/>MyBatis 注解 SQL"]
        SB3["service/<br/>业务逻辑"]
        SB4["service/impl/<br/>业务实现"]
        SB5["controller/<br/>REST 接口"]
        SB6["dto/<br/>请求体校验"]
        SB7["config/<br/>Security · JWT Filter"]
        SB8["util/<br/>JwtUtil"]
    end

    subgraph ReactApp["React 前端"]
        direction LR
        FE1["pages/<br/>HomePage · LoginPage · AdminPage"]
        FE2["api.ts<br/>Axios 封装"]
        FE3["App.tsx<br/>路由 + Ant Design 主题"]
    end

    style SpringBoot fill:#fff7e6,stroke:#fa8c16,stroke-width:2px,color:#000
    style ReactApp fill:#e6f7ff,stroke:#005BAC,stroke-width:2px,color:#000
```

---

## 技术选型总览

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 19.x / 5.x |
| UI 组件库 | Ant Design | 5.x |
| CSS 框架 | Tailwind CSS | 4.x |
| HTTP 客户端 | Axios | latest |
| 路由 | React Router DOM | 7.x |
| 后端框架 | Spring Boot | 4.0.0 |
| 语言 | Java (JDK) | 21 LTS |
| ORM | MyBatis Spring Boot Starter | 4.0.x |
| 数据库 | MySQL | 8.0 |
| 安全 | Spring Security + JWT (jjwt) | 0.12.x |
| 构建工具 | Maven Wrapper | 内置 |
| 工具库 | Lombok | 注入 |
| AI 引擎 | DashScope + FAISS | Day 3-4 接入 |

---

*架构图结束 — 河海大学校园问答助手 v1.0*
