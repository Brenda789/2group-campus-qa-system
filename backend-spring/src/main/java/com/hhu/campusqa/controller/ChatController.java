package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.dto.ChatRequest;
import com.hhu.campusqa.entity.Conversation;
import com.hhu.campusqa.entity.Message;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.service.QaService;
import com.hhu.campusqa.service.RagService;
import com.hhu.campusqa.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * 问答接口
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final QaService qaService;
    private final RagService ragService;
    private final SysUserService sysUserService;

    public ChatController(QaService qaService, RagService ragService, SysUserService sysUserService) {
        this.qaService = qaService;
        this.ragService = ragService;
        this.sysUserService = sysUserService;
    }

    /** 提问（RAG 引擎，一次性返回；无 token 或 token 对应的用户已被清理时自动创建访客） */
    @PostMapping("/ask")
    public Result<QaRecord> ask(@Valid @RequestBody ChatRequest req,
                                 HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String guestToken = null;

        try {
            // 校验 token 对应的用户是否还存在（刷新页面时可能被 beforeunload 清理了）
            if (userId != null) {
                try {
                    if (sysUserService.getById(userId) == null) {
                        userId = null; // 用户已被删除，重新创建访客
                    }
                } catch (Exception ignored) {
                    userId = null;
                }
            }

            // 如果没有有效 userId，自动创建访客
            if (userId == null) {
                Map<String, Object> guest = sysUserService.createGuestUser();
                userId = (Long) guest.get("userId");
                guestToken = (String) guest.get("token");
            }

            QaRecord record = qaService.ask(userId, req.getQuestion(), req.getConversationId());
            if (guestToken != null) {
                record.setGuestToken(guestToken);
            }
            return Result.success(record);
        } catch (Exception e) {
            QaRecord fallback = new QaRecord();
            fallback.setQuestion(req.getQuestion());
            fallback.setAnswer("知识库暂时不可用，请稍后重试。错误：" + e.getMessage());
            fallback.setSourceDocs("[]");
            if (guestToken != null) {
                fallback.setGuestToken(guestToken);
            }
            return Result.success(fallback);
        }
    }

    /** 流式提问（SSE 打字机效果） */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAsk(@Valid @RequestBody ChatRequest req,
                                 HttpServletRequest request) {
        SseEmitter emitter = new SseEmitter(300_000L); // 5 分钟超时
        Long userId = (Long) request.getAttribute("userId");
        ragService.streamAnswer(req.getQuestion(), userId, emitter);
        return emitter;
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
