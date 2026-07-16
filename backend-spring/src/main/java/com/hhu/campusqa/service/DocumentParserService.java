package com.hhu.campusqa.service;

import com.hhu.campusqa.common.BizException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 文档解析服务
 * <p>
 * 将上传的 PDF / DOCX / TXT / MD 文件内容提取为纯文本，
 * 为后续文本切片、向量化提供统一输入。
 * </p>
 */
@Slf4j
@Service
public class DocumentParserService {

    /**
     * 解析文档文件，返回纯文本内容
     *
     * @param filePath 文件在磁盘上的完整路径
     * @param fileType 文件类型：pdf / docx / txt / md
     * @return 提取的纯文本（UTF-8）
     */
    public String parse(String filePath, String fileType) {
        if (filePath == null || filePath.isBlank()) {
            throw new BizException(400, "文件路径不能为空");
        }

        String lowerType = fileType != null ? fileType.toLowerCase() : "";

        return switch (lowerType) {
            case "pdf"  -> parsePdf(filePath);
            case "docx" -> parseDocx(filePath);
            case "txt"  -> parseText(filePath);
            case "md"   -> parseText(filePath); // Markdown 按纯文本读取
            default -> throw new BizException(400, "不支持的文件类型: " + fileType);
        };
    }

    // ==================== PDF 解析 ====================

    /**
     * 使用 Apache PDFBox 逐页提取 PDF 文本
     */
    private String parsePdf(String filePath) {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new BizException(400, "文件不存在: " + filePath);
        }
        try (var pdf = Loader.loadPDF(file)) {
            var stripper = new PDFTextStripper();
            stripper.setSortByPosition(true); // 按视觉位置排序
            String text = stripper.getText(pdf);
            log.info("PDF 解析完成: {} → {} 字符", file.getName(), text.length());
            return cleanText(text);
        } catch (IOException e) {
            log.error("PDF 解析失败: {}", filePath, e);
            throw new BizException(500, "PDF 文件解析失败: " + e.getMessage());
        }
    }

    // ==================== DOCX 解析 ====================

    /**
     * 使用 Apache POI 提取 DOCX 段落文本
     */
    private String parseDocx(String filePath) {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new BizException(400, "文件不存在: " + filePath);
        }
        try (var fis = new FileInputStream(file);
             var doc = new XWPFDocument(fis);
             var extractor = new XWPFWordExtractor(doc)) {
            String text = extractor.getText();
            log.info("DOCX 解析完成: {} → {} 字符", file.getName(), text.length());
            return cleanText(text);
        } catch (IOException e) {
            log.error("DOCX 解析失败: {}", filePath, e);
            throw new BizException(500, "DOCX 文件解析失败: " + e.getMessage());
        }
    }

    // ==================== TXT / MD 解析 ====================

    /**
     * 读取纯文本文件（TXT / Markdown 通用）
     */
    private String parseText(String filePath) {
        try {
            String text = Files.readString(Path.of(filePath), StandardCharsets.UTF_8);
            log.info("文本文件读取完成: {} → {} 字符", Path.of(filePath).getFileName(), text.length());
            return cleanText(text);
        } catch (IOException e) {
            log.error("文本文件读取失败: {}", filePath, e);
            throw new BizException(500, "文本文件读取失败: " + e.getMessage());
        }
    }

    // ==================== 文本清洗 ====================

    /**
     * 规范化文本：
     * - 合并连续空行
     * - 去除控制字符（保留换行符）
     */
    private String cleanText(String text) {
        if (text == null || text.isBlank()) {
            throw new BizException(400, "文档内容为空，无法解析");
        }
        return text
                .replace("\r\n", "\n")   // 统一换行符
                .replace("\r", "\n")
                .replaceAll("\n{3,}", "\n\n")  // 合并多空行为双空行
                .replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "") // 去除控制字符
                .trim();
    }
}
