package com.hhu.campusqa.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * RAG 管线配置 — DashScope API 参数
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "dashscope")
public class RagConfig {

    /** DashScope API Key（从阿里云灵积平台获取） */
    private String apiKey = "";

    /** Embedding 模型名称 */
    private String embeddingModel = "text-embedding-v3";

    /** LLM 模型名称 */
    private String llmModel = "qwen-turbo";

    /** LLM 温度（0~1，越低越确定） */
    private double temperature = 0.3;

    /** 检索 TopK */
    private int topK = 5;

    /** 最大检索上下文字符数 */
    private int maxContextChars = 3000;
}
