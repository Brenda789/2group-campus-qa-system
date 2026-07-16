package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.service.KbDocumentService;
import com.hhu.campusqa.service.QaService;
import com.hhu.campusqa.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 管理员仪表盘接口
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final SysUserService sysUserService;
    private final KbDocumentService kbDocumentService;
    private final QaService qaService;

    public AdminController(SysUserService sysUserService,
                           KbDocumentService kbDocumentService,
                           QaService qaService) {
        this.sysUserService = sysUserService;
        this.kbDocumentService = kbDocumentService;
        this.qaService = qaService;
    }

    /** 仪表盘统计数据（管理员） */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats(HttpServletRequest request) {
        checkAdmin(request);

        long userCount = sysUserService.count();
        long documentCount = kbDocumentService.count();
        long qaCount = qaService.count();

        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        long todayQaCount = qaService.lambdaQuery()
                .ge(com.hhu.campusqa.entity.QaRecord::getCreateTime, todayStart)
                .count();

        Map<String, Object> data = new HashMap<>();
        data.put("userCount", userCount);
        data.put("documentCount", documentCount);
        data.put("qaCount", qaCount);
        data.put("todayQaCount", todayQaCount);
        return Result.success(data);
    }

    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
