package com.hhu.campusqa.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * kb_document 知识库文档表实体
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("kb_document")
public class KbDocument {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 文档标题 */
    private String title;

    /** 文件存储路径 */
    private String filePath;

    /** 文件类型：pdf / docx / txt / md */
    private String fileType;

    /** 文本切块数量 */
    private Integer chunkCount;

    /** 处理状态：PROCESSING / READY / ERROR */
    private String status;

    /** 上传者 ID（匿名上传时为 null） */
    private Long uploadedBy;

    /** 是否临时文档（匿名/访客上传），服务重启或会话结束时清理 */
    private Boolean isTemporary;

    /** 文档可见性：PUBLIC（所有人可用）/ PRIVATE（仅上传者可用） */
    private String visibility;

    /** 处理失败时的错误信息 */
    private String errorMessage;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
