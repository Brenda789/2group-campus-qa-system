package com.hhu.campusqa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hhu.campusqa.config.RagConfig;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.entity.ScoredChunk;
import com.hhu.campusqa.entity.TextChunk;
import com.hhu.campusqa.mapper.KbDocumentMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.stream.Collectors;

/**
 * RAG 问答总控服务（Phase 2：Embedding + 向量检索 + LLM 生成）
 * <p>
 * 串联：文档加载 → 文本解析 → 切片 → Embedding → 向量存储 → 检索 → LLM 生成
 * </p>
 */
@Slf4j
@Service
public class RagService {

    private static final String DASHSCOPE_LLM_URL =
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

    private static final String SYSTEM_PROMPT = """
            你是河海大学校园问答助手。请仅根据以下提供的参考文档回答问题。
            如果参考文档中没有相关信息，请如实说"该问题暂时无法从知识库中找到答案"。
            回答时请引用来源文档标题。回答应简洁准确，控制在 200 字以内。""";

    private final KbDocumentMapper kbDocumentMapper;
    private final DocumentParserService parserService;
    private final TextSplitterService splitterService;
    private final EmbeddingService embeddingService;
    private final VectorStoreService vectorStore;
    private final RagConfig config;
    private final WebClient llmClient;
    private final ObjectMapper objectMapper;

    /** 索引是否已构建 */
    private volatile boolean indexBuilt = false;

