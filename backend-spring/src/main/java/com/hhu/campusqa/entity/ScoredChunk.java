package com.hhu.campusqa.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 检索结果 — TextChunk + 相似度分数
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoredChunk {

    /** 切片编号 */
    private int id;

    /** 切片文本 */
    private String text;

    /** 来源文档 */
    private String source;

    /** 所属文档数据库 ID（用于权限过滤） */
    private Long documentId;

    /** 相似度分数（0~1，越高越相关） */
    private double score;
}
