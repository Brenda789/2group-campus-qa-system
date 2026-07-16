package com.hhu.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.service.KbDocumentService;
import com.hhu.campusqa.service.QaService;
import com.hhu.campusqa.service.RagService;
import com.hhu.campusqa.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 管理后台专用接口（统计、全量问答记录）
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
    public Result<Map<String, Long>> stats(HttpServletRequest request) {
        checkAdmin(request);
        return Result.success(Map.of(
                "docCount", kbDocumentService.count(),
                "userCount", sysUserService.count(),
                "qaCount", qaService.count()
        ));
    }

    /** 全量问答记录（分页） */
    @GetMapping("/chat/history")
    public Result<Page<QaRecord>> chatHistory(@RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "10") int size,
                                              HttpServletRequest request) {
        checkAdmin(request);
        return Result.success(qaService.pageAllQaRecords(page, size));
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

    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
