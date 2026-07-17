package com.hhu.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.entity.Conversation;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.entity.SysUser;
import com.hhu.campusqa.service.KbDocumentService;
import com.hhu.campusqa.service.QaService;
import com.hhu.campusqa.service.RagService;
import com.hhu.campusqa.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

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

    /** 仪表盘统计数据 */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats(HttpServletRequest request) {
        checkAdmin(request);

        long userCount = sysUserService.count();
        long documentCount = kbDocumentService.count();
        long qaCount = qaService.count();

        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        long todayQaCount = qaService.lambdaQuery()
                .ge(QaRecord::getCreateTime, todayStart)
                .count();

        // TODO: feedback 列尚未建，暂返回 0
        double positiveRate = 0.0;

        // 向量库规模
        int vectorStoreSize = ragService.getVectorStoreSize();

        Map<String, Object> data = new HashMap<>();
        data.put("userCount", userCount);
        data.put("documentCount", documentCount);
        data.put("qaCount", qaCount);
        data.put("todayQaCount", todayQaCount);
        data.put("positiveRate", positiveRate);
        data.put("vectorStoreSize", vectorStoreSize);
        return Result.success(data);
    }

    /** 仪表盘趋势数据（最近 7 天） */
    @GetMapping("/stats/trend")
    public Result<Map<String, Object>> trend(HttpServletRequest request) {
        checkAdmin(request);

        // 生成最近 7 天的日期列表（含今天）
        LocalDate today = LocalDate.now();
        List<LocalDate> last7Days = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            last7Days.add(today.minusDays(i));
        }

        // --- QA 趋势：按天统计（排除 feedback 列，数据库表中无此字段）---
        LocalDateTime weekStart = LocalDateTime.of(today.minusDays(6), LocalTime.MIN);
        List<QaRecord> weekQaRecords = qaService.lambdaQuery()
                .ge(QaRecord::getCreateTime, weekStart)
                .select(QaRecord.class, info -> !info.getColumn().equals("feedback"))
                .list();
        Map<LocalDate, Long> qaByDay = weekQaRecords.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getCreateTime().toLocalDate(),
                        Collectors.counting()
                ));
        List<Map<String, Object>> qaTrend = last7Days.stream().map(d -> {
            Map<String, Object> item = new HashMap<>();
            item.put("date", d.toString());
            item.put("count", qaByDay.getOrDefault(d, 0L));
            return item;
        }).collect(Collectors.toList());

        // --- 用户注册趋势：按天统计 ---
        List<SysUser> weekUsers = sysUserService.lambdaQuery()
                .ge(SysUser::getCreateTime, weekStart)
                .list();
        Map<LocalDate, Long> userByDay = weekUsers.stream()
                .collect(Collectors.groupingBy(
                        u -> u.getCreateTime().toLocalDate(),
                        Collectors.counting()
                ));
        List<Map<String, Object>> userTrend = last7Days.stream().map(d -> {
            Map<String, Object> item = new HashMap<>();
            item.put("date", d.toString());
            item.put("count", userByDay.getOrDefault(d, 0L));
            return item;
        }).collect(Collectors.toList());

        // --- 文档状态分布 ---
        long docProcessing = kbDocumentService.lambdaQuery()
                .eq(KbDocument::getStatus, "PROCESSING").count();
        long docReady = kbDocumentService.lambdaQuery()
                .eq(KbDocument::getStatus, "READY").count();
        long docError = kbDocumentService.lambdaQuery()
                .eq(KbDocument::getStatus, "ERROR").count();

        Map<String, Long> docStatus = new LinkedHashMap<>();
        docStatus.put("ready", docReady);
        docStatus.put("processing", docProcessing);
        docStatus.put("error", docError);

        // --- 反馈分布（feedback 列尚未建，暂全为 0）---
        long fbPositive = 0;
        long fbNegative = 0;
        long fbNeutral = 0;

        Map<String, Long> feedbackDist = new LinkedHashMap<>();
        feedbackDist.put("positive", fbPositive);
        feedbackDist.put("negative", fbNegative);
        feedbackDist.put("neutral", fbNeutral);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("qaTrend", qaTrend);
        data.put("userTrend", userTrend);
        data.put("docStatus", docStatus);
        data.put("feedbackDist", feedbackDist);
        return Result.success(data);
    }

    /** 全量问答记录（分页，支持关键词搜索） */
    @GetMapping("/chat/history")
    public Result<Page<QaRecord>> chatHistory(@RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int size,
                                              @RequestParam(required = false) String keyword,
                                              HttpServletRequest request) {
        checkAdmin(request);
        return Result.success(qaService.pageAllQaRecords(page, size, keyword));
    }

    /** 单条问答详情 */
    @GetMapping("/chat/{id}")
    public Result<QaRecord> chatDetail(@PathVariable Long id,
                                       HttpServletRequest request) {
        checkAdmin(request);
        QaRecord record = qaService.getById(id);
        if (record == null) {
            throw new BizException(404, "问答记录不存在");
        }
        return Result.success(record);
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

    /** 全量会话列表（分页） */
    @GetMapping("/conversations")
    public Result<Page<Conversation>> conversations(@RequestParam(defaultValue = "1") int page,
                                                    @RequestParam(defaultValue = "10") int size,
                                                    HttpServletRequest request) {
        checkAdmin(request);
        return Result.success(qaService.pageAllConversations(page, size));
    }

    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
