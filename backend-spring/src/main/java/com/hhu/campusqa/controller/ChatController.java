package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.dto.ChatRequest;
import com.hhu.campusqa.entity.Conversation;
import com.hhu.campusqa.entity.Message;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.service.QaService;
import com.hhu.campusqa.service.RagService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * 问答接口
 */
@Slf4j
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final QaService qaService;
    private final RagService ragService;

    public ChatController(QaService qaService, RagService ragService) {
        this.qaService = qaService;
        this.ragService = ragService;
    }

    /** 提问（RAG 引擎，一次性返回；支持匿名） */
    @PostMapping("/ask")
    public Result<QaRecord> ask(@Valid @RequestBody ChatRequest req,
                                 HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return Result.success(qaService.ask(userId, req.getQuestion(), req.getConversationId()));
    }

    /** 流式提问（SSE 打字机效果；支持匿名） */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> streamAsk(@Valid @RequestBody ChatRequest req,
                                 HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");

        // 登录用户：如果没有 conversationId，先创建会话，确保前端拿到真实 ID
        final Long[] convIdHolder = new Long[1];
        if (userId != null) {
            if (req.getConversationId() != null) {
                convIdHolder[0] = req.getConversationId();
            } else {
                // 预先创建新会话，这样前端能立刻拿到 convId
                Long newConvId = qaService.createConversation(userId, req.getQuestion());
                convIdHolder[0] = newConvId;
                log.info("流式问答自动创建会话: convId={}", newConvId);
            }
        }

        StreamingResponseBody body = outputStream -> {
            PrintWriter writer = new PrintWriter(
                    new OutputStreamWriter(outputStream, StandardCharsets.UTF_8), true);

            // 发送 convId 给前端
            if (userId != null) {
                writer.write("data: __CONV__" + convIdHolder[0] + "\n\n");
                writer.flush();
            }

            CountDownLatch latch = new CountDownLatch(1);

            if (userId == null) {
                // 匿名：只推送答案，不存库
                ragService.streamAnswer(req.getQuestion(), writer, result -> latch.countDown());
            } else {
                // 登录用户：推送答案 + 完成后异步存库
                final String question = req.getQuestion();
                ragService.streamAnswer(req.getQuestion(), writer, result -> {
                    // 异步保存，不阻塞 SSE 流关闭
                    CompletableFuture.runAsync(() -> {
                        try {
                            Long savedConvId = qaService.saveStreamQa(
                                    userId, convIdHolder[0], question,
                                    result.answer(), result.sources());
                            log.info("流式问答已保存: convId={}", savedConvId);
                        } catch (Exception e) {
                            log.error("保存流式问答记录失败", e);
                        }
                    });
                    latch.countDown();
                });
            }

            try {
                boolean ok = latch.await(5, TimeUnit.MINUTES);
                if (!ok) {
                    log.warn("流式问答超时 (5分钟)");
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(body);
    }

    /** 问答历史（qa_record 汇总，支持关键词搜索） */
    @GetMapping("/history")
    public Result<List<QaRecord>> history(@RequestParam(required = false) String keyword,
                                           HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return Result.success(List.of());
        return Result.success(qaService.getHistory(userId, keyword));
    }

    /** 问答点赞/踩 */
    @PutMapping("/{id}/feedback")
    public Result<Void> feedback(@PathVariable Long id,
                                  @RequestBody Map<String, Integer> body,
                                  HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        Integer feedback = body.get("feedback");
        qaService.updateFeedback(id, userId, feedback);
        return Result.success();
    }

    // ==================== 会话（conversation） ====================

    /** 我的会话列表 */
    @GetMapping("/conversations")
    public Result<List<Conversation>> conversations(HttpServletRequest request,
                                                     @RequestParam(required = false) String keyword) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return Result.success(List.of());
        return Result.success(qaService.getConversations(userId, keyword));
    }

    /** 某会话的消息列表 */
    @GetMapping("/conversations/{id}/messages")
    public Result<List<Message>> messages(@PathVariable Long id) {
        return Result.success(qaService.getMessages(id));
    }

    /** 删除会话 */
    @DeleteMapping("/conversations/{id}")
    public Result<Void> deleteConversation(@PathVariable Long id,
                                            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        qaService.deleteConversation(id, userId);
        return Result.success();
    }

    /** 重命名会话 */
    @PutMapping("/conversations/{id}/rename")
    public Result<Void> renameConversation(@PathVariable Long id,
                                           @RequestBody Map<String, String> body,
                                           HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String title = body.get("title");
        qaService.renameConversation(id, userId, title);
        return Result.success();
    }
}
