package com.hhu.campusqa.controller;

import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.service.KbDocumentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 知识库文档管理接口（管理员） */
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final KbDocumentService kbDocumentService;

    /** 文档列表 */
    @GetMapping
    public ResponseEntity<List<KbDocument>> list(HttpServletRequest request) {
        checkAdmin(request);
        return ResponseEntity.ok(kbDocumentService.listAll());
    }

    /** 删除文档 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        checkAdmin(request);
        kbDocumentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** 简易管理员权限校验 */
    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new RuntimeException("需要管理员权限");
        }
    }
}
