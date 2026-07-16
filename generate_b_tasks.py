"""生成同学B任务Word文档"""
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

doc = Document()

# ========== 样式设置 ==========
style = doc.styles['Normal']
font = style.font
font.name = '宋体'
font.size = Pt(11)
style.element.rPr.rFonts.set(qn('w:eastAsia'), '宋体')

# 标题样式
for i in range(1, 4):
    heading_style = doc.styles[f'Heading {i}']
    heading_font = heading_style.font
    heading_font.name = '微软雅黑'
    heading_style.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
    heading_font.color.rgb = RGBColor(0x1A, 0x56, 0xDB)
    if i == 1:
        heading_font.size = Pt(22)
    elif i == 2:
        heading_font.size = Pt(16)
    else:
        heading_font.size = Pt(13)

def add_code_block(doc, code_text):
    """添加代码块格式"""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.left_indent = Cm(1)
    run = p.add_run(code_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x2D, 0x2D, 0x2D)
    # 灰色背景通过 shading 实现
    shading_elm = p._element.get_or_add_pPr()
    return p

def add_bullet(doc, text, level=0):
    """添加项目符号"""
    p = doc.add_paragraph(text, style='List Bullet')
    p.paragraph_format.left_indent = Cm(1.27 + level * 1.27)
    return p

# ========== 封面 ==========
doc.add_paragraph()
doc.add_paragraph()
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('校园问答助手 — 同学B 开发任务手册')
run.font.name = '微软雅黑'
run.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
run.font.size = Pt(26)
run.font.color.rgb = RGBColor(0x1A, 0x56, 0xDB)
run.font.bold = True

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('业务功能完善 + 系统增强')
run.font.name = '微软雅黑'
run.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
run.font.size = Pt(16)
run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

doc.add_paragraph()

info = doc.add_paragraph()
info.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = info.add_run('难度：⭐⭐⭐  |  分支数：3  |  任务数：12\n更新日期：2026-07-16')
run.font.size = Pt(11)
run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

doc.add_page_break()

# ========== 目录占位 ==========
doc.add_heading('目录', level=1)
toc_items = [
    '一、总目标与分工说明',
    '二、分支1：feature/user-system（用户系统完善）',
    '    B1 修改密码',
    '    B2 用户信息修改',
    '    B3 密码复杂度校验',
    '    B4 登录失败限流',
    '    B5 密文传输密码（可选）',
    '三、分支2：feature/qa-enhance（问答功能增强）',
    '    B6 问答点赞/踩',
    '    B7 问答搜索',
    '    B8 知识库公开搜索',
    '    B9 管理员仪表盘真实数据',
    '四、分支3：feature/doc-system（文档 + 测试 + Swagger）',
    '    B10 Swagger/Knife4j 接口文档',
    '    B11 接口单元测试',
    '    B12 接口参数校验补充',
    '五、任务总览表',
    '六、建议开发顺序',
    '七、分支操作指南',
    '八、与 AI 协作提示',
]
for item in toc_items:
    p = doc.add_paragraph(item)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(2)

doc.add_page_break()

# ========== 一、总目标 ==========
doc.add_heading('一、总目标与分工说明', level=1)

doc.add_paragraph(
    '本项目采用两人协作开发模式。A 同学负责 RAG 核心引擎（技术难度高，偏算法/架构，涉及外部 AI 服务），'
    'B 同学（你）负责业务功能完善 + 系统增强（偏业务逻辑/CRUD，涉及用户体验）。'
    '两人的工作互不阻塞，可以完全并行开发。'
)

doc.add_paragraph(
    '你的总目标：完善用户体验、权限控制、接口文档，让系统具备可交付使用的完整度。'
)