    public RagService(KbDocumentMapper kbDocumentMapper,
                      DocumentParserService parserService,
                      TextSplitterService splitterService,
                      EmbeddingService embeddingService,
                      VectorStoreService vectorStore,
                      RagConfig config) {
        this.kbDocumentMapper = kbDocumentMapper;
        this.parserService = parserService;
        this.splitterService = splitterService;
        this.embeddingService = embeddingService;
        this.vectorStore = vectorStore;
        this.config = config;
        this.objectMapper = new ObjectMapper();
        this.llmClient = WebClient.builder()
                .defaultHeader("Authorization", "Bearer " + config.getApiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    // ==================== 问答入口 ====================

    /**
     * 同步问答（一次性返回完整答案）
     */
    public AnswerService.AnswerResult answer(String question) {
        return answer(question, config.getTopK());
    }

    public AnswerService.AnswerResult answer(String question, int topK) {
        log.info("RAG 问答开始: question=\"{}\", topK={}",
                truncate(question, 40), topK);

        // 1. 确保向量索引已构建
        ensureIndex();

        if (vectorStore.size() == 0) {
            return new AnswerService.AnswerResult("知识库中没有文档，请先上传文档。", List.of());
        }

        // 2. 问题 → 向量
        float[] qVec = embeddingService.embed(question);
        if (qVec.length == 0) {
            return new AnswerService.AnswerResult("Embedding 服务异常，请稍后重试。", List.of());
        }

        // 3. 向量检索
        List<ScoredChunk> retrieved = vectorStore.search(qVec, topK);
        if (retrieved.isEmpty()) {
            return new AnswerService.AnswerResult("未找到与您问题相关的知识库内容。", List.of());
        }

        // 4. 构建 Prompt + 调用 LLM
        String userMessage = buildUserMessage(question, retrieved);
        String answer = callLlmSync(userMessage);

        // 5. 提取来源
        List<String> sources = retrieved.stream()
                .map(ScoredChunk::getSource)
                .distinct()
                .collect(Collectors.toList());

        log.info("RAG 问答完成: answer=\"{}\", sources={}",
                truncate(answer, 50), sources);
        return new AnswerService.AnswerResult(answer, sources);
    }

    /**
     * 流式问答（SSE），通过 PrintWriter 逐字推送给前端。
     * <p>
     * 内部通过 WebClient 的异步流式管道消费 LLM 返回的 token，
     * 写入 writer 后立即 flush。完成后回调 onComplete。
     * </p>
     *
     * @param question   用户问题
     * @param writer     SSE 输出流（autoFlush）
     * @param onComplete 流式完成回调，携带完整答案 + 来源列表（null 表示无需回调）
     */
    public void streamAnswer(String question, PrintWriter writer, Consumer<StreamResult> onComplete) {
        try {
            // 1. 确保索引已构建
            ensureIndex();

            if (vectorStore.size() == 0) {
                writeSse(writer, "知识库中没有文档，请先上传文档。");
                if (onComplete != null) {
                    onComplete.accept(new StreamResult("知识库中没有文档，请先上传文档。", List.of()));
                }
                return;
            }

            // 2. 问题 → 向量
            float[] qVec = embeddingService.embed(question);
            if (qVec.length == 0) {
                writeSse(writer, "Embedding 服务异常，请稍后重试。");
                if (onComplete != null) {
                    onComplete.accept(new StreamResult("Embedding 服务异常，请稍后重试。", List.of()));
                }
                return;
            }

            // 3. 检索
            List<ScoredChunk> retrieved = vectorStore.search(qVec, config.getTopK());
            if (retrieved.isEmpty()) {
                writeSse(writer, "未找到相关知识库内容。");
                if (onComplete != null) {
                    onComplete.accept(new StreamResult("未找到相关知识库内容。", List.of()));
                }
                return;
            }

            // 4. 提取来源
            List<String> sources = retrieved.stream()
                    .map(ScoredChunk::getSource)
                    .distinct()
                    .collect(Collectors.toList());

            // 5. 构建 Prompt + 流式调用 LLM
            String userMessage = buildUserMessage(question, retrieved);
            callLlmStream(userMessage, writer, sources, onComplete);

        } catch (Exception e) {
            log.error("流式问答异常", e);
            writeSse(writer, "系统异常，请稍后重试。");
            if (onComplete != null) {
                onComplete.accept(new StreamResult("系统异常，请稍后重试。", List.of()));
            }
        }
    }

    // ==================== 索引管理 ====================

    /**
     * 构建/重建向量索引
     * <p>
     * 从数据库加载所有文档 → 解析 → 切片 → Embedding → 存入向量库
     * </p>
     */
    public synchronized void buildIndex() {
        log.info("========== 开始构建向量索引 ==========");

        List<KbDocument> docs = kbDocumentMapper.selectList(null);
        if (docs == null || docs.isEmpty()) {
            log.warn("知识库为空，跳过索引构建");
            indexBuilt = true;
            return;
        }

        vectorStore.clear();

        int totalChunks = 0;
        for (KbDocument doc : docs) {
            try {
                // 解析文档
                String text = parserService.parse(doc.getFilePath(), doc.getFileType());
                String taggedText = "[来源：" + doc.getTitle() + "]\n" + text;

                // 切片
                List<TextChunk> chunks = splitterService.split(taggedText);
                for (TextChunk chunk : chunks) {
                    chunk.setSource(doc.getTitle());
                }

                // 批量 Embedding
                List<String> chunkTexts = chunks.stream()
                        .map(TextChunk::getText)
                        .collect(Collectors.toList());
                List<float[]> vecs = embeddingService.embedBatch(chunkTexts);

                // 过滤空向量（API 失败导致）
                List<TextChunk> validChunks = new ArrayList<>();
                List<float[]> validVecs = new ArrayList<>();
                for (int i = 0; i < chunks.size(); i++) {
                    if (vecs.get(i).length > 0) {
                        validChunks.add(chunks.get(i));
                        validVecs.add(vecs.get(i));
                    }
                }

                if (!validChunks.isEmpty()) {
                    vectorStore.addAll(validChunks, validVecs);
                    totalChunks += validChunks.size();
                }

                log.info("文档 [{}] 处理完成: {}/{} 个有效切片",
                        doc.getTitle(), validChunks.size(), chunks.size());

            } catch (Throwable e) {
                log.error("文档 [{}] (id={}) 处理失败，跳过: {}", doc.getTitle(), doc.getId(), e.toString());
                doc.setStatus("ERROR");
                doc.setChunkCount(0);
                kbDocumentMapper.updateById(doc);
            }
        }

        indexBuilt = true;
        log.info("========== 向量索引构建完成: 总切片数={} ==========", totalChunks);
    }

    /** 如果索引未构建则构建 */
    private void ensureIndex() {
        if (!indexBuilt) {
            buildIndex();
        }
    }

    /** 重置索引（文档变更后调用） */
    public void resetIndex() {
        indexBuilt = false;
    }

    /** 获取向量库当前切片总数 */
    public int getVectorStoreSize() {
        return vectorStore.size();
    }

    /**
     * 增量添加单个文档到向量索引（A6：上传自动处理管线）
     * <p>
     * 解析 → 切片 → Embedding → 入向量库 → 更新 kb_document 状态。
     * 与 {@link #buildIndex()} 互斥（synchronized），防止并发修改向量库。
     * </p>
     */
    public synchronized void addDocument(KbDocument doc) {
        log.info("开始处理文档 [{}] (id={})", doc.getTitle(), doc.getId());
        try {
            int validCount = processOneDocument(doc);

            doc.setStatus("READY");
            doc.setChunkCount(validCount);
            kbDocumentMapper.updateById(doc);

            indexBuilt = true;
            log.info("文档 [{}] 处理完成: {} 个有效切片, 向量库总量={}",
                    doc.getTitle(), validCount, vectorStore.size());

        } catch (Exception e) {
            log.error("文档 [{}] (id={}) 处理失败: {}", doc.getTitle(), doc.getId(), e.toString());
            doc.setStatus("ERROR");
            doc.setChunkCount(0);
            kbDocumentMapper.updateById(doc);
        }
    }

    /**
     * 精确移除文档的向量（删除单个文档时调用，避免全量重建）
     */
    public synchronized void removeDocumentVectors(String title) {
        vectorStore.removeBySource(title);
    }

    /**
     * 文档变更后重建索引
     * <p>
     * 清空向量库，从数据库重新加载所有文档并构建索引。
     * </p>
     */
    public synchronized void rebuildIndex() {
        buildIndex();
    }

    // ==================== 内部：单文档处理 ====================

    /**
     * 解析并向量化单个文档，加入向量库
     * <p>
     * 每完成一个阶段更新数据库状态，方便前端展示处理进度。
     * </p>
     *
     * @return 成功入库的切片数
     */
    private int processOneDocument(KbDocument doc) {
        // 1. 解析文件
        doc.setStatus("PARSING");
        kbDocumentMapper.updateById(doc);
        String text = parserService.parse(doc.getFilePath(), doc.getFileType());
        String taggedText = "[来源：" + doc.getTitle() + "]\n" + text;
        holdStatus(); // 确保前端能观察到"解析中"状态

        // 2. 文本切片
        doc.setStatus("SPLITTING");
        kbDocumentMapper.updateById(doc);
        List<TextChunk> chunks = splitterService.split(taggedText);
        for (TextChunk chunk : chunks) {
            chunk.setSource(doc.getTitle());
        }
        holdStatus(); // 确保前端能观察到"切片中"状态

        // 3. Embedding 向量化
        doc.setStatus("EMBEDDING");
        kbDocumentMapper.updateById(doc);
        List<String> chunkTexts = chunks.stream()
                .map(TextChunk::getText)
                .collect(Collectors.toList());
        List<float[]> vecs = embeddingService.embedBatch(chunkTexts);
        holdStatus(); // 确保前端能观察到"向量化中"状态

        // 4. 过滤空向量 + 入库
        List<TextChunk> validChunks = new ArrayList<>();
        List<float[]> validVecs = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            if (vecs.get(i).length > 0) {
                validChunks.add(chunks.get(i));
                validVecs.add(vecs.get(i));
            }
        }

        if (!validChunks.isEmpty()) {
            vectorStore.addAll(validChunks, validVecs);
        }

        return validChunks.size();
    }

    /**
     * 重新处理单个文档（A6 补全：单文档重处理）
     * <p>
     * 先移除旧向量，再重新解析→切片→Embedding→入库。
     * 与 {@link #addDocument} / {@link #buildIndex} 互斥（synchronized）。
     * </p>
     */
    public synchronized void reprocessDocument(KbDocument doc) {
        log.info("重新处理文档 [{}] (id={})", doc.getTitle(), doc.getId());
        try {
            // 移除旧向量
            int removed = vectorStore.removeBySource(doc.getTitle());
            log.info("已移除文档 [{}] 的 {} 条旧向量", doc.getTitle(), removed);

            // 重新处理
            int validCount = processOneDocument(doc);

            doc.setStatus("READY");
            doc.setChunkCount(validCount);
            kbDocumentMapper.updateById(doc);

            indexBuilt = true;
            log.info("文档 [{}] 重新处理完成: {} 个有效切片, 向量库总量={}",
                    doc.getTitle(), validCount, vectorStore.size());

        } catch (Exception e) {
            log.error("文档 [{}] (id={}) 重新处理失败: {}", doc.getTitle(), doc.getId(), e.toString());
            doc.setStatus("ERROR");
            doc.setChunkCount(0);
            kbDocumentMapper.updateById(doc);
        }
    }

    // ==================== Prompt 构建 ====================

    private String buildUserMessage(String question, List<ScoredChunk> retrieved) {
        StringBuilder ctx = new StringBuilder();
        int charCount = 0;
        for (ScoredChunk chunk : retrieved) {
            String block = "[来源：" + chunk.getSource() + "]\n" + chunk.getText() + "\n\n";
            if (charCount + block.length() > config.getMaxContextChars()) break;
            ctx.append(block);
            charCount += block.length();
        }
        return "参考文档：\n" + ctx + "用户问题：" + question;
    }

    // ==================== LLM 调用 ====================

    /**
     * 同步调用 LLM
     */
    @SuppressWarnings("unchecked")
    private String callLlmSync(String userMessage) {
        Map<String, Object> body = Map.of(
                "model", config.getLlmModel(),
                "temperature", config.getTemperature(),
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userMessage)
                ),
                "stream", false
        );

