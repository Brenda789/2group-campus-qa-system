package com.hhu.campusqa.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * message 消息表实体
 * <p>
 * 每条消息属于一个会话，role 区分用户/AI
 * </p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("message")
public class Message {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属会话 ID */
    private Long conversationId;

    /** 消息角色：user / assistant */
    private String role;

    /** 消息内容 */
    private String content;

    /** 来源文档（仅 assistant 消息，JSON 数组字符串，可为 null） */
    private String sources;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