# 当前项目状态
doc.add_heading('当前项目技术栈', level=2)
table = doc.add_table(rows=8, cols=2, style='Light Grid Accent 1')
table.alignment = WD_TABLE_ALIGNMENT.CENTER
data = [
    ('层级', '技术'),
    ('框架', 'Spring Boot 4.0.0'),
    ('Java', 'JDK 21'),
    ('ORM', 'MyBatis-Plus 3.5.15'),
    ('数据库', 'MySQL 8.0'),
    ('认证', 'JWT (jjwt 0.12.6)'),
    ('加密', 'BCrypt (spring-security-crypto)'),
    ('前端', 'React + Vite + antd 6'),
]
for i, (k, v) in enumerate(data):
    table.rows[i].cells[0].text = k
    table.rows[i].cells[1].text = v

doc.add_paragraph()

doc.add_heading('你涉及的关键文件一览', level=2)
files = [
    'UserController.java — 用户管理接口（新增修改密码、修改资料）',
    'SysUserService.java — 用户业务逻辑（新增改密、限流）',
    'RegisterRequest.java — 注册请求 DTO（加强密码校验）',
    'ChatController.java — 问答接口（新增点赞踩、搜索）',
    'QaService.java — 问答业务逻辑（新增 feedback、搜索）',
    'QaRecord.java — 问答实体（新增 feedback 字段）',
    'DocumentController.java — 文档接口（新增公开搜索）',
    'KbDocumentService.java — 文档业务逻辑（新增搜索方法）',
    'pom.xml — Maven 依赖（加 Knife4j）',
    'db-schema.sql — 数据库脚本（加 feedback 字段）',
    'application.properties — 应用配置（可能需要加配置项）',
]
for f in files:
    add_bullet(doc, f)

doc.add_page_break()

# ========== 二、分支1：用户系统完善 ==========
doc.add_heading('二、分支1：feature/user-system（用户系统完善）', level=1)

# B1
doc.add_heading('B1：修改密码  PUT /api/user/password', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：2 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph('已登录用户可以修改自己的密码，需要验证旧密码正确后才能更新。')

doc.add_paragraph('具体逻辑：').bold = True
add_bullet(doc, '接收 JSON：{"oldPassword": "xxx", "newPassword": "yyy"}')
add_bullet(doc, '从 request.getAttribute("userId") 获取当前用户 ID')
add_bullet(doc, '用 BCryptPasswordEncoder.matches() 验证旧密码是否正确')
add_bullet(doc, '新密码不能和旧密码一样')
add_bullet(doc, '新密码 6-20 位')
add_bullet(doc, '用 BCryptPasswordEncoder.encode() 加密新密码后更新')

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'UserController.java（backend-spring/src/main/java/com/hhu/campusqa/controller/UserController.java）— 新增接口方法')
add_bullet(doc, 'SysUserService.java（backend-spring/src/main/java/com/hhu/campusqa/service/SysUserService.java）— 新增 changePassword() 方法')

doc.add_paragraph('参考写法：').bold = True
doc.add_paragraph(
    '可参考 UserController 中已有的 /api/user/{id}/status 接口写法，'
    '以及 AuthController 中 passwordEncoder 的使用方式。'
)

doc.add_paragraph()

# B2
doc.add_heading('B2：用户信息修改  PUT /api/user/profile', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：2 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph('已登录用户可以修改自己的个人信息（如邮箱），用户名不可修改。')

doc.add_paragraph('具体逻辑：').bold = True
add_bullet(doc, '接收 JSON：{"email": "newemail@example.com"}')
add_bullet(doc, '从 request.getAttribute("userId") 获取当前用户 ID')
add_bullet(doc, '只允许修改 email 等非关键字段，username 不允许修改')
add_bullet(doc, '更新对应 SysUser 记录')

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'UserController.java — 新增 /api/user/profile 接口')
add_bullet(doc, 'SysUserService.java — 新增 updateProfile() 方法')

doc.add_paragraph()

