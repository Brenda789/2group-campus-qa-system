# 河海大学校园问答助手 — Day2 团队开发指南

> 发布日期：2026-07-16
> 目标：完成用户管理模块（注册/登录/JWT/用户列表/启停），前后端打通

---

## 📦 环境准备（所有人通用）

### 每个人都需要安装

| 工具 | 版本 | 检查命令 |
|------|------|---------|
| JDK | 21 | `java -version` |
| Node.js | 18+ | `node -v` |
| MySQL | 8.0 | `mysql -u root -p` |
| Maven | 3.9+（IDEA 自带） | 右键 pom.xml → Maven → Reload |
| Git | 任意 | `git --version` |

### 每个人用自己的 MySQL

**不需要共享数据库。** 每个人本地 `localhost:3306`，库名统一为 `campus_qa`。

建库建表：用 Navicat/DBeaver/命令行执行仓库根目录下的 [`docs/db-schema.sql`](db-schema.sql)。

```bash
mysql -u root -p < docs/db-schema.sql
```

执行后你会得到 5 张表 + 1 个管理员账号：

| 数据库 | 用户名 | 密码 | 角色 |
|--------|--------|------|------|
| campus_qa | admin | admin123 | 管理员 |

### 配置环境变量

后端启动前必须设置 MySQL 密码环境变量：

**IDEA 里设置（推荐）：**
Run → Edit Configurations → Environment variables → 加一行：
```
MYSQL_PASSWORD=你的MySQL密码
```

**或用命令行：**
```bash
# Windows PowerShell
$env:MYSQL_PASSWORD="你的MySQL密码"
```

---

## 👥 人员分工

```
          后端 A                     后端 B
        (认证+用户CRUD)            (数据库+文档CRUD骨架)
           │                         │
           └────────┬────────────────┘
                    │
                    ▼
              你（联调负责人）
              检查接口/字段/格式
                    │
                    ▼
              前端 C
        (登录+管理后台+用户列表)
```

---

### 🔧 后端 A — 认证 + 用户管理 CRUD

**你的目标：** 登录/注册/用户列表/启停 四个接口完整可用，先用 Postman 自测通过，再交给联调。

**涉及文件：**

| 文件 | 你要做什么 |
|------|-----------|
| `entity/SysUser.java` | 检查字段和数据库列是否完全匹配 |
| `mapper/SysUserMapper.java` | 继承 BaseMapper，无需改动 |
| `service/SysUserService.java` | **核心**：注册逻辑、登录逻辑、分页查询、启停用户 |
| `dto/LoginRequest.java` | 校验注解是否够（用户名不为空、密码不为空） |
| `dto/RegisterRequest.java` | 校验注解：用户名2-50位、密码≥6位、email选填 |
| `controller/AuthController.java` | 返回 Result<T>，调用 Service |
| `controller/UserController.java` | 分页列表 / 启停 / 删除 / 当前用户信息 |

**验收标准（用 Postman 逐条测试）：**

```
✅ POST /api/auth/register
   Body: {"username":"test1","password":"123456","email":"test@qq.com"}
   返回: {"code":200,"data":1}（返回新用户ID）

✅ POST /api/auth/register（重复注册）
   Body: {"username":"test1","password":"123456"}
   返回: {"code":400,"message":"用户名已存在"}

✅ POST /api/auth/login
   Body: {"username":"admin","password":"admin123"}
   返回: {"code":200,"data":{"token":"eyJ...","username":"admin","role":"admin"}}

✅ POST /api/auth/login（错误密码）
   Body: {"username":"admin","password":"wrong"}
   返回: {"code":401,"message":"用户名或密码错误"}

✅ GET /api/user/list?page=1&size=10
   Header: Authorization: Bearer <上面拿到的token>
   返回: {"code":200,"data":{"records":[...],"total":1,"current":1,"size":10}}

✅ PUT /api/user/{id}/status
   Header: Authorization: Bearer <admin的token>
   Body: {"status":0}
   返回: {"code":200}（用户被禁用）

✅ POST /api/auth/login（用被禁用账号登录）
   返回: {"code":403,"message":"账号已停用，请联系管理员"}
```

