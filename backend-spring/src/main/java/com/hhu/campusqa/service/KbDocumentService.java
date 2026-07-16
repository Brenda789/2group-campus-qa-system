package com.hhu.campusqa.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.mapper.KbDocumentMapper;
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
 */
@Service
public class KbDocumentService extends ServiceImpl<KbDocumentMapper, KbDocument> {

    /** 文件上传目录（与 application.properties 中 file.upload-dir 对应） */
    private static final String UPLOAD_DIR = "./uploads";

    private final RagService ragService;

    public KbDocumentService(RagService ragService) {
        this.ragService = ragService;
    }

    /** 分页查询文档列表 */
    public Page<KbDocument> pageDocuments(int page, int size) {
        LambdaQueryWrapper<KbDocument> qw = new LambdaQueryWrapper<>();
        qw.orderByDesc(KbDocument::getCreateTime);
        return this.page(new Page<>(page, size), qw);
    }

    /** 按标题关键字搜索已就绪的文档（所有用户可用） */
    public List<KbDocument> searchDocuments(String keyword) {
        LambdaQueryWrapper<KbDocument> qw = new LambdaQueryWrapper<>();
        qw.eq(KbDocument::getStatus, "READY");
        if (StringUtils.hasText(keyword)) {
            qw.like(KbDocument::getTitle, keyword);
        }
        qw.orderByDesc(KbDocument::getCreateTime);
        return list(qw);
    }

    /**
     * 上传文档文件
     *
     * @param originalFilename 原始文件名
     * @param fileBytes        文件字节内容
     * @param uploadedBy       上传者 ID
     * @return 创建的文档记录
     */
    public KbDocument upload(String originalFilename, byte[] fileBytes, Long uploadedBy) {
        // 1. 提取文件类型
        String fileType = getFileType(originalFilename);

        // 2. 生成唯一存储名，防止覆盖
        String storedName = UUID.randomUUID().toString() + "." + fileType;
        Path targetPath = Paths.get(UPLOAD_DIR, storedName);

        // 3. 确保上传目录存在
        try {
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, fileBytes);
        } catch (IOException e) {
            throw new BizException(500, "文件保存失败: " + e.getMessage());
        }

        // 4. 创建数据库记录
        KbDocument doc = KbDocument.builder()
                .title(originalFilename)
                .filePath(targetPath.toString())
                .fileType(fileType)
                .chunkCount(0)
                .status("PROCESSING")
                .uploadedBy(uploadedBy)
                .build();
        save(doc);

        // 5. 异步触发 RAG 处理管线：解析 → 切片 → Embedding → 入库
        CompletableFuture.runAsync(() -> ragService.addDocument(doc));

        return doc;
    }

    /** 删除文档（同时删除物理文件，并异步重建向量索引） */
    public void deleteDocument(Long id) {
        KbDocument doc = getById(id);
        if (doc == null) {
            throw new BizException(400, "文档不存在");
        }
        // 删除物理文件
        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        } catch (IOException ignored) {
            // 文件不存在也不是大问题
        }
        // 删除数据库记录
        removeById(id);

        // 异步重建向量索引（全量重跑，确保一致性）
        CompletableFuture.runAsync(() -> ragService.rebuildIndex());
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

    /** 根据文件扩展名判断类型 */
    private String getFileType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) return "pdf";
        if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
        if (lower.endsWith(".txt")) return "txt";
        if (lower.endsWith(".md")) return "md";
        return "unknown";
    }
}