# B3
doc.add_heading('B3：密码复杂度校验', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：1 个').bold = True

doc.add_paragraph('现状：').bold = True
doc.add_paragraph(
    'RegisterRequest.java 当前只有 @Size(min = 6, max = 100)，'
    '只限制了最小长度 6 位，没有要求包含字母和数字，安全性不足。'
)

doc.add_paragraph('需要改为：').bold = True
doc.add_paragraph('要求 8 位以上、必须同时包含字母和数字：')
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run(
    '@NotBlank\n'
    '@Size(min = 8, max = 100)\n'
    '@Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\\\d).+$",\n'
    '         message = "密码必须包含字母和数字")\n'
    'private String password;'
)
run.font.name = 'Consolas'
run.font.size = Pt(9.5)

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'RegisterRequest.java（backend-spring/src/main/java/com/hhu/campusqa/dto/RegisterRequest.java）— 只改这一个文件，替换 password 字段的注解')

doc.add_paragraph()

# B4
doc.add_heading('B4：登录失败限流', level=2)
doc.add_paragraph('工作量：中  |  涉及文件：1-2 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph('防止暴力破解，同一 IP 连续登录失败 5 次后，锁定 15 分钟不可再试。')

doc.add_paragraph('技术方案：').bold = True
add_bullet(doc, '使用 ConcurrentHashMap<String, LoginAttempt> 做内存缓存')
add_bullet(doc, 'LoginAttempt 记录：失败次数、首次失败时间、锁定到期时间')
add_bullet(doc, '在 SysUserService.login() 方法开头加校验逻辑')
add_bullet(doc, '登录成功时清除该 IP 的失败记录')
add_bullet(doc, '可选用 Redis 替代内存缓存（若环境支持）')

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'SysUserService.java — 加限流逻辑')
add_bullet(doc, '可能需要在 common/ 下新建一个 LoginAttemptCache 类')

doc.add_paragraph()

# B5
doc.add_heading('B5：密文传输密码（可选，加分项）', level=2)
doc.add_paragraph('工作量：中  |  重要程度：⭐ 可选').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph(
    '前端用 RSA 公钥加密密码后再通过 HTTP 传输，后端用 RSA 私钥解密后再 BCrypt 加密存入数据库。'
    '解决密码在 HTTP 请求体中明文传输的安全隐患。'
)

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, '前端：登录/注册页面加 RSA 加密逻辑（JSEncrypt）')
add_bullet(doc, '后端：新增 RSA 密钥对配置，AuthController/SysUserService 加解密步骤')
add_bullet(doc, '此项涉及前后端协作，时间不够可先跳过')

doc.add_page_break()

# ========== 三、分支2：问答功能增强 ==========
doc.add_heading('三、分支2：feature/qa-enhance（问答功能增强）', level=1)

# B6
doc.add_heading('B6：问答点赞/踩  PUT /api/chat/{id}/feedback', level=2)
doc.add_paragraph('工作量：中  |  涉及文件：4 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph('用户可以对某条问答记录进行点赞（👍）或踩（👎），也可以取消评价。')

doc.add_paragraph('实现步骤：').bold = True

doc.add_paragraph('步骤1 — 数据库加字段：').bold = True
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run(
    '-- 在 campus_qa 数据库执行\n'
    'ALTER TABLE qa_record\n'
    '  ADD COLUMN feedback TINYINT DEFAULT 0\n'
    '  COMMENT \'评价：1=赞 / -1=踩 / 0=无\';'
)
run.font.name = 'Consolas'
run.font.size = Pt(9)

doc.add_paragraph('步骤2 — 实体类加字段（QaRecord.java）：').bold = True
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run('private Integer feedback;  // 1=赞 -1=踩 0=无')
run.font.name = 'Consolas'
run.font.size = Pt(9.5)

doc.add_paragraph('步骤3 — Controller 加接口（ChatController.java）：').bold = True
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run(
    '@PutMapping("/{id}/feedback")\n'
    'public Result<Void> feedback(\n'
    '    @PathVariable Long id,\n'
    '    @RequestBody Map<String, Integer> body,\n'
    '    HttpServletRequest request) {\n'
    '    Long userId = (Long) request.getAttribute("userId");\n'
    '    Integer feedback = body.get("feedback");\n'
    '    // 校验 feedback 值只能是 -1, 0, 1\n'
    '    qaService.updateFeedback(id, userId, feedback);\n'
    '    return Result.success();\n'
    '}'
)
run.font.name = 'Consolas'
run.font.size = Pt(9)

doc.add_paragraph('步骤4 — Service 加方法（QaService.java）：').bold = True
add_bullet(doc, '校验该 qa_record 的 userId 是否等于当前用户（只能评价自己的问答）')
add_bullet(doc, '更新 feedback 字段')
add_bullet(doc, '若记录不存在，抛出 BizException')

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'db-schema.sql — ALTER TABLE 加字段')
add_bullet(doc, 'QaRecord.java — 实体加 feedback 属性')
add_bullet(doc, 'ChatController.java — 新增 /api/chat/{id}/feedback 接口')
add_bullet(doc, 'QaService.java — 新增 updateFeedback() 方法')

