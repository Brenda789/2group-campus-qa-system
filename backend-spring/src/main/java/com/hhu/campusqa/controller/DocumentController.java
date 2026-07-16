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

/**
 * 知识库文档管理接口（管理员）
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final KbDocumentService kbDocumentService;

    public DocumentController(KbDocumentService kbDocumentService) {
        this.kbDocumentService = kbDocumentService;
    }

    /** 文档分页列表 */
    @GetMapping
    public Result<Page<KbDocument>> list(@RequestParam(defaultValue = "1") int page,
                                          @RequestParam(defaultValue = "10") int size,
                                          HttpServletRequest request) {
        checkAdmin(request);
        return Result.success(kbDocumentService.pageDocuments(page, size));
    }

    /** 上传文档文件 */
    @PostMapping
    public Result<KbDocument> upload(@RequestParam("file") MultipartFile file,
                                      HttpServletRequest request) {
        checkAdmin(request);
        if (file.isEmpty()) {
            throw new BizException(400, "文件不能为空");
        }
        // 文件大小限制 10MB
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

    /** 删除文档 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        checkAdmin(request);
        kbDocumentService.deleteDocument(id);
        return Result.success();
    }

    /** 管理员权限校验 */
    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
