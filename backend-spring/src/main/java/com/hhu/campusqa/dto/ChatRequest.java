package com.hhu.campusqa.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** 问答请求 */
@Data
public class ChatRequest {
    @NotBlank(message = "问题不能为空")
    private String question;

    private Long conversationId;  // 预留：多轮对话
}
