package com.hhu.campusqa.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** kb_document 知识库文档表实体 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KbDocument {
    private Long id;
    private String title;
    private String filePath;
    private String fileType;     // pdf / docx / txt / md
    private Integer chunkCount;
    private String status;       // PROCESSING / READY / ERROR
}
