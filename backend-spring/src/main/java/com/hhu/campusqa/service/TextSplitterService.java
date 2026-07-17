package com.hhu.campusqa.service;

import com.hhu.campusqa.entity.TextChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 文本切片服务
 * <p>
 * 将长文本按滑动窗口切分为固定大小的片段（chunk），
 * 相邻片段之间有重叠，避免语义在边界处断裂。
 * </p>
 */
@Slf4j
@Service
public class TextSplitterService {

    /** 来源标记正则：匹配 "[来源：xxx]" */
    private static final Pattern SOURCE_PATTERN = Pattern.compile("\\[来源：([^\\]]+)\\]");

    /** 默认切片大小（字符数） */
    private static final int DEFAULT_CHUNK_SIZE = 500;

    /** 默认重叠大小（字符数） */
    private static final int DEFAULT_OVERLAP = 100;

    /**
     * 使用默认参数切分（500 字符/块，重叠 100 字符）
     */
    public List<TextChunk> split(String text) {
        return split(text, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);
    }

    /**
     * 按滑动窗口切分文本
     *
     * @param text      原始文本
     * @param chunkSize 每块最大字符数
     * @param overlap   相邻块重叠字符数
     * @return 切片列表
     */
    public List<TextChunk> split(String text, int chunkSize, int overlap) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        List<TextChunk> chunks = new ArrayList<>();
        int start = 0;
        int chunkId = 1;
        int step = chunkSize - overlap;

        while (start < text.length()) {
            int end = Math.min(start + chunkSize, text.length());
            String content = text.substring(start, end).trim();

            if (!content.isEmpty()) {
                // 提取来源标签（和你 Python 逻辑一致）
                String source = extractSource(content);

                chunks.add(TextChunk.builder()
                        .id(chunkId)
                        .start(start)
                        .end(end)
                        .source(source)
                        .text(content)
                        .build());
                chunkId++;
            }

            if (end == text.length()) {
                break;
            }
            start += step;
        }

        log.info("文本切片完成: 总字符数={}, chunk数={}, chunkSize={}, overlap={}",
                text.length(), chunks.size(), chunkSize, overlap);
        return chunks;
    }

    /**
     * 从文本内容中提取来源标记
     * <p>
     * 例如 "[来源：校园卡管理规定.pdf]" → "校园卡管理规定.pdf"
     * 未找到标记 → "未知来源"
     * </p>
     */
    private String extractSource(String text) {
        Matcher matcher = SOURCE_PATTERN.matcher(text);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "未知来源";
    }
}
