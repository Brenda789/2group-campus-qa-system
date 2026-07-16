package com.hhu.campusqa.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * RAG 检索 + LLM 问答服务（骨架）
 * <p>
 * Day 2 先搭框架，Day 3 接入 LlamaIndex / DashScope / FAISS 后完整实现。
 * </p>
 *
 * <pre>
 * RAG 6 步流程：
 *   1. 文档加载（SimpleDirectoryReader）
 *   2. Embedding 向量化（DashScope text-embedding-v3）
 *   3. TopK 检索（FAISS 内积相似度）
 *   4. 上下文拼接（chunk 内容 + metadata source_url）
 *   5. Prompt 组装（System Prompt + 上下文 + 用户问题 + 历史对话）
 *   6. LLM 流式生成（DashScope qwen-turbo → SSE 流式输出）
 * </pre>
 */
@Slf4j
@Service
public class RagService {

    /**
     * 检索相关文档片段
     *
     * @param question 用户问题
     * @param topK     返回片段数
     * @return 相关片段列表（Day 3 实现）
     */
    public List<Map<String, Object>> retrieve(String question, int topK) {
        log.info("RAG 检索（占位）: question={}, topK={}", question, topK);
        // TODO Day 3: FAISS 向量检索
        return List.of();
    }

    /**
     * 流式生成回答（SSE）
     *
     * @param question         用户问题
     * @param retrievedChunks  检索到的上下文片段
     * @return 逐 token 迭代器（Day 3 实现）
     */
    public Iterable<String> streamAnswer(String question, List<Map<String, Object>> retrievedChunks) {
        log.info("RAG 流式生成（占位）: question={}, chunks={}", question, retrievedChunks.size());
        // TODO Day 3: DashScope LLM 流式调用
        return List.of("（RAG 引擎接入中，后续版本将返回智能回答）");
    }
}
