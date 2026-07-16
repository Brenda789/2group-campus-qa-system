package com.hhu.campusqa.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * qa_record 问答记录表实体
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("qa_record")
public class QaRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 提问用户 ID */
    private Long userId;

    /** 所属会话 ID（可选，关联 conversation 表） */
    private Long conversationId;

    /** 用户问题 */
    private String question;

    /** AI 答案 */
    private String answer;

    /** 来源文档（JSON 数组字符串） */
    private String sourceDocs;

    /** 评价：1=赞 / -1=踩 / 0=无 */
    private Integer feedback;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