doc.add_paragraph()

# B7
doc.add_heading('B7：问答搜索  GET /api/chat/history?keyword=xxx', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：2 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph('用户在查看自己的问答历史时，可以按问题关键词进行搜索。')

doc.add_paragraph('现状：').bold = True
doc.add_paragraph(
    'ChatController.history() 和 QaService.getHistory() 目前只按 userId 查询，不支持关键词过滤。'
)

doc.add_paragraph('改为：').bold = True
add_bullet(doc, 'ChatController.history() 增加 @RequestParam(required = false) String keyword 参数')
add_bullet(doc, 'QaService.getHistory() 加 keyword 参数，用 LambdaQueryWrapper.like(QaRecord::getQuestion, keyword) 做模糊匹配')
add_bullet(doc, 'keyword 为空时保持原有行为（查全部）')

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'ChatController.java — history() 加 keyword 参数')
add_bullet(doc, 'QaService.java — getHistory() 加 keyword 参数和模糊查询逻辑')

doc.add_paragraph()

# B8
doc.add_heading('B8：知识库公开搜索  GET /api/documents/search?keyword=xxx', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：2 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph('所有登录用户可以按标题搜索知识库文档，不需要管理员权限。')

doc.add_paragraph('现状：').bold = True
doc.add_paragraph(
    'DocumentController.list() 有 checkAdmin(request) 校验，普通用户无法查看文档列表。'
)

doc.add_paragraph('改为：').bold = True
add_bullet(doc, '新增 DocumentController.search() 方法，不需要 checkAdmin 校验')
add_bullet(doc, 'KbDocumentService 新增 searchDocuments(keyword) 方法')
add_bullet(doc, '用 LambdaQueryWrapper.like(KbDocument::getTitle, keyword) 做标题模糊匹配')
add_bullet(doc, '只返回 status=READY 的文档（已处理完成的文档）')

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'DocumentController.java — 新增 GET /api/documents/search 接口')
add_bullet(doc, 'KbDocumentService.java — 新增 searchDocuments() 方法')

doc.add_paragraph()

# B9
doc.add_heading('B9：管理员仪表盘真实数据  GET /api/admin/stats', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：1-2 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph('为管理员仪表盘提供系统概览统计数据，替换前端可能存在的硬编码假数据。')

doc.add_paragraph('返回数据格式：').bold = True
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run(
    '{\n'
    '  "code": 200,\n'
    '  "data": {\n'
    '    "userCount": 150,        // 用户总数\n'
    '    "documentCount": 32,     // 知识库文档总数\n'
    '    "qaCount": 1280,         // 问答记录总数\n'
    '    "todayQaCount": 45       // 今日问答数\n'
    '  }\n'
    '}'
)
run.font.name = 'Consolas'
run.font.size = Pt(9)

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, '可在 UserController 中新增 GET /api/admin/stats 接口，或新建 AdminController.java')
add_bullet(doc, '在对应的 Mapper 中写 COUNT 查询（可直接用 MyBatis-Plus 的 count() 方法）')

doc.add_page_break()

# ========== 四、分支3：文档+测试+Swagger ==========
doc.add_heading('四、分支3：feature/doc-system（文档 + 测试 + Swagger）', level=1)