---

### 🔧 后端 B — 数据库初始化 + 文档模块骨架

**你的目标：** 保证数据库 5 张表正确建好、文档管理接口骨架可用（上传/列表/删除），KbDocumentService 逻辑要完整。

**涉及文件：**

| 文件 | 你要做什么 |
|------|-----------|
| `docs/db-schema.sql` | **检查 5 张表 DDL 正确性**，确保 sys_user / kb_document / qa_record / conversation / message 字段齐全 |
| `entity/KbDocument.java` | 确保 `@TableField` 和 SQL 列名对齐，uploadedBy 字段映射正确 |
| `mapper/KbDocumentMapper.java` | BaseMapper 无需改 |
| `service/KbDocumentService.java` | **核心**：upload 方法（存文件 + 写数据库）、delete 方法（删文件 + 删记录）、分页列表 |
| `controller/DocumentController.java` | MultipartFile 上传接收、分页列表、删除 |

**验收标准：**

```
✅ 数据库 5 张表建好
   mysql> SHOW TABLES;
   +------------------+
   | conversation     |
   | kb_document      |
   | message          |
   | qa_record        |
   | sys_user         |
   +------------------+
   mysql> SELECT * FROM sys_user;  -- 能看到 admin 那条记录

✅ POST /api/documents（上传文件）
   FormData: file=测试文档.pdf
   Header: Authorization: Bearer <admin token>
   返回: {"code":200,"data":{"id":1,"title":"测试文档.pdf","status":"PROCESSING",...}}

✅ GET /api/documents?page=1&size=10
   返回: {"code":200,"data":{"records":[{...}],"total":1}}

✅ DELETE /api/documents/1
   返回: {"code":200}

⚠️ 普通用户调 /api/documents 返回 403
```

---

### 🎨 前端 C — 登录页 + 管理后台 + 用户列表

**你的目标：** 三块页面完整可用：登录/注册 → 管理后台壳 → 用户管理列表，对接后端真实接口。

**涉及文件：**

| 文件 | 你要做什么 |
|------|-----------|
| `services/request.ts` | 已封装好 Axios + 拦截器，**不用改** |
| `api.ts` | 已定义好所有接口调用函数，直接 `import` 用 |
| `pages/LoginPage.tsx` | 登录/注册表单，调用 `authApi.login()` / `authApi.register()`，成功后存 token 跳转 |
| `components/AdminLayout.tsx` | 侧边栏 + 顶栏 + `<Outlet />` 子路由壳，**检查菜单项是否正确** |
| `pages/UserList.tsx` | **核心**：Antd Table + 分页 + 搜索 + 启用/禁用按钮 |
| `pages/Dashboard.tsx` | 统计卡片（先接真实数据，后端只返回问答次数也好） |
| `App.tsx` | 路由配置，**确保 /admin 下的子路由正确** |

**验收标准：**

```
✅ 浏览器访问 http://localhost:5173/#/login
   看到河海蓝渐变背景 + 登录/注册卡片

✅ 用 admin/admin123 登录
   → 跳转到 http://localhost:5173/#/admin
   → 左侧看到"仪表盘""问答记录""用户管理""知识库管理"
   → 顶栏看到用户名 + 退出按钮

✅ 点击"用户管理"
   → 看到 Table 表格，列出已注册用户
   → "搜索"框输入关键词可以筛选
   → 分页器切换页面正常

✅ 点击某个启用用户的"禁用"
   → 弹出确认框 → 确认后状态变为 ⛔ 禁用

✅ 点"退出登录"
   → 清除 token → 跳回登录页

✅ 新开浏览器标签页，直接访问 http://localhost:5173/#/admin
   → 没有 token → 自动跳回登录页
```

---

## 🔗 前后端联调注意事项（重要！）

### 1. 统一响应格式 — 动了就会炸

**后端每个 Controller 方法必须返回 `Result<T>`：**

```java
// ✅ 正确
@GetMapping("/list")
public Result<Page<SysUser>> list(...) {
    return Result.success(sysUserService.pageUsers(...));
}

// ❌ 错误 — 前端拦截器不认识
@GetMapping("/list")
public List<SysUser> list(...) { ... }
```

