package com.hhu.campusqa.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * conversation 会话表实体
 * <p>
 * 一个会话包含多条消息（一对多关联 message 表）
 * </p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("conversation")
public class Conversation {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属用户 ID */
    private Long userId;

    /** 会话标题（自动取首条问题截断） */
    private String title;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime updateTime;
}
