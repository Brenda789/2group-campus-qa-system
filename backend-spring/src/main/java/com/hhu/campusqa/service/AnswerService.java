package com.hhu.campusqa.service;

import com.hhu.campusqa.entity.ScoredChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 答案提取服务
 * <p>
 * 从检索到的文档片段中，找出和问题最相关的句子，拼接成答案。
 * 对应 Python simple_answer() 函数。
 * </p>
 */
@Slf4j
@Service
public class AnswerService {

    /** 来源标记正则 */
    private static final Pattern SOURCE_TAG = Pattern.compile("\\[来源：[^\\]]+\\]");
    /** 句子分隔符 */
    private static final Pattern SENTENCE_SPLIT = Pattern.compile("[。！?？\\n]");

    private final TfidfService tfidfService;

    public AnswerService(TfidfService tfidfService) {
        this.tfidfService = tfidfService;
    }

    /**
     * 从检索结果中提取答案
     *
     * @param question         用户问题
     * @param retrievedChunks  检索到的相关切片（已按相似度排序）
     * @return AnswerResult（答案文本 + 来源列表）
     */
    public AnswerResult answer(String question, List<ScoredChunk> retrievedChunks) {
        if (retrievedChunks == null || retrievedChunks.isEmpty()) {
            return new AnswerResult("未找到相关参考资料。", List.of());
        }

        // 问题的词集合（用于计算重合度）
        Set<String> queryTerms = new HashSet<>(tfidfService.tokenize(question));

        // 收集所有句子候选
        List<SentenceCandidate> candidates = new ArrayList<>();

        for (ScoredChunk chunk : retrievedChunks) {
            String[] sentences = SENTENCE_SPLIT.split(chunk.getText());
            for (String s : sentences) {
                // 去掉来源标记
                String cleaned = SOURCE_TAG.matcher(s).replaceAll("").strip();
                if (cleaned.isEmpty()) {
                    continue;
                }
                Set<String> sTerms = new HashSet<>(tfidfService.tokenize(cleaned));
                // 交集大小 = 重合度
                sTerms.retainAll(queryTerms);
                int overlap = sTerms.size();
                candidates.add(new SentenceCandidate(overlap, cleaned, chunk.getSource()));
            }
        }

        // 按重合度降序
        candidates.sort((a, b) -> Integer.compare(b.overlap, a.overlap));

        // 取前 2 句
        List<SentenceCandidate> useful = candidates.stream()
                .filter(c -> c.overlap > 0)
                .limit(2)
                .collect(Collectors.toList());

        if (useful.isEmpty()) {
            return new AnswerResult("未找到匹配的答案句。", List.of());
        }

        String answer = useful.stream()
                .map(c -> c.text)
                .collect(Collectors.joining("；")) + "。";

        List<String> sources = useful.stream()
                .map(c -> c.source)
                .distinct()
                .collect(Collectors.toList());

        log.info("答案提取完成: 候选句数={}, 选中句数={}, 来源={}", candidates.size(), useful.size(), sources);
        return new AnswerResult(answer, sources);
    }

    // ==================== 内部类 ====================

    /** 句子候选 */
    private static class SentenceCandidate {
        final int overlap;
        final String text;
        final String source;

        SentenceCandidate(int overlap, String text, String source) {
            this.overlap = overlap;
            this.text = text;
            this.source = source;
        }
    }

    /** 答案结果 */
    public record AnswerResult(String answer, List<String> sources) {
    }
}
