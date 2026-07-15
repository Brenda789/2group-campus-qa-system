package com.hhu.campusqa.controller;

import com.hhu.campusqa.dto.ChatRequest;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.service.QaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 问答接口 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final QaService qaService;

    /** 提问 */
    @PostMapping("/ask")
    public ResponseEntity<QaRecord> ask(@Valid @RequestBody ChatRequest req,
                                        HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(qaService.ask(userId, req));
    }

    /** 问答历史 */
    @GetMapping("/history")
    public ResponseEntity<List<QaRecord>> history(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        return ResponseEntity.ok(qaService.getHistory(userId));
    }
}
