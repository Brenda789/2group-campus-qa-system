package com.hhu.campusqa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 问答请求 */
@Data
public class ChatRequest {
    @NotBlank(message = "问题不能为空")
    @Size(max = 2000, message = "问题长度不能超过2000个字符")
    private String question;

    private Long conversationId;  // 预留：多轮对话
}
