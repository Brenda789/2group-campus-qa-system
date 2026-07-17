package com.hhu.campusqa.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 数据库初始化器 — 应用启动时自动补齐缺失的列
 * <p>
 * 避免手动执行 ALTER TABLE，其他人 pull 代码后自动生效。
 * 使用 ALTER TABLE ... ADD COLUMN IF NOT EXISTS（MySQL 8.0+），
 * 失败时回退到 information_schema 方案。
 * </p>
 */
@Slf4j
@Component
public class DatabaseInitializer {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        log.info("========== 数据库初始化：检查并添加缺失列 ==========");
        // kb_document 表
        addColumn("kb_document", "is_temporary",
                "TINYINT(1) DEFAULT 0 COMMENT '是否临时文档'");
        addColumn("kb_document", "error_message",
                "VARCHAR(500) DEFAULT NULL COMMENT '处理失败时的错误信息'");
        addColumn("kb_document", "visibility",
                "VARCHAR(20) DEFAULT 'PRIVATE' COMMENT '文档可见性：PUBLIC / PRIVATE'");
        // 已有文档默认设为 PUBLIC（向后兼容，新上传的才是 PRIVATE）
        fixExistingDocsVisibility();
        // qa_record 表（兼容旧数据库）
        addColumn("qa_record", "conversation_id",
                "BIGINT DEFAULT NULL COMMENT '所属会话 ID'");
        addColumn("qa_record", "feedback",
                "TINYINT DEFAULT 0 COMMENT '评价：1=赞 / -1=踩 / 0=无'");
        log.info("========== 数据库初始化完成 ==========");
    }

    /** 将已有文档的 visibility 设为 PUBLIC，保证向后兼容（新上传的默认为 PRIVATE） */
    private void fixExistingDocsVisibility() {
        try {
            int updated = jdbcTemplate.update(
                    "UPDATE kb_document SET visibility = 'PUBLIC' WHERE visibility IS NULL OR visibility = ''");
            if (updated > 0) {
                log.info("✅ 已将 {} 个已有文档设为 PUBLIC（向后兼容）", updated);
            }
        } catch (Exception e) {
            log.warn("⚠️ 更新已有文档可见性失败: {}", e.getMessage());
        }
    }

    private void addColumn(String table, String column, String definition) {
        // 方案1：直接 ALTER TABLE ADD COLUMN IF NOT EXISTS（MySQL 8.0+ / MariaDB 10+）
        try {
            String sql = "ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS "
                    + column + " " + definition;
            jdbcTemplate.execute(sql);
            log.info("✅ 数据库列 {}.{} 已就绪", table, column);
            return;
        } catch (Exception e1) {
            log.debug("IF NOT EXISTS 语法失败，尝试 information_schema 方案: {}", e1.getMessage());
        }

        // 方案2：information_schema 检查 + ALTER TABLE
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                    Integer.class, table, column);
            if (count != null && count == 0) {
                jdbcTemplate.execute("ALTER TABLE " + table
                        + " ADD COLUMN " + column + " " + definition);
                log.info("✅ 数据库列 {}.{} 已自动添加", table, column);
            } else {
                log.info("✅ 数据库列 {}.{} 已存在（跳过）", table, column);
            }
            return;
        } catch (Exception e2) {
            log.warn("⚠️ 自动添加列 {}.{} 失败: {}", table, column, e2.getMessage());
        }

        // 方案3：直接尝试 ALTER TABLE（忽略"列已存在"错误）
        try {
            jdbcTemplate.execute("ALTER TABLE " + table
                    + " ADD COLUMN " + column + " " + definition);
            log.info("✅ 数据库列 {}.{} 已添加（方案3）", table, column);
        } catch (Exception e3) {
            // 如果是 "Duplicate column" 错误，说明列已存在，忽略
            String msg = e3.getMessage();
            if (msg != null && (msg.contains("Duplicate column") || msg.contains("duplicate")
                    || msg.contains("already exists"))) {
                log.info("✅ 数据库列 {}.{} 已存在", table, column);
            } else {
                log.error("❌ 数据库列 {}.{} 添加失败，系统可能无法正常运行: {}",
                        table, column, msg);
            }
        }
    }
}
