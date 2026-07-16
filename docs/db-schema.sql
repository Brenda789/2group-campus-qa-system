-- ============================================================
-- 河海大学校园问答助手 — 数据库建表脚本（MySQL 8.0）
-- Day 2 产出：5 张表，含会话/消息支持
-- ============================================================

CREATE DATABASE IF NOT EXISTS campus_qa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campus_qa;

-- -----------------------------------------------------------
-- 表 1：sys_user  用户表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_user (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50)   NOT NULL UNIQUE         COMMENT '用户名/登录账号',
    password    VARCHAR(255)  NOT NULL                COMMENT 'BCrypt 加密密码',
    email       VARCHAR(100)  DEFAULT NULL            COMMENT '邮箱地址',
    role        VARCHAR(20)   NOT NULL DEFAULT 'user' COMMENT '角色：admin / user',
    status      TINYINT       NOT NULL DEFAULT 1      COMMENT '状态：1 启用 / 0 禁用',
    create_time DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- -----------------------------------------------------------
-- 表 2：kb_document  知识库文档表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_document (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255)  NOT NULL                COMMENT '文档标题',
    file_path   VARCHAR(500)  NOT NULL                COMMENT '存储路径',
    file_type   VARCHAR(20)   NOT NULL                COMMENT '文件类型：pdf / docx / txt / md',
    chunk_count INT           DEFAULT 0               COMMENT '切分块数',
    status      VARCHAR(20)   DEFAULT 'PROCESSING'    COMMENT '处理状态：PROCESSING / READY / ERROR',
    uploaded_by BIGINT        DEFAULT NULL            COMMENT '上传者 ID',
    create_time DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库文档表';

-- -----------------------------------------------------------
-- 表 3：qa_record  问答记录表（汇总）
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_record (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT        NOT NULL            COMMENT '提问用户 ID',
    conversation_id BIGINT        DEFAULT NULL        COMMENT '所属会话 ID',
    question        TEXT          NOT NULL            COMMENT '用户问题',
    answer          LONGTEXT      NOT NULL            COMMENT 'AI 答案',
    source_docs     VARCHAR(2000) DEFAULT '[]'        COMMENT '来源文档 JSON 数组',
    feedback        TINYINT       DEFAULT 0              COMMENT '评价：1=赞 / -1=踩 / 0=无',
    create_time     DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_qa_user (user_id),
    INDEX idx_qa_conv (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='问答记录表';

-- -----------------------------------------------------------
-- 表 4：conversation  会话表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT        NOT NULL                COMMENT '所属用户 ID',
    title       VARCHAR(100)  DEFAULT '新会话'         COMMENT '会话标题',
    create_time DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_conv_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会话表';

-- -----------------------------------------------------------
-- 表 5：message  消息表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS message (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT        NOT NULL            COMMENT '所属会话 ID',
    role            VARCHAR(20)   NOT NULL            COMMENT '消息角色：user / assistant',
    content         TEXT          NOT NULL            COMMENT '消息内容',
    sources         VARCHAR(2000) DEFAULT NULL        COMMENT '来源文档 JSON 数组',
    create_time     DATETIME      DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_msg_conv (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';

-- -----------------------------------------------------------
-- 初始化：系统管理员（用户名 admin，密码 admin123）
-- BCrypt hash 由 bcrypt.encode("admin123") 生成
-- -----------------------------------------------------------
INSERT IGNORE INTO sys_user (username, password, email, role, status)
VALUES ('admin',
        '$2b$10$8s/9xIa20.h9AbzaShuwO.HZ3PCBq18p8EWdZNCuCODOvCq9ZbNha',
        'admin@hhu.edu.cn',
        'admin',
        1);

-- -----------------------------------------------------------
-- 如果数据库已存在（Day1 建的），执行以下 ALTER 兼容升级
-- -----------------------------------------------------------
-- ALTER TABLE kb_document ADD COLUMN IF NOT EXISTS uploaded_by BIGINT AFTER status;
-- ALTER TABLE kb_document ADD COLUMN IF NOT EXISTS create_time DATETIME DEFAULT CURRENT_TIMESTAMP AFTER uploaded_by;
-- ALTER TABLE qa_record ADD COLUMN IF NOT EXISTS conversation_id BIGINT AFTER user_id;
-- ALTER TABLE qa_record MODIFY COLUMN source_docs VARCHAR(2000);
-- ALTER TABLE qa_record ADD COLUMN IF NOT EXISTS feedback TINYINT DEFAULT 0 COMMENT '评价：1=赞 / -1=踩 / 0=无' AFTER source_docs;
