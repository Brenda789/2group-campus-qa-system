package com.hhu.campusqa.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 文本切片 — 文档切分后的最小检索单元
 * <p>
 * 仅用于 RAG 内存计算，不持久化到数据库。
 * </p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TextChunk {

    /** 切片编号（从 1 开始） */
    private int id;

    /** 在原文本中的起始位置 */
    private int start;

    /** 在原文本中的结束位置 */
    private int end;

    /** 来源文档标题（从 [来源：xxx] 标记提取，无标记则为"未知来源"） */
    private String source;

    /** 切片文本内容 */
    private String text;
}
