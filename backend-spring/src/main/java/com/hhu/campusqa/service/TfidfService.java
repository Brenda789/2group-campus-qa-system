package com.hhu.campusqa.service;

import com.hhu.campusqa.entity.ScoredChunk;
import com.hhu.campusqa.entity.TextChunk;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * TF-IDF 向量化 + 余弦相似度检索服务
 * <p>
 * 对应 Python mini_rag.py 中的 tokenize / build_tfidf / vectorize_query /
 * cosine_similarity / retrieve 五个函数。
 * </p>
 */
@Slf4j
@Service
public class TfidfService {

    /** 中文汉字 */
    private static final Pattern CHINESE = Pattern.compile("[\\u4e00-\\u9fff]+");
    /** 英文/数字 */
    private static final Pattern LATIN = Pattern.compile("[a-z0-9]+");

    // ==================== 分词 ====================

    /**
     * 中文二元分词 + 英文单词
     * <p>
     * 和你 Python 的 tokenize() 完全一致：
     * - 去除空白，转小写
     * - 中文 → 相邻二字组合（bigram）
     * - 英文 → 按词提取
     * </p>
     */
    public List<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        // 去空白，转小写（和 Python 的 re.sub(r'\s+', '', text.lower()) 一致）
        String cleaned = text.replaceAll("\\s+", "").toLowerCase();

        // 中文 bigram
        List<String> chineseBigrams = CHINESE.matcher(cleaned)
                .results()
                .flatMap(mr -> {
                    String run = mr.group();
                    if (run.length() < 2) return Stream.empty();
                    List<String> bigrams = new ArrayList<>();
                    for (int i = 0; i < run.length() - 1; i++) {
                        bigrams.add(run.substring(i, i + 2));
                    }
                    return bigrams.stream();
                })
                .collect(Collectors.toList());

        // 英文/数字单词
        List<String> latinWords = LATIN.matcher(cleaned)
                .results()
                .map(mr -> mr.group())
                .collect(Collectors.toList());

