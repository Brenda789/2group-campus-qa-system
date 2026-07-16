package com.hhu.campusqa.service;

import com.hhu.campusqa.config.RagConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Embedding 向量化服务 — 调用 DashScope text-embedding-v3 API
 * <p>
 * 将文本转为 1024 维语义向量，用于后续向量相似度检索。
 * </p>
 */
@Slf4j
@Service
public class EmbeddingService {

    private static final String DASHSCOPE_EMBED_URL =
            "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding";

    /** 批量 API 单次最大文本数 */
    private static final int MAX_BATCH_SIZE = 25;

    private final RagConfig config;
    private final WebClient webClient;

    public EmbeddingService(RagConfig config) {
        this.config = config;
        this.webClient = WebClient.builder()
                .defaultHeader("Authorization", "Bearer " + config.getApiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    /**
     * 单条文本 → 向量
     */
    public float[] embed(String text) {
        List<float[]> batch = embedBatch(List.of(text));
        return batch.isEmpty() ? new float[0] : batch.get(0);
    }

    /**
     * 批量文本 → 向量列表（自动分批次，处理 API 单次上限）
     *
     * @param texts 待向量化的文本列表
     * @return 与 texts 顺序一致的向量列表
     */
    public List<float[]> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) return List.of();

        List<float[]> allVectors = new ArrayList<>();

        // 分批调用 API
        for (int i = 0; i < texts.size(); i += MAX_BATCH_SIZE) {
            int end = Math.min(i + MAX_BATCH_SIZE, texts.size());
            List<String> batch = texts.subList(i, end);
            allVectors.addAll(callEmbedApi(batch));
        }

        return allVectors;
    }

    // ==================== 内部方法 ====================

    @SuppressWarnings("unchecked")
    private List<float[]> callEmbedApi(List<String> texts) {
        Map<String, Object> body = Map.of(
                "model", config.getEmbeddingModel(),
                "input", Map.of("texts", texts)
        );

        try {
            Map<String, Object> response = webClient.post()
                    .uri(DASHSCOPE_EMBED_URL)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null) {
                log.error("Embedding API 返回 null");
                return emptyVectors(texts.size());
            }

            Map<String, Object> output = (Map<String, Object>) response.get("output");
            if (output == null) {
                log.error("Embedding API 返回无 output 字段: {}", response);
                return emptyVectors(texts.size());
            }

            List<Map<String, Object>> embeddings =
                    (List<Map<String, Object>>) output.get("embeddings");
            if (embeddings == null || embeddings.isEmpty()) {
                log.error("Embedding API 返回无 embeddings: {}", output);
                return emptyVectors(texts.size());
            }

            // 解析每个向量
            List<float[]> vectors = new ArrayList<>();
            for (Map<String, Object> emb : embeddings) {
                List<Double> rawVec = (List<Double>) emb.get("embedding");
                if (rawVec == null) {
                    vectors.add(new float[0]);
                    continue;
                }
                float[] vec = new float[rawVec.size()];
                for (int j = 0; j < rawVec.size(); j++) {
                    vec[j] = rawVec.get(j).floatValue();
                }
                vectors.add(vec);
            }

            log.debug("Embedding 完成: {} 条文本 → {} 个向量", texts.size(), vectors.size());
            return vectors;

        } catch (WebClientResponseException e) {
            log.error("Embedding API 调用失败 (HTTP {}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            return emptyVectors(texts.size());
        } catch (Exception e) {
            log.error("Embedding API 调用异常: {}", e.toString());
            return emptyVectors(texts.size());
        }
    }

    /** 返回指定数量的空向量（API 失败时的降级处理） */
    private List<float[]> emptyVectors(int count) {
        List<float[]> list = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            list.add(new float[0]);
        }
        return list;
    }
}
