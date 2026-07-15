"""初始化 MySQL 数据库 campus_qa，创建 PDF 规定的三张表"""
import pymysql
import sys

sys.stdout.reconfigure(encoding='utf-8')

DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "GRY20041031",
}


def main():
    # 1. 建库
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute(
        "CREATE DATABASE IF NOT EXISTS campus_qa "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
    print("1. 数据库 campus_qa 创建成功")
    conn.close()

    # 2. 连库建表
    conn = pymysql.connect(database="campus_qa", **DB_CONFIG)
    cursor = conn.cursor()

    # ----- sys_user -----
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sys_user (
            id          BIGINT          PRIMARY KEY AUTO_INCREMENT,
            username    VARCHAR(50)     NOT NULL UNIQUE        COMMENT '用户名',
            password    VARCHAR(100)    NOT NULL                COMMENT 'BCrypt加密密码',
            email       VARCHAR(100)                            COMMENT '邮箱',
            role        VARCHAR(20)     NOT NULL DEFAULT 'user' COMMENT '角色 admin/user',
            status      TINYINT         NOT NULL DEFAULT 1      COMMENT '1启用 0禁用',
            create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    print("2. sys_user 创建成功")

    try:
        cursor.execute(
            "CREATE UNIQUE INDEX idx_sys_user_username ON sys_user(username)"
        )
        print("3. idx_sys_user_username 唯一索引创建成功")
    except pymysql.err.OperationalError:
        print("3. idx_sys_user_username 已存在，跳过")

    # ----- kb_document -----
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS kb_document (
            id          BIGINT          PRIMARY KEY AUTO_INCREMENT,
            title       VARCHAR(200)    NOT NULL                COMMENT '文档标题',
            file_path   VARCHAR(500)    NOT NULL                COMMENT '存储路径',
            file_type   VARCHAR(20)     NOT NULL                COMMENT 'pdf/docx/txt/md',
            chunk_count INT             DEFAULT 0               COMMENT '切分块数',
            status      VARCHAR(20)     DEFAULT 'PROCESSING'    COMMENT '处理状态'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    print("4. kb_document 创建成功")

    # ----- qa_record -----
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS qa_record (
            id          BIGINT          PRIMARY KEY AUTO_INCREMENT,
            user_id     BIGINT          NOT NULL                COMMENT '关联用户ID',
            question    TEXT            NOT NULL                COMMENT '用户问题',
            answer      LONGTEXT                                COMMENT 'AI回答',
            source_docs VARCHAR(500)                            COMMENT '引用文档JSON',
            create_time DATETIME        DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            CONSTRAINT fk_qa_record_user FOREIGN KEY (user_id) REFERENCES sys_user(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """)
    print("5. qa_record 创建成功")
    conn.commit()
    conn.close()

    # 3. 验证
    conn = pymysql.connect(database="campus_qa", **DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    print("\n===== campus_qa 中的表 =====")
    for r in cursor.fetchall():
        print(f"  ✅ {r[0]}")

    for table in ["sys_user", "kb_document", "qa_record"]:
        cursor.execute(f"DESC {table}")
        print(f"\n📋 {table}")
        print(f"  {'字段':<18s} {'类型':<18s} {'空':<6s} {'键':<6s} {'默认值':<14s}")
        print(f"  {'-'*62}")
        for row in cursor.fetchall():
            print(f"  {row[0]:<18s} {str(row[1]):<18s} {row[2]:<6s} {row[3]:<6s} {str(row[4]):<14s}")

    conn.close()
    print("\n===== 全部完成！campus_qa 数据库已就绪 =====")


if __name__ == "__main__":
    main()
