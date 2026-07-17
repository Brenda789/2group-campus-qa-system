package com.hhu.campusqa.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 数据库初始化器 — 应用启动时自动补齐缺失的列
 * <p>
 * 避免手动执行 ALTER TABLE，其他人 pull 代码后自动生效。
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
        addColumnIfNotExists("kb_document", "is_temporary",
                "TINYINT(1) DEFAULT 0 COMMENT '是否临时文档（匿名上传）'");
        addColumnIfNotExists("kb_document", "error_message",
                "VARCHAR(500) DEFAULT NULL COMMENT '处理失败时的错误信息'");
    }

    private void addColumnIfNotExists(String table, String column, String definition) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
                    Integer.class, table, column);
            if (count != null && count == 0) {
                jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
                log.info("数据库列 {}.{} 已自动添加", table, column);
            }
        } catch (Exception e) {
            log.warn("自动添加列 {}.{} 失败（可能已存在或权限不足）: {}", table, column, e.getMessage());
        }
    }
}
