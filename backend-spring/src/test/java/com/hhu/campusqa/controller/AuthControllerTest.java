package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.GlobalExceptionHandler;
import com.hhu.campusqa.common.LoginAttemptCache;
import com.hhu.campusqa.common.RsaKeyManager;
import com.hhu.campusqa.service.SysUserService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {

    private MockMvc mockMvc;
    private final SysUserService sysUserService = mock(SysUserService.class);
    private final LoginAttemptCache loginAttemptCache = mock(LoginAttemptCache.class);
    private final RsaKeyManager rsaKeyManager = mock(RsaKeyManager.class);
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @BeforeEach
    void setUp() {
        // 测试中不真实解密，直接返回原文
        when(rsaKeyManager.decrypt(any())).thenAnswer(inv -> inv.getArgument(0));
        when(rsaKeyManager.getPublicKeyBase64()).thenReturn("test-public-key-base64");

        AuthController controller = new AuthController(
                sysUserService, loginAttemptCache, rsaKeyManager, validator);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ==================== 注册 ====================

    @Test
    void register_shouldSucceed() throws Exception {
        when(sysUserService.register(any())).thenReturn(1L);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"testuser","password":"pass1234","email":"test@hhu.edu.cn"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value(1));
    }

    @Test
    void register_shouldFail_whenPasswordTooShort() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"testuser","password":"ab1","email":"test@hhu.edu.cn"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void register_shouldFail_whenPasswordNoDigit() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"testuser","password":"abcdefgh","email":"test@hhu.edu.cn"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void register_shouldFail_whenPasswordNoLetter() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"testuser","password":"12345678","email":"test@hhu.edu.cn"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ==================== 公钥 ====================

    @Test
    void publicKey_shouldReturnBase64Key() throws Exception {
        mockMvc.perform(get("/api/auth/public-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").value("test-public-key-base64"));
    }

    // ==================== 登录 ====================

    @Test
    void login_shouldSucceed() throws Exception {
        when(loginAttemptCache.isLocked(any())).thenReturn(false);
        when(sysUserService.login(any())).thenReturn(Map.of(
                "token", "jwt-token-xxx",
                "username", "testuser",
                "role", "user"
        ));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"testuser","password":"pass1234"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").value("jwt-token-xxx"));
    }

    @Test
    void login_shouldFail_whenEmptyUsername() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"","password":"pass1234"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }
}
