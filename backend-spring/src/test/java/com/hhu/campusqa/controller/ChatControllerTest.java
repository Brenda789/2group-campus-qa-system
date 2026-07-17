package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.GlobalExceptionHandler;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.service.QaService;
import com.hhu.campusqa.service.RagService;
import com.hhu.campusqa.service.SysUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChatControllerTest {

    private MockMvc mockMvc;
    private final QaService qaService = mock(QaService.class);
    private final RagService ragService = mock(RagService.class);
    private final SysUserService sysUserService = mock(SysUserService.class);

    private static final Long TEST_USER_ID = 1L;

    @BeforeEach
    void setUp() {
        ChatController controller = new ChatController(qaService, ragService, sysUserService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ==================== 提问 ====================

    @Test
    void ask_shouldSucceed() throws Exception {
        QaRecord record = QaRecord.builder()
                .id(1L).userId(TEST_USER_ID).question("测试问题")
                .answer("测试答案").sourceDocs("[]").build();
        when(qaService.ask(eq(TEST_USER_ID), eq("测试问题"), isNull())).thenReturn(record);

        mockMvc.perform(post("/api/chat/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"question":"测试问题"}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.answer").value("测试答案"));
    }

    @Test
    void ask_shouldFail_whenQuestionEmpty() throws Exception {
        mockMvc.perform(post("/api/chat/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"question":""}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ==================== 历史搜索 ====================

    @Test
    void history_withoutKeyword_shouldReturnAll() throws Exception {
        QaRecord record = QaRecord.builder()
                .id(1L).userId(TEST_USER_ID).question("问题1").answer("答案1").build();
        when(qaService.getHistory(eq(TEST_USER_ID), isNull())).thenReturn(List.of(record));

        mockMvc.perform(get("/api/chat/history")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].question").value("问题1"));
    }

    @Test
    void history_withKeyword_shouldFilter() throws Exception {
        when(qaService.getHistory(eq(TEST_USER_ID), eq("奖学金")))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/chat/history")
                        .param("keyword", "奖学金")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    // ==================== 点赞/踩 ====================

    @Test
    void feedback_like_shouldSucceed() throws Exception {
        doNothing().when(qaService).updateFeedback(1L, TEST_USER_ID, 1);

        mockMvc.perform(put("/api/chat/1/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"feedback":1}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void feedback_dislike_shouldSucceed() throws Exception {
        doNothing().when(qaService).updateFeedback(1L, TEST_USER_ID, -1);

        mockMvc.perform(put("/api/chat/1/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"feedback":-1}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));
    }

    @Test
    void feedback_onOtherUser_shouldFail() throws Exception {
        doThrow(new BizException(403, "只能评价自己的问答"))
                .when(qaService).updateFeedback(eq(99L), eq(TEST_USER_ID), anyInt());

        mockMvc.perform(put("/api/chat/99/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"feedback":1}""")
                        .requestAttr("userId", TEST_USER_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(403));
    }
}
