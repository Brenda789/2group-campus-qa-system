-- ============================================================
-- 校园知识问答助手 — 数据库建表脚本（MySQL 8.0）
-- Day 1 产出：数据字典 DDL
-- ============================================================

CREATE DATABASE IF NOT EXISTS campus_qa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE campus_qa;

-- -----------------------------------------------------------
-- 表 1：sys_user  用户表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_user (
    id          BIGINT          PRIMARY KEY AUTO_INCREMENT,
    username    VARCHAR(50)     NOT NULL UNIQUE        COMMENT '用户名/登录账号',
    password    VARCHAR(100)    NOT NULL                COMMENT 'BCrypt 加密密码',
    email       VARCHAR(100)                            COMMENT '邮箱地址',
    role        VARCHAR(20)     NOT NULL DEFAULT 'user' COMMENT '角色：admin / user',
    status      TINYINT         NOT NULL DEFAULT 1      COMMENT '状态：1启用 0禁用',
    create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，自动填充'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

-- 按 PDF 要求：username 添加唯一索引防止重复注册
CREATE UNIQUE INDEX idx_sys_user_username ON sys_user(username);


-- -----------------------------------------------------------
-- 表 2：kb_document  知识库文档表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_document (
    id          BIGINT          PRIMARY KEY AUTO_INCREMENT,
    title       VARCHAR(200)    NOT NULL                COMMENT '文档标题',
    file_path   VARCHAR(500)    NOT NULL                COMMENT '存储路径',
    file_type   VARCHAR(20)     NOT NULL                COMMENT '文件类型：pdf / docx / txt / md',
    chunk_count INT             DEFAULT 0               COMMENT '切分块数',
    status      VARCHAR(20)     DEFAULT 'PROCESSING'    COMMENT '处理状态：PROCESSING / READY / ERROR'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库文档表';


-- -----------------------------------------------------------
-- 表 3：qa_record  问答记录表
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_record (
    id          BIGINT          PRIMARY KEY AUTO_INCREMENT,
    user_id     BIGINT          NOT NULL                COMMENT '关联用户 ID',
    question    TEXT            NOT NULL                COMMENT '用户问题',
    answer      LONGTEXT                                COMMENT 'AI 回答',
    source_docs VARCHAR(500)                            COMMENT '引用文档（JSON 数组）',
    create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间，自动填充',

    -- sys_user : qa_record = 1 : N
    CONSTRAINT fk_qa_record_user
        FOREIGN KEY (user_id) REFERENCES sys_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='问答记录表';


-- -----------------------------------------------------------
-- 初始化：插入一条系统管理员记录（密码为 admin123 的 BCrypt 哈希）
-- -----------------------------------------------------------
INSERT INTO sys_user(username, password, email, role, status)
VALUES ('admin',
        '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5Eh',
        'admin@campus.example',
        'admin',
        1);
