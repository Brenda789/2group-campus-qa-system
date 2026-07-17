package com.hhu.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.entity.Conversation;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.entity.Message;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.service.KbDocumentService;
import com.hhu.campusqa.service.QaService;
import com.hhu.campusqa.service.RagService;
import com.hhu.campusqa.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 管理后台专用接口（统计、全量问答记录、索引重建）
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final KbDocumentService kbDocumentService;
    private final SysUserService sysUserService;
    private final QaService qaService;
    private final RagService ragService;

    public AdminController(KbDocumentService kbDocumentService,
                           SysUserService sysUserService,
                           QaService qaService,
                           RagService ragService) {
        this.kbDocumentService = kbDocumentService;
        this.sysUserService = sysUserService;
        this.qaService = qaService;
        this.ragService = ragService;
    }

    /** 仪表盘统计数据（问答、文档只看自己的；管理员额外显示注册用户总数） */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String role = (String) request.getAttribute("role");

        // 管理员额外显示注册用户总数
        long userCount = "admin".equals(role) ? sysUserService.count() : 0;

        // 自己的文档数
        long documentCount = kbDocumentService.lambdaQuery()
                .eq(KbDocument::getUploadedBy, userId != null ? userId : -1)
                .count();

        // 自己的问答总数
        long qaCount = qaService.lambdaQuery()
                .eq(QaRecord::getUserId, userId)
                .count();

        // 自己的今日问答数
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        long todayQaCount = qaService.lambdaQuery()
                .eq(QaRecord::getUserId, userId)
                .ge(QaRecord::getCreateTime, todayStart)
                .count();

        Map<String, Object> data = new HashMap<>();
        data.put("userCount", userCount);
        data.put("documentCount", documentCount);
        data.put("qaCount", qaCount);
        data.put("todayQaCount", todayQaCount);
        return Result.success(data);
    }

    /** 我的问答记录（分页，仅查看自己的，支持关键字模糊搜索问题和回答） */
    @GetMapping("/chat/history")
    public Result<Page<QaRecord>> chatHistory(@RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int size,
                                              @RequestParam(required = false) String keyword,
                                              HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return Result.success(qaService.pageUserQaRecords(userId, page, size, keyword));
    }

    /** 单条问答详情 */
    @GetMapping("/chat/{id}")
    public Result<QaRecord> chatDetail(@PathVariable Long id,
                                       HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        QaRecord record = qaService.getById(id);
        if (record == null || !record.getUserId().equals(userId)) {
            throw new BizException(404, "问答记录不存在");
        }
        return Result.success(record);
    }

    /** 删除自己的问答记录 */
    @DeleteMapping("/chat/{id}")
    public Result<Void> deleteChat(@PathVariable Long id,
                                    HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        qaService.deleteQaRecord(id, userId);
        return Result.success();
    }

    /** 我的会话列表（分页，用于问答记录管理） */
    @GetMapping("/chat/conversations")
    public Result<List<Conversation>> chatConversations(@RequestParam(required = false) String keyword,
                                                         HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return Result.success(qaService.getConversations(userId, keyword));
    }

    /** 某会话的所有消息（用于查看完整对话） */
    @GetMapping("/chat/conversations/{id}/messages")
    public Result<List<Message>> chatConversationMessages(@PathVariable Long id,
                                                           HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        Conversation conv = qaService.getConversations(userId, null).stream()
                .filter(c -> c.getId().equals(id))
                .findFirst()
                .orElse(null);
        if (conv == null) {
            throw new BizException(404, "会话不存在或无权访问");
        }
        return Result.success(qaService.getMessages(id));
    }

    /** 删除某个会话及其所有消息和问答记录 */
    @DeleteMapping("/chat/conversations/{id}")
    public Result<Void> deleteConversation(@PathVariable Long id,
                                            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        qaService.deleteConversation(id, userId);
        return Result.success();
    }

    /** 重建向量索引（处理所有待处理文档） */
    @PostMapping("/rebuild-index")
    public Result<Map<String, Object>> rebuildIndex(HttpServletRequest request) {
        checkAdmin(request);
        ragService.rebuildIndex();
        return Result.success(Map.of(
                "message", "索引重建完成",
                "chunkCount", ragService.getVectorStoreSize()
        ));
    }

    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