# B10
doc.add_heading('B10：Swagger/Knife4j 接口文档', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：2 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph(
    '集成 Knife4j（Swagger 增强版），自动扫描所有 Controller 生成 API 文档页面，'
    '访问 http://localhost:8000/doc.html 即可查看和在线调试所有接口。方便前端同学对接。'
)

doc.add_paragraph('步骤1 — pom.xml 加依赖：').bold = True
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run(
    '<!-- Knife4j API 文档 -->\n'
    '<dependency>\n'
    '    <groupId>com.github.xiaoymin</groupId>\n'
    '    <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>\n'
    '    <version>4.5.0</version>\n'
    '</dependency>'
)
run.font.name = 'Consolas'
run.font.size = Pt(9)

doc.add_paragraph('步骤2 — 新建配置类 Knife4jConfig.java：').bold = True
doc.add_paragraph(
    '放在 config/ 目录下，参考标准 Knife4j 配置模板，设置标题"校园问答助手 API"、'
    '版本号、扫描包路径等。'
)

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, 'pom.xml — 加 Knife4j 依赖')
add_bullet(doc, '新建 config/Knife4jConfig.java — Swagger 配置类')

doc.add_paragraph()

# B11
doc.add_heading('B11：接口单元测试', level=2)
doc.add_paragraph('工作量：中  |  涉及文件：3+ 个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph(
    '使用 Spring Boot Test + MockMvc 对核心 Controller 编写单元测试，确保接口逻辑正确。'
)

doc.add_paragraph('需要测试的 Controller：').bold = True
add_bullet(doc, 'AuthController — 注册、登录')
add_bullet(doc, 'UserController — 用户列表、启停、修改密码、修改资料')
add_bullet(doc, 'ChatController — 提问、历史、会话管理、点赞踩')

doc.add_paragraph('测试要点：').bold = True
add_bullet(doc, '正常场景：传正确参数，验证返回 code=200')
add_bullet(doc, '异常场景：传错误参数/无权限，验证返回对应错误码')
add_bullet(doc, '使用 @SpringBootTest + @AutoConfigureMockMvc')
add_bullet(doc, 'JWT 认证可用 @WithMockUser 或手动设置 Header')

doc.add_paragraph('涉及文件：').bold = True
add_bullet(doc, '新建 src/test/java/com/hhu/campusqa/controller/AuthControllerTest.java')
add_bullet(doc, '新建 src/test/java/com/hhu/campusqa/controller/UserControllerTest.java')
add_bullet(doc, '新建 src/test/java/com/hhu/campusqa/controller/ChatControllerTest.java')

doc.add_paragraph()

# B12
doc.add_heading('B12：接口参数校验补充', level=2)
doc.add_paragraph('工作量：小  |  涉及文件：多个').bold = True

doc.add_paragraph('功能描述：').bold = True
doc.add_paragraph(
    '全面检查所有 Controller 接口，确保请求参数都有合理的校验注解，'
    '防止非法数据进入业务层。'
)

doc.add_paragraph('检查清单：').bold = True
add_bullet(doc, '所有 @RequestBody 参数是否加了 @Valid 注解')
add_bullet(doc, '所有 DTO 字段是否有合理的校验（@NotBlank、@Size、@Email 等）')
add_bullet(doc, '@RequestParam 是否有默认值或必填标记')
add_bullet(doc, '@PathVariable 是否有空值校验')
add_bullet(doc, 'LoginRequest：username 和 password 都要 @NotBlank')
add_bullet(doc, 'RegisterRequest：password 使用 B3 改后的正则校验')
add_bullet(doc, 'ChatRequest：question 需要 @NotBlank + @Size(min=1, max=2000)')

doc.add_paragraph('涉及文件（逐个检查）：').bold = True
add_bullet(doc, 'AuthController.java + LoginRequest.java + RegisterRequest.java')
add_bullet(doc, 'ChatController.java + ChatRequest.java')
add_bullet(doc, 'UserController.java — 所有接口的 @RequestBody 参数')
add_bullet(doc, 'DocumentController.java — 上传参数校验')

