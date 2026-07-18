package com.hhu.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.service.KbDocumentService;
import com.hhu.campusqa.service.SysUserService;
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
    private final SysUserService sysUserService;

    public DocumentController(KbDocumentService kbDocumentService, SysUserService sysUserService) {
        this.kbDocumentService = kbDocumentService;
        this.sysUserService = sysUserService;
    }

    /** 文档分页列表（支持按名称搜索、按状态筛选，普通用户只能看到 PUBLIC + 自己的文档） */
    @GetMapping
    public Result<Page<KbDocument>> list(@RequestParam(defaultValue = "1") int page,
                                          @RequestParam(defaultValue = "10") int size,
                                          @RequestParam(required = false) String keyword,
                                          @RequestParam(required = false) String status,
                                          HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String role = (String) request.getAttribute("role");
        return Result.success(kbDocumentService.pageDocuments(page, size, keyword, status, userId, role));
    }

    /** 公开搜索知识库文档（所有登录用户可用，仅返回已就绪的文档） */
    @GetMapping("/search")
    public Result<List<KbDocument>> search(@RequestParam(required = false) String keyword) {
        return Result.success(kbDocumentService.searchDocuments(keyword));
    }

    /** 上传文档文件（需要登录或访客身份） */
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

        // 用户身份检查：无 token 或用户已被清理时自动创建访客
        Long userId = (Long) request.getAttribute("userId");
        String role = (String) request.getAttribute("role");
        String guestToken = null;
        if (userId != null) {
            try {
                if (sysUserService.getById(userId) == null) userId = null;
            } catch (Exception ignored) { userId = null; }
        }
        if (userId == null) {
            java.util.Map<String, Object> guest = sysUserService.createGuestUser();
            userId = (Long) guest.get("userId");
            role = "guest";
            guestToken = (String) guest.get("token");
        }

        try {
            KbDocument doc = kbDocumentService.upload(
                    file.getOriginalFilename(),
                    file.getBytes(),
                    userId,
                    role
            );
            if (guestToken != null) doc.setGuestToken(guestToken);
            return Result.success(doc);
        } catch (IOException e) {
            throw new BizException(500, "文件读取失败");
        }
    }

    /** 删除文档（管理员可删任意文档，普通用户只能删自己的非公共文档） */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String role = (String) request.getAttribute("role");
        KbDocument doc = kbDocumentService.getById(id);
        if (doc == null) {
            throw new BizException(404, "文档不存在");
        }
        // 非管理员只能删除自己上传的非公共文档
        if (!"admin".equals(role)) {
            if (!doc.getUploadedBy().equals(userId)) {
                throw new BizException(403, "只能删除自己上传的文档");
            }
            if ("PUBLIC".equals(doc.getVisibility())) {
                throw new BizException(403, "公共文档不可删除，请联系管理员");
            }
        }
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

    /** 重新处理单个文档（管理员可处理任意文档，普通用户只能处理自己的文档） */
    @PostMapping("/{id}/reprocess")
    public Result<KbDocument> reprocess(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String role = (String) request.getAttribute("role");
        KbDocument doc = kbDocumentService.getById(id);
        if (doc == null) {
            throw new BizException(404, "文档不存在");
        }
        // 非管理员只能重新处理自己上传的文档
        if (!"admin".equals(role) && !doc.getUploadedBy().equals(userId)) {
            throw new BizException(403, "只能重新处理自己上传的文档");
        }
        kbDocumentService.reprocessDocument(doc);
        return Result.success(kbDocumentService.getById(id));
    }

    /** 修改文档可见性（仅管理员） */
    @PutMapping("/{id}/visibility")
    public Result<Void> setVisibility(@PathVariable Long id,
                                      @RequestBody java.util.Map<String, String> body,
                                      HttpServletRequest request) {
        checkAdmin(request);
        String visibility = body.get("visibility");
        if (visibility == null || (!"PUBLIC".equals(visibility) && !"PRIVATE".equals(visibility))) {
            throw new BizException(400, "visibility 必须为 PUBLIC 或 PRIVATE");
        }
        KbDocument doc = kbDocumentService.getById(id);
        if (doc == null) {
            throw new BizException(404, "文档不存在");
        }
        doc.setVisibility(visibility);
        kbDocumentService.updateById(doc);
        return Result.success();
    }

    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
