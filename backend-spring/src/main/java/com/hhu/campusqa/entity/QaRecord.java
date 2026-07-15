package com.hhu.campusqa.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** qa_record 问答记录表实体 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QaRecord {
    private Long id;
    private Long userId;
    private String question;
    private String answer;
    private String sourceDocs;   // JSON 数组
    private LocalDateTime createTime;
}
