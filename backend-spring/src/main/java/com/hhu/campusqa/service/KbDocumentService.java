package com.hhu.campusqa.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.mapper.KbDocumentMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * 知识库文档服务
 * <p>
 * 支持匿名上传（临时文档，服务重启后清理）和登录上传（持久化）。
 * </p>
 */
@Slf4j
@Service
public class KbDocumentService extends ServiceImpl<KbDocumentMapper, KbDocument> {

    /** 文件上传目录（与 application.properties 中 file.upload-dir 对应） */
    private static final String UPLOAD_DIR = "./uploads";

    private final RagService ragService;

    public KbDocumentService(RagService ragService) {
        this.ragService = ragService;
    }

    /** 启动时清理上次运行残留的临时文档 */
    @PostConstruct
    public void init() {
        cleanTemporaryDocuments();
    }

    /** 分页查询文档列表（支持按名称搜索、按状态筛选、按可见性过滤） */
    public Page<KbDocument> pageDocuments(int page, int size, String keyword, String status, Long userId, String userRole) {
        LambdaQueryWrapper<KbDocument> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            qw.like(KbDocument::getTitle, keyword);
        }
        if (status != null && !status.isBlank()) {
            qw.eq(KbDocument::getStatus, status);
        }
        // 自己上传的文档 + 所有 PUBLIC 文档（公共文档所有人可见）
        if (userId != null) {
            qw.and(w -> w.eq(KbDocument::getUploadedBy, userId)
                          .or()
                          .eq(KbDocument::getVisibility, "PUBLIC"));
        } else {
            // 未登录访客只能看到 PUBLIC 文档
            qw.eq(KbDocument::getVisibility, "PUBLIC");
        }
        qw.orderByDesc(KbDocument::getCreateTime);
        try {
            return this.page(new Page<>(page, size), qw);
        } catch (Exception e) {
            // visibility 列可能还不存在，降级为不按可见性过滤
            log.warn("文档分页查询失败（可能 visibility 列尚未创建），降级为无过滤查询: {}", e.getMessage());
            LambdaQueryWrapper<KbDocument> fallback = new LambdaQueryWrapper<>();
            if (keyword != null && !keyword.isBlank()) fallback.like(KbDocument::getTitle, keyword);
            if (status != null && !status.isBlank()) fallback.eq(KbDocument::getStatus, status);
            fallback.orderByDesc(KbDocument::getCreateTime);
            return this.page(new Page<>(page, size), fallback);
        }
    }

    /** 按标题关键字搜索已就绪的文档（仅 PUBLIC 文档，所有用户可用） */
    public List<KbDocument> searchDocuments(String keyword) {
        LambdaQueryWrapper<KbDocument> qw = new LambdaQueryWrapper<>();
        qw.eq(KbDocument::getStatus, "READY");
        qw.eq(KbDocument::getVisibility, "PUBLIC");
        if (StringUtils.hasText(keyword)) {
            qw.like(KbDocument::getTitle, keyword);
        }
        qw.orderByDesc(KbDocument::getCreateTime);
        try {
            return list(qw);
        } catch (Exception e) {
            // visibility 列可能还不存在，降级为无过滤查询
            log.warn("文档搜索查询失败（可能 visibility 列尚未创建），降级: {}", e.getMessage());
            LambdaQueryWrapper<KbDocument> fallback = new LambdaQueryWrapper<>();
            fallback.eq(KbDocument::getStatus, "READY");
            if (StringUtils.hasText(keyword)) fallback.like(KbDocument::getTitle, keyword);
            fallback.orderByDesc(KbDocument::getCreateTime);
            return list(fallback);
        }
    }

    /**
     * 上传文档文件
     *
     * @param originalFilename 原始文件名
     * @param fileBytes        文件字节内容
     * @param uploadedBy       上传者 ID（所有用户包括访客都有 ID）
     * @param userRole         上传者角色（用于判断是否临时文档）
     * @return 创建的文档记录
     */
    public KbDocument upload(String originalFilename, byte[] fileBytes, Long uploadedBy, String userRole) {
        String fileType = getFileType(originalFilename);
        String storedName = UUID.randomUUID().toString() + "." + fileType;
        Path targetPath = Paths.get(UPLOAD_DIR, storedName);

        try {
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, fileBytes);
        } catch (IOException e) {
            log.error("文件保存失败: {}", targetPath, e);
            throw new BizException(500, "文件保存失败");
        }

        boolean isTemporary = "guest".equals(userRole);
        // 管理员上传为公共文档，普通用户/访客为私有
        String visibility = "admin".equals(userRole) ? "PUBLIC" : "PRIVATE";

        KbDocument doc = KbDocument.builder()
                .title(originalFilename)
                .filePath(targetPath.toString())
                .fileType(fileType)
                .chunkCount(0)
                .status("PROCESSING")
                .uploadedBy(uploadedBy)
                .isTemporary(isTemporary)
                .visibility(visibility)
                .build();
        save(doc);

        CompletableFuture.runAsync(() -> ragService.addDocument(doc));

        return doc;
    }

    /** 删除文档（物理文件 + 数据库记录 + 向量库精确移除） */
    public void deleteDocument(Long id) {
        KbDocument doc = getById(id);
        if (doc == null) {
            throw new BizException(400, "文档不存在");
        }

        // 1. 精确移除向量（不再全量重建）
        ragService.removeDocumentVectors(doc.getTitle());

        // 2. 删除物理文件
        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        } catch (IOException e) {
            log.warn("物理文件删除失败: {}", doc.getFilePath(), e);
        }

        // 3. 删除数据库记录
        removeById(id);
        log.info("文档 [{}] (id={}) 已删除", doc.getTitle(), id);
    }

    /** 重新处理单个文档（异步：清理旧向量 → 重新解析→切片→向量化→入库） */
    public void reprocessDocument(KbDocument doc) {
        doc.setStatus("PROCESSING");
        doc.setChunkCount(0);
        updateById(doc);
        CompletableFuture.runAsync(() -> ragService.reprocessDocument(doc));
    }

    /** 更新文档处理状态 */
    public void updateStatus(Long id, String status, Integer chunkCount) {
        KbDocument doc = getById(id);
        if (doc == null) {
            throw new BizException(400, "文档不存在");
        }
        doc.setStatus(status);
        doc.setChunkCount(chunkCount);
        updateById(doc);
    }

    // ==================== 临时文档清理 ====================

    /** 应用关闭时清理所有临时文档 */
    @PreDestroy
    public void onShutdown() {
        log.info("应用关闭，清理临时文档...");
        cleanTemporaryDocuments();
    }

    /** 清理所有匿名上传的临时文档 */
    private void cleanTemporaryDocuments() {
        List<KbDocument> tempDocs = lambdaQuery()
                .eq(KbDocument::getIsTemporary, true)
                .list();
        if (tempDocs.isEmpty()) return;

        log.info("清理 {} 个临时文档", tempDocs.size());
        for (KbDocument doc : tempDocs) {
            try {
                Files.deleteIfExists(Paths.get(doc.getFilePath()));
            } catch (IOException e) {
                log.warn("临时文件删除失败: {}", doc.getFilePath());
            }
            removeById(doc.getId());
        }
        // 清理后重建索引
        if (!tempDocs.isEmpty()) {
            ragService.rebuildIndex();
        }
    }

    // ==================== 内部方法 ====================

    private String getFileType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) return "pdf";
        if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
        if (lower.endsWith(".txt")) return "txt";
        if (lower.endsWith(".md")) return "md";
        return "unknown";
    }
}