doc.add_page_break()

# ========== 五、任务总览表 ==========
doc.add_heading('五、任务总览表', level=1)

table = doc.add_table(rows=14, cols=5, style='Light Grid Accent 1')
table.alignment = WD_TABLE_ALIGNMENT.CENTER

headers = ['分支', '编号', '任务名称', '难度', '涉及文件数']
for i, h in enumerate(headers):
    cell = table.rows[0].cells[i]
    cell.text = h
    for p in cell.paragraphs:
        for run in p.runs:
            run.font.bold = True
            run.font.size = Pt(10)

rows_data = [
    ('feature/user-system', 'B1', '修改密码', '小', '2'),
    ('feature/user-system', 'B2', '用户信息修改', '小', '2'),
    ('feature/user-system', 'B3', '密码复杂度校验', '小', '1'),
    ('feature/user-system', 'B4', '登录失败限流', '中', '1-2'),
    ('feature/user-system', 'B5', '密文传输密码（可选）', '中', '多'),
    ('feature/qa-enhance', 'B6', '问答点赞/踩', '中', '4'),
    ('feature/qa-enhance', 'B7', '问答搜索', '小', '2'),
    ('feature/qa-enhance', 'B8', '知识库公开搜索', '小', '2'),
    ('feature/qa-enhance', 'B9', '仪表盘真实数据', '小', '1-2'),
    ('feature/doc-system', 'B10', 'Swagger 接口文档', '小', '2'),
    ('feature/doc-system', 'B11', '接口单元测试', '中', '3+'),
    ('feature/doc-system', 'B12', '参数校验补充', '小', '多个'),
    ('—', '—', '合计：12 个任务', '—', '—'),
]
for i, row_data in enumerate(rows_data):
    for j, cell_text in enumerate(row_data):
        table.rows[i + 1].cells[j].text = cell_text

doc.add_paragraph()

# ========== 六、建议开发顺序 ==========
doc.add_heading('六、建议开发顺序', level=1)

doc.add_paragraph('原则：先简单后复杂，先改少文件再多文件，每一步改完就测试，确认没问题再 commit。')

order = [
    ('第1步', 'B3 密码复杂度校验', '1 个文件，改一行注解，立竿见影'),
    ('第2步', 'B1 修改密码', '2 个文件，锻炼 Controller + Service 协作'),
    ('第3步', 'B2 用户信息修改', '2 个文件，和 B1 模式类似，趁热打铁'),
    ('第4步', 'B4 登录失败限流', '1-2 个文件，学习缓存和限流逻辑'),
    ('第5步', 'B7 问答搜索', '2 个文件，学习 MyBatis-Plus 模糊查询'),
    ('第6步', 'B8 知识库公开搜索', '2 个文件，和 B7 类似，巩固模糊查询'),
    ('第7步', 'B6 问答点赞/踩', '4 个文件，涉及 DB 变更 + 实体 + Controller + Service 全链路'),
    ('第8步', 'B9 仪表盘数据', '1-2 个文件，统计查询'),
    ('第9步', 'B10 Swagger 文档', '2 个文件，加依赖 + 配置类即可'),
    ('第10步', 'B12 参数校验补充', '多文件巡检，加固系统'),
    ('第11步', 'B11 单元测试', '对之前写的接口写测试，验证正确性'),
    ('可选', 'B5 密文传输', '如有时间再做，加分项'),
]

table = doc.add_table(rows=len(order) + 1, cols=3, style='Light Grid Accent 1')
table.alignment = WD_TABLE_ALIGNMENT.CENTER
for i, h in enumerate(['顺序', '任务', '理由']):
    table.rows[0].cells[i].text = h
    for p in table.rows[0].cells[i].paragraphs:
        for run in p.runs:
            run.font.bold = True
for i, (step, task, reason) in enumerate(order):
    table.rows[i + 1].cells[0].text = step
    table.rows[i + 1].cells[1].text = task
    table.rows[i + 1].cells[2].text = reason

doc.add_page_break()