        List<String> result = new ArrayList<>();
        result.addAll(chineseBigrams);
        result.addAll(latinWords);
        return result;
    }

    // ==================== TF-IDF ====================

    /**
     * 对多段文本构建 TF-IDF 向量
     *
     * @return Pair of (文档向量列表, IDF 映射)
     */
    public TfidfResult buildTfidf(List<String> texts) {
        List<List<String>> tokenLists = texts.stream()
                .map(this::tokenize)
                .collect(Collectors.toList());

        // 文档频率 DF
        Map<String, Integer> docFrequency = new HashMap<>();
        for (List<String> tokens : tokenLists) {
            Set<String> unique = new HashSet<>(tokens);
            for (String term : unique) {
                docFrequency.merge(term, 1, Integer::sum);
            }
        }

        // IDF（和 Python 公式一致：log((N+1)/(df+1)) + 1）
        int nDocs = texts.size();
        Map<String, Double> idf = new HashMap<>();
        for (Map.Entry<String, Integer> entry : docFrequency.entrySet()) {
            double value = Math.log((double) (nDocs + 1) / (entry.getValue() + 1)) + 1.0;
            idf.put(entry.getKey(), value);
        }

        // TF-IDF 向量
        List<Map<String, Double>> vectors = new ArrayList<>();
        for (List<String> tokens : tokenLists) {
            Map<String, Integer> counts = new HashMap<>();
            for (String t : tokens) {
                counts.merge(t, 1, Integer::sum);
            }
            int total = Math.max(counts.values().stream().mapToInt(Integer::intValue).sum(), 1);

            Map<String, Double> vec = new HashMap<>();
            for (Map.Entry<String, Integer> entry : counts.entrySet()) {
                double tf = (double) entry.getValue() / total;
                double tfidf = tf * idf.getOrDefault(entry.getKey(), 0.0);
                vec.put(entry.getKey(), tfidf);
            }
            vectors.add(vec);
        }

        return new TfidfResult(vectors, idf);
    }

    // ==================== 查询向量化 ====================

    /**
     * 将查询文本向量化（使用事先算好的 IDF）
     * <p>
     * 和 Python 的 vectorize_query() 一致：只保留在 IDF 中出现的词。
     * </p>
     */
    public Map<String, Double> vectorizeQuery(String query, Map<String, Double> idf) {
        List<String> tokens = tokenize(query).stream()
                .filter(idf::containsKey)
                .collect(Collectors.toList());

        Map<String, Integer> counts = new HashMap<>();
        for (String t : tokens) {
            counts.merge(t, 1, Integer::sum);
        }
        int total = Math.max(counts.values().stream().mapToInt(Integer::intValue).sum(), 1);

        Map<String, Double> vec = new HashMap<>();
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            double tf = (double) entry.getValue() / total;
            vec.put(entry.getKey(), tf * idf.get(entry.getKey()));
        }
        return vec;
    }

    // ==================== 余弦相似度 ====================

    /**
     * 两个稀疏向量的余弦相似度
     * <p>
     * 和 Python 的 cosine_similarity() 完全一致。
     * </p>
     */
    public double cosineSimilarity(Map<String, Double> vecA, Map<String, Double> vecB) {
        double dotProduct = 0.0;
        for (Map.Entry<String, Double> entry : vecA.entrySet()) {
            dotProduct += entry.getValue() * vecB.getOrDefault(entry.getKey(), 0.0);
        }

        double normA = Math.sqrt(vecA.values().stream()
                .mapToDouble(v -> v * v).sum());
        double normB = Math.sqrt(vecB.values().stream()
                .mapToDouble(v -> v * v).sum());

        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dotProduct / (normA * normB);
    }

    // ==================== 检索入口 ====================

    /**
     * TF-IDF 检索：给一个问题，从所有切片中返回 TopK 最相关的
     *
     * @param question 用户问题
     * @param chunks   所有文档切片
     * @param topK     返回数量
     * @return 按相似度降序排列的 TopK 结果
     */
    public List<ScoredChunk> retrieve(String question, List<TextChunk> chunks, int topK) {
        return retrieve(question, chunks, topK, 0.05);
    }

    /**
     * TF-IDF 检索 + 最低分数阈值
     * <p>
     * 和你 Python 的 retrieve() 完全一致。
     * </p>
     */
    public List<ScoredChunk> retrieve(String question, List<TextChunk> chunks, int topK, double minScore) {
        if (chunks == null || chunks.isEmpty()) {
            return List.of();
        }

        // 1. 对所有 chunk 文本建 TF-IDF
        List<String> texts = chunks.stream()
                .map(TextChunk::getText)
                .collect(Collectors.toList());
        TfidfResult result = buildTfidf(texts);

        // 2. 查询向量化
        Map<String, Double> queryVec = vectorizeQuery(question, result.idf());
        if (queryVec.isEmpty()) {
            log.info("查询向量为空，无法检索: {}", question);
            return List.of();
        }

        // 3. 计算每个 chunk 的余弦相似度
        List<ScoredChunk> scored = new ArrayList<>();
        List<Map<String, Double>> docVectors = result.vectors();
        for (int i = 0; i < chunks.size(); i++) {
            double score = cosineSimilarity(queryVec, docVectors.get(i));
            if (score >= minScore) {
                TextChunk chunk = chunks.get(i);
                scored.add(ScoredChunk.builder()
                        .id(chunk.getId())
                        .text(chunk.getText())
                        .source(chunk.getSource())
                        .score(score)
                        .build());
            }
        }

        // 4. 按分数降序，取 TopK
        scored.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        List<ScoredChunk> topResults = scored.stream()
                .limit(topK)
                .collect(Collectors.toList());

        log.info("TF-IDF 检索完成: query=\"{}\", chunks={}, hits={}, topK={}",
                question.substring(0, Math.min(30, question.length())),
                chunks.size(), topResults.size(), topK);
        return topResults;
    }

    // ==================== TF-IDF 结果封装 ====================

    /**
     * buildTfidf() 的返回值
     */
    public record TfidfResult(List<Map<String, Double>> vectors, Map<String, Double> idf) {
    }
}
