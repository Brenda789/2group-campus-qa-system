package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.GlobalExceptionHandler;
import com.hhu.campusqa.service.SysUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    private MockMvc mockMvc;
    private final SysUserService sysUserService = mock(SysUserService.class);

    private static final Long TEST_USER_ID = 1L;

    @BeforeEach
    void setUp() {
        UserController controller = new UserController(sysUserService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ==================== 修改密码 ====================

    @Test
    void changePassword_shouldSucceed() throws Exception {
        doNothing().when(sysUserService).changePassword(eq(TEST_USER_ID), eq("oldPass1"), eq("newPass1"));

        mockMvc.perform(put("/api/user/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"oldPassword":"oldPass1","newPassword":"newPass1"}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void changePassword_shouldFail_whenOldPasswordWrong() throws Exception {
        doThrow(new BizException(400, "旧密码错误"))
                .when(sysUserService).changePassword(eq(TEST_USER_ID), eq("wrongOld"), any());

        mockMvc.perform(put("/api/user/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"oldPassword":"wrongOld","newPassword":"newPass1"}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("旧密码错误"));
    }

    @Test
    void changePassword_shouldFail_whenMissingFields() throws Exception {
        mockMvc.perform(put("/api/user/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"oldPassword":"oldPass1"}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ==================== 修改个人信息 ====================

    @Test
    void updateProfile_shouldSucceed() throws Exception {
        doNothing().when(sysUserService).updateProfile(eq(TEST_USER_ID), eq("new@hhu.edu.cn"));

        mockMvc.perform(put("/api/user/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"new@hhu.edu.cn"}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    // ==================== 当前用户信息 ====================

    @Test
    void me_shouldReturnCurrentUser() throws Exception {
        mockMvc.perform(get("/api/user/me")
                        .requestAttr("userId", 1L)
                        .requestAttr("username", "admin")
                        .requestAttr("role", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value("admin"))
                .andExpect(jsonPath("$.data.role").value("admin"));
    }
}