# ========== 七、分支操作指南 ==========
doc.add_heading('七、分支操作指南', level=1)

doc.add_heading('分支创建（第一天）', level=2)
p = doc.add_paragraph()
run = p.add_run(
    'git checkout main\n'
    'git pull origin main\n'
    '\n'
    '# 创建你的三个分支（先做第一个，后续分支按需创建）\n'
    'git checkout -b feature/user-system\n'
    '# git checkout -b feature/qa-enhance\n'
    '# git checkout -b feature/doc-system'
)
run.font.name = 'Consolas'
run.font.size = Pt(9.5)

doc.add_heading('日常开发循环', level=2)
p = doc.add_paragraph()
run = p.add_run(
    '# 写完一个功能点\n'
    'git add .\n'
    'git commit -m "feat: 新增修改密码功能"\n'
    '\n'
    '# 推送到远程（队友可以看到你的进度）\n'
    'git push -u origin feature/user-system   # 第一次\n'
    'git push                                 # 之后'
)
run.font.name = 'Consolas'
run.font.size = Pt(9.5)

doc.add_heading('同步 main 最新代码', level=2)
p = doc.add_paragraph()
run = p.add_run(
    'git checkout main\n'
    'git pull origin main\n'
    'git checkout feature/user-system\n'
    'git merge main            # 合并 main 的更新\n'
    '# 如有冲突，解决后 git add . && git commit -m "merge: 合并 main"'
)
run.font.name = 'Consolas'
run.font.size = Pt(9.5)

doc.add_heading('提交信息规范', level=2)
add_bullet(doc, 'feat: 新增XXX功能（新功能）')
add_bullet(doc, 'fix: 修复XXX问题（Bug 修复）')
add_bullet(doc, 'refactor: 重构XXX（代码优化）')
add_bullet(doc, 'docs: 更新文档')
add_bullet(doc, 'test: 添加测试')

doc.add_page_break()

# ========== 八、与 AI 协作提示 ==========
doc.add_heading('八、与 AI 协作提示', level=1)

doc.add_paragraph('核心原则：把 AI 当成你的结对编程搭档，说清楚"我要做什么 → 在哪个文件做 → 期望什么结果"。')

doc.add_heading('好的提问模板', level=2)
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run(
    '✅ "在 UserController 里加一个 PUT /api/user/password 接口，\n'
    '   参考已有的 /api/user/{id}/status 写法，\n'
    '   接收 {oldPassword, newPassword}，\n'
    '   用 BCryptPasswordEncoder 验证旧密码，加密新密码后更新数据库。"\n'
    '\n'
    '❌ "加个改密码功能"'
)
run.font.name = 'Consolas'
run.font.size = Pt(9.5)

doc.add_heading('调试求助模板', level=2)
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
run = p.add_run(
    '"调用 POST /api/auth/login 时报 500 错误，\n'
    ' 参数是 {"username":"admin","password":"admin123"}，\n'
    ' stack trace: org.springframework.jdbc.CannotGetJdbcConnectionException...\n'
    ' 我检查了 MySQL 是运行的，application.properties 里的密码是对的"'
)
run.font.name = 'Consolas'
run.font.size = Pt(9.5)

doc.add_heading('推荐工作节奏', level=2)
add_bullet(doc, '打开需要修改的文件（让 AI 看到上下文）')
add_bullet(doc, '告诉 AI 你的具体需求（越详细越好）')
add_bullet(doc, 'AI 写代码')
add_bullet(doc, '你自己 Review 代码，运行测试')
add_bullet(doc, '如果有问题，把报错信息直接发给 AI')
add_bullet(doc, '确认没问题后 git commit')

doc.add_paragraph()
doc.add_paragraph()

# 页脚信息
footer = doc.add_paragraph()
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = footer.add_run('— 河海大学校园问答助手 · 同学B 任务手册 · 2026-07-16 —')
run.font.size = Pt(9)
run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

# 保存
output_path = '同学B-开发任务手册.docx'
doc.save(output_path)
print(f'文档已生成：{output_path}')