        try {
            Map<String, Object> response = llmClient.post()
                    .uri(DASHSCOPE_LLM_URL)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null) return "LLM 服务返回为空，请稍后重试。";

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) return "LLM 服务返回异常，请稍后重试。";

            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) return "LLM 消息为空，请稍后重试。";

            String content = (String) message.get("content");
            return content != null ? content.trim() : "LLM 未生成回答，请稍后重试。";

        } catch (Exception e) {
            log.error("LLM 同步调用失败: {}", e.toString());
            return "AI 服务暂时不可用，请稍后重试。";
        }
    }

    /**
     * 流式调用 LLM，通过 PrintWriter 推送 SSE token。
     * <p>
     * 注意：Reactor Netty 的 bodyToFlux(String.class) 在处理 text/event-stream
     * 时可能自动剥离 "data: " 前缀，因此需兼容两种格式。
     * </p>
     */
    @SuppressWarnings("unchecked")
    private void callLlmStream(String userMessage, PrintWriter writer,
                               List<String> sources, Consumer<StreamResult> onComplete) {
        Map<String, Object> body = Map.of(
                "model", config.getLlmModel(),
                "temperature", config.getTemperature(),
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userMessage)
                ),
                "stream", true
        );

        StringBuilder fullAnswer = new StringBuilder();

        try {
            llmClient.post()
                    .uri(DASHSCOPE_LLM_URL)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToFlux(String.class)
                    .doOnNext(line -> {
                        // Reactor Netty 可能已剥除 SSE "data:" 前缀，也可能保留
                        //   - 保留时: "data: {...}" 或 "data: [DONE]"
                        //   - 剥除时: "{...}" 或 "[DONE]"
                        String json;
                        if (line.startsWith("data: ")) {
                            json = line.substring(6).trim();
                        } else {
                            json = line.trim();
                        }
                        if (json.isEmpty()) {
                            return;
                        }
                        if ("[DONE]".equals(json)) {
                            return;
                        }
                        if (!json.startsWith("{")) {
                            return;
                        }
                        try {
                            Map<String, Object> chunk = objectMapper.readValue(json, Map.class);
                            List<Map<String, Object>> choices =
                                    (List<Map<String, Object>>) chunk.get("choices");
                            if (choices != null && !choices.isEmpty()) {
                                Map<String, Object> delta =
                                        (Map<String, Object>) choices.get(0).get("delta");
                                if (delta != null) {
                                    String content = (String) delta.get("content");
                                    if (content != null && !content.isEmpty()) {
                                        fullAnswer.append(content);
                                        writeSse(writer, content);
                                    }
                                }
                            }
                        } catch (UncheckedIOException e) {
                            log.warn("SSE 写入失败（客户端可能已断开）: {}", e.toString());
                        } catch (Exception e) {
                            log.debug("SSE 行解析跳过: {} | err={}",
                                    truncate(json, 100), e.toString());
                        }
                    })
                    .doOnError(e -> {
                        log.error("LLM 流式调用失败: {}", e.toString());
                        writeSse(writer, "\n\n[AI 服务中断，请稍后重试]");
                        if (onComplete != null) {
                            onComplete.accept(new StreamResult(fullAnswer.toString(), sources));
                        }
                    })
                    .doOnComplete(() -> {
                        log.info("流式问答完成: answer=\"{}\"", truncate(fullAnswer.toString(), 50));
                        if (onComplete != null) {
                            onComplete.accept(new StreamResult(fullAnswer.toString(), sources));
                        }
                    })
                    .subscribe();

        } catch (Exception e) {
            log.error("LLM 流式请求失败: {}", e.toString());
            writeSse(writer, "AI 服务暂时不可用，请稍后重试。");
            if (onComplete != null) {
                onComplete.accept(new StreamResult(fullAnswer.toString(), sources));
            }
        }
    }

    // ==================== SSE 写入工具 ====================

    /** 写入一条 SSE 数据帧并立即 flush */
    private void writeSse(PrintWriter writer, String data) {
        writer.write("data: " + data + "\n\n");
        writer.flush();
    }

    // ==================== 流式结果 ====================

    /** 流式问答完成后的汇总结果 */
    public record StreamResult(String answer, List<String> sources) {}

    /**
     * 短暂停顿（300ms），确保前端轮询（500ms 间隔）能捕捉到每个处理状态。
     * <p>
     * SPLITTING（纯 CPU 毫秒级）和 EMBEDDING（API 调用 1-2s）在快速轮询下
     * 仍可能被跳过，加入 300ms 延迟让每个状态至少持续一个轮询周期的 60%。
     * </p>
     */
    private void holdStatus() {
        try {
            Thread.sleep(300);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return "null";
        return s.length() <= maxLen ? s : s.substring(0, maxLen) + "...";
    }
}
