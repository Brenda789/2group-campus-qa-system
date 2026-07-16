package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.dto.ChatRequest;
import com.hhu.campusqa.entity.Conversation;
import com.hhu.campusqa.entity.Message;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.service.QaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 问答接口
 */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final QaService qaService;

    public ChatController(QaService qaService) {
        this.qaService = qaService;
    }

    /** 提问（当前为占位实现） */
    @PostMapping("/ask")
    public Result<QaRecord> ask(@Valid @RequestBody ChatRequest req,
                                 HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return Result.success(qaService.ask(userId, req.getQuestion(), req.getConversationId()));
    }

    /** 问答历史（qa_record 汇总，支持关键词搜索） */
    @GetMapping("/history")
    public Result<List<QaRecord>> history(@RequestParam(required = false) String keyword,
                                           HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
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
