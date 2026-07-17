package com.hhu.campusqa.service;

import com.hhu.campusqa.entity.ScoredChunk;
import com.hhu.campusqa.entity.TextChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * 向量存储与检索服务 — 内存向量索引
 * <p>
 * 当前为轻量级内存实现，适合文档量 ≤ 1000 的场景。
 * 后续可升级为 FAISS / Milvus / Redis Stack。
 * </p>
 */
@Slf4j
@Service
public class VectorStoreService {

    /** 存储的文本块列表 */
    private final List<TextChunk> chunks = Collections.synchronizedList(new ArrayList<>());

    /** 每个文本块对应的向量（顺序一致） */
    private final List<float[]> vectors = Collections.synchronizedList(new ArrayList<>());

    /**
     * 批量添加文本块和向量
     */
    public void addAll(List<TextChunk> newChunks, List<float[]> newVectors) {
        if (newChunks.size() != newVectors.size()) {
            throw new IllegalArgumentException(
                    "chunks 与 vectors 数量不一致: " + newChunks.size() + " vs " + newVectors.size());
        }
        chunks.addAll(newChunks);
        vectors.addAll(newVectors);
        log.info("向量库新增 {} 条记录，当前总量: {}", newChunks.size(), chunks.size());
    }

    /**
     * 按来源文档标题移除向量（单文档重处理前调用）
     *
     * @param source 文档标题
     * @return 移除的切片数
     */
    public int removeBySource(String source) {
        int removed = 0;
        // 从后往前遍历，避免索引偏移
        for (int i = chunks.size() - 1; i >= 0; i--) {
            if (source.equals(chunks.get(i).getSource())) {
                chunks.remove(i);
                vectors.remove(i);
                removed++;
            }
        }
        if (removed > 0) {
            log.info("向量库移除文档 [{}] 的 {} 个切片，剩余: {}", source, removed, chunks.size());
        }
        return removed;
    }

    /**
     * 清空向量库（重建索引前调用）
     */
    public void clear() {
        chunks.clear();
        vectors.clear();
        log.info("向量库已清空");
    }

    /**
     * 余弦相似度检索 TopK
     *
     * @param queryVector 问题向量
     * @param topK        返回数量
     * @return 带相似度分数的文本块列表
     */
    public List<ScoredChunk> search(float[] queryVector, int topK) {
        if (queryVector == null || queryVector.length == 0 || chunks.isEmpty()) {
            return List.of();
        }

        // 并行计算所有余弦相似度
        List<SimilarityResult> sims = IntStream.range(0, chunks.size())
                .parallel()
                .mapToObj(i -> new SimilarityResult(i, cosine(queryVector, vectors.get(i))))
                .collect(Collectors.toList());

        // 按分数降序排列
        sims.sort((a, b) -> Double.compare(b.score, a.score));

        // 取 TopK
        int limit = Math.min(topK, sims.size());
        return sims.subList(0, limit).stream()
                .filter(s -> s.score > 0)
                .map(s -> {
                    TextChunk chunk = chunks.get(s.index);
                    return ScoredChunk.builder()
                            .id(chunk.getId())
                            .text(chunk.getText())
                            .source(chunk.getSource())
                            .score(s.score)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /** 向量库条目数 */
    public int size() {
        return chunks.size();
    }

    // ==================== 内部方法 ====================

    /** 余弦相似度 */
    private static double cosine(float[] a, float[] b) {
        if (a.length == 0 || b.length == 0 || a.length != b.length) return 0.0;
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += (double) a[i] * b[i];
            normA += (double) a[i] * a[i];
            normB += (double) b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0.0 : dot / denom;
    }

    /** 相似度计算结果 */
    private record SimilarityResult(int index, double score) {}
}
