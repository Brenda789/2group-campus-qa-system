package com.hhu.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.service.KbDocumentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * 知识库文档管理接口
 * <p>
 * 上传和列表：所有人可用（匿名上传为临时文档）
 * 删除和重处理：仅管理员
 * </p>
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final List<String> ALLOWED_TYPES = List.of("pdf", "doc", "docx", "txt", "md");

    private final KbDocumentService kbDocumentService;

    public DocumentController(KbDocumentService kbDocumentService) {
        this.kbDocumentService = kbDocumentService;
    }

    /** 文档分页列表（支持按名称搜索、按状态筛选） */
    @GetMapping
    public Result<Page<KbDocument>> list(@RequestParam(defaultValue = "1") int page,
                                          @RequestParam(defaultValue = "10") int size,
                                          @RequestParam(required = false) String keyword,
                                          @RequestParam(required = false) String status) {
        return Result.success(kbDocumentService.pageDocuments(page, size, keyword, status));
    }

    /** 公开搜索知识库文档（所有登录用户可用，仅返回已就绪的文档） */
    @GetMapping("/search")
    public Result<List<KbDocument>> search(@RequestParam(required = false) String keyword) {
        return Result.success(kbDocumentService.searchDocuments(keyword));
    }

    /** 上传文档文件（所有人可用；匿名上传为临时文档，服务重启后清理） */
    @PostMapping
    public Result<KbDocument> upload(@RequestParam("file") MultipartFile file,
                                      HttpServletRequest request) {
        // 1. 空文件检查
        if (file.isEmpty()) {
            throw new BizException(400, "文件不能为空");
        }

        // 2. 文件类型校验
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.contains(".")) {
            throw new BizException(400, "无法识别的文件类型");
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        if (!ALLOWED_TYPES.contains(ext)) {
            throw new BizException(400, "仅支持 PDF / DOCX / TXT / MD 格式，当前类型: ." + ext);
        }

        // 3. 文件大小限制 10MB
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new BizException(400, "文件大小不能超过 10MB");
        }

        try {
            Long userId = (Long) request.getAttribute("userId");
            KbDocument doc = kbDocumentService.upload(
                    file.getOriginalFilename(),
                    file.getBytes(),
                    userId
            );
            return Result.success(doc);
        } catch (IOException e) {
            throw new BizException(500, "文件读取失败");
        }
    }

    /** 删除文档（仅管理员） */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        checkAdmin(request);
        kbDocumentService.deleteDocument(id);
        return Result.success();
    }

    /** 查询单个文档（用于轮询处理状态） */
    @GetMapping("/{id}")
    public Result<KbDocument> getById(@PathVariable Long id) {
        KbDocument doc = kbDocumentService.getById(id);
        if (doc == null) {
            throw new BizException(404, "文档不存在");
        }
        return Result.success(doc);
    }

    /** 重新处理单个文档（仅管理员） */
    @PostMapping("/{id}/reprocess")
    public Result<KbDocument> reprocess(@PathVariable Long id, HttpServletRequest request) {
        checkAdmin(request);
        KbDocument doc = kbDocumentService.getById(id);
        if (doc == null) {
            throw new BizException(404, "文档不存在");
        }
        kbDocumentService.reprocessDocument(doc);
        return Result.success(kbDocumentService.getById(id));
    }

    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
