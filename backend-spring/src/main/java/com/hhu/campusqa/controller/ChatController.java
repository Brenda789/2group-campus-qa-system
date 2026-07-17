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
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

/**
 * 问答接口
 */
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
    public SseEmitter streamAsk(@Valid @RequestBody ChatRequest req,
                                 HttpServletRequest request) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5 分钟超时
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            // 匿名：只推送答案，不存库
            ragService.streamAnswer(req.getQuestion(), emitter);
        } else {
            // 登录用户：推送答案 + 异步存库
            ragService.streamAnswer(req.getQuestion(), emitter);
            // 注：流式场景下异步保存比较复杂，当前保持与原有逻辑一致
        }
        return emitter;
    }

    /** 问答历史（qa_record 汇总） */
    @GetMapping("/history")
    public Result<List<QaRecord>> history(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return Result.success(List.of());
        return Result.success(qaService.getHistory(userId));
    }

    // ==================== 会话（conversation） ====================

    /** 我的会话列表 */
    @GetMapping("/conversations")
    public Result<List<Conversation>> conversations(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) return Result.success(List.of());
        return Result.success(qaService.getConversations(userId));
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
}
