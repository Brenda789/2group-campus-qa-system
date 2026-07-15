package com.hhu.campusqa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** 注册请求 */
@Data
public class RegisterRequest {
    @NotBlank @Size(min = 2, max = 50)
    private String username;

    @NotBlank @Size(min = 6, max = 100)
    private String password;

    private String email;
}