**前端 api.ts 和 request.ts 已经做好：**

```typescript
// request.ts 响应拦截器自动取了 data 层
// 所以前端直接拿到业务数据，不需要 .data.data
const res = await userApi.list(1, 10)
// res.records  ✅  不是 res.data.records ❌
```

### 2. API 路径 — 必须一字不差

| 前端调用 | 后端必须存在的路径 | 方法 |
|---------|-------------------|------|
| `authApi.login()` | `/api/auth/login` | POST |
| `authApi.register()` | `/api/auth/register` | POST |
| `userApi.list()` | `/api/user/list` | GET |
| `userApi.toggleStatus(id, 0)` | `/api/user/{id}/status` | PUT |
| `userApi.me()` | `/api/user/me` | GET |

**后端同学注意：** Controller 的 `@RequestMapping` 前缀要和上面一致。当前代码已配好，不要改路径。

### 3. Token 传递 — 全程自动

```
登录成功 →
  后端返回 {token, username, role} →
    前端存入 localStorage →
      request.ts 请求拦截器自动给每个请求加 Authorization: Bearer <token> →
        JwtInterceptor 自动校验
```

**后端同学验证：** 在需要登录的接口上，从 `HttpServletRequest` 取用户信息：
```java
Long userId = (Long) request.getAttribute("userId");
String role = (String) request.getAttribute("role");
```

### 4. 管理员权限 — 统一用 BizException

```java
// ✅ 后端任何地方要做管理员校验，这样写：
private void checkAdmin(HttpServletRequest request) {
    String role = (String) request.getAttribute("role");
    if (!"admin".equals(role)) {
        throw new BizException(403, "仅管理员可用");
    }
}
```

前端收到 403 后，拦截器会自动弹出错误提示（message 字段的内容）。

### 5. 跨域 — 已配好，不用管

后端 `WebConfig.java` 已配 CORS，前端 Vite 已配代理 `/api` → `localhost:8000`。前后端同学都不需要额外处理。

### 6. 联调自测 — 打开浏览器 F12

```
打开 F12 → Network 标签 →
  看请求 URL 对不对 →
    看 Response 的 code 是不是 200 →
      看返回的 data 字段结构对不对
```

---

## 📋 Day2 交付检查清单（你联调用）

| # | 验收项 | 通过标准 | 负责同学 |
|---|--------|---------|---------|
| 1 | 注册 | 新用户注册成功，重复用户名返回错误 | 后端A + 前端C |
| 2 | 登录 | admin/admin123 登录成功拿到 token，错误密码被拒 | 后端A + 前端C |
| 3 | 停用登录 | 被禁用户登录返回"账号已停用" | 后端A |
| 4 | 用户列表 | 管理员看到所有用户，支持分页和搜索 | 后端A + 前端C |
| 5 | 启停用户 | 管理员可以禁/启用任意用户，状态即时更新 | 后端A + 前端C |
| 6 | 权限 | 普通用户调 /api/documents 返回 403 | 后端B |
| 7 | 文档上传 | 管理员上传文件，数据库有记录，uploads/ 有文件 | 后端B |
| 8 | 401 守卫 | 未登录访问 /admin → 跳登录页 | 前端C |
| 9 | 退出 | 退出后 token 清除，再访问 /admin 跳登录页 | 前端C |
| 10 | 数据库 | 3人都能连本地 MySQL，5 张表结构一致 | 全员 |

---

## 🚀 启动命令速查

```bash
# 后端（IDEA 里启动 CampusQaApplication，或命令行）
cd backend-spring
mvn spring-boot:run

# 前端
cd frontend-hhu
npm install    # 首次运行需要
npm run dev
```

| 服务 | 地址 |
|------|------|
| 后端 API | http://localhost:8000 |
| 前端页面 | http://localhost:5173 |
| 前端管理后台 | http://localhost:5173/#/admin |
| 健康检查 | http://localhost:8000/api/health |

---

> 有问题先在小组群里发 Postman 截图 + F12 Network 截图，不要猜。
