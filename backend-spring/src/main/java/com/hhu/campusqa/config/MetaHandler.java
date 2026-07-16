package com.hhu.campusqa.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * MyBatis-Plus 字段自动填充处理器
 * <p>
 * 配合 @TableField(fill = FieldFill.INSERT)，
 * 插入时自动设置 createTime 字段，避免 null 值。
 * </p>
 */
@Component
public class MetaHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        // 暂不需要自动填充更新字段
    }
}
