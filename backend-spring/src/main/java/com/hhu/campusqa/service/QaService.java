package com.hhu.campusqa.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.entity.Conversation;
import com.hhu.campusqa.entity.Message;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.mapper.ConversationMapper;
import com.hhu.campusqa.mapper.MessageMapper;
import com.hhu.campusqa.mapper.QaRecordMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * 问答服务
 * <p>
 * 同时维护 qa_record（汇总记录）和 conversation + message（详情）两套表。
 * </p>
 */
@Slf4j
@Service
public class QaService extends ServiceImpl<QaRecordMapper, QaRecord> {

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final RagService ragService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public QaService(QaRecordMapper mapper,
                     ConversationMapper conversationMapper,
                     MessageMapper messageMapper,
                     RagService ragService) {
        this.conversationMapper = conversationMapper;
        this.messageMapper = messageMapper;
        this.ragService = ragService;
    }

    // ==================== QaRecord（汇总） ====================

    /** 查询某用户的问答历史（支持问题关键词模糊搜索） */
    public List<QaRecord> getHistory(Long userId, String keyword) {
        LambdaQueryWrapper<QaRecord> qw = new LambdaQueryWrapper<>();
        qw.eq(QaRecord::getUserId, userId);
        if (StringUtils.hasText(keyword)) {
            qw.like(QaRecord::getQuestion, keyword);
        }
        qw.orderByDesc(QaRecord::getCreateTime);
        return list(qw);
    }

    /** 删除问答记录（仅所属用户可操作） */
    public void deleteQaRecord(Long id, Long userId) {
        QaRecord record = getById(id);
        if (record == null) {
            throw new BizException(400, "问答记录不存在");
        }
        if (!record.getUserId().equals(userId)) {
            throw new BizException(403, "只能删除自己的问答记录");
        }
        removeById(id);
    }

    /** 对问答记录点赞/踩（仅所属用户可操作） */
    public void updateFeedback(Long id, Long userId, Integer feedback) {
        if (feedback == null || (feedback != 1 && feedback != -1 && feedback != 0)) {
            throw new BizException(400, "feedback 必须为 1（赞）、-1（踩）或 0（取消）");
        }
        QaRecord record = getById(id);
        if (record == null) {
            throw new BizException(400, "问答记录不存在");
        }
        if (!record.getUserId().equals(userId)) {
            throw new BizException(403, "只能评价自己的问答");
        }
        record.setFeedback(feedback);
        updateById(record);
    }

    /** 分页查询当前用户的问答记录（支持问题和回答关键字模糊搜索） */
    public Page<QaRecord> pageUserQaRecords(Long userId, int page, int size, String keyword) {
        LambdaQueryWrapper<QaRecord> qw = new LambdaQueryWrapper<>();
        qw.eq(QaRecord::getUserId, userId);
        if (StringUtils.hasText(keyword)) {
            qw.and(w -> w.like(QaRecord::getQuestion, keyword)
                          .or()
                          .like(QaRecord::getAnswer, keyword));
        }
        qw.orderByDesc(QaRecord::getCreateTime);
        return this.page(new Page<>(page, size), qw);
    }

    /**
     * 问答处理 — 调用 RAG 引擎，返回基于知识库的答案
     *
     * @param userId         用户 ID（所有用户包括访客都有 userId）
     * @param question       用户问题
     * @param conversationId 会话 ID（可为 null）
     */
    @Transactional
    public QaRecord ask(Long userId, String question, Long conversationId) {
        // 1. 调用 RAG 引擎获取答案（userId 用于文档可见性过滤）
        AnswerService.AnswerResult ragResult = ragService.answer(question, userId);
        String answer = ragResult.answer();
        String sourceDocs;
        try {
            sourceDocs = objectMapper.writeValueAsString(ragResult.sources());
        } catch (JsonProcessingException e) {
            log.error("来源序列化失败", e);
            sourceDocs = "[]";
        }

        // 2. 如果没有传入 conversationId，先创建新会话（避免后续 UPDATE 不存在的列）
        if (conversationId == null) {
            Conversation conv = Conversation.builder()
                    .userId(userId)
                    .title(question.length() > 30 ? question.substring(0, 30) + "..." : question)
                    .build();
            conversationMapper.insert(conv);
            conversationId = conv.getId();
        }

        // 3. 保存到 qa_record（汇总表）——所有用户（含访客）都存库
        QaRecord record = QaRecord.builder()
                .userId(userId)
                .conversationId(conversationId)
                .question(question)
                .answer(answer)
                .sourceDocs(sourceDocs)
                .build();
        save(record);

        // 4. 保存用户消息
        Message userMsg = Message.builder()
                .conversationId(conversationId)
                .role("user")
                .content(question)
                .build();
        messageMapper.insert(userMsg);

        // 5. 保存 AI 回复
        Message aiMsg = Message.builder()
                .conversationId(conversationId)
                .role("assistant")
                .content(record.getAnswer())
                .sources(sourceDocs)
                .build();
        messageMapper.insert(aiMsg);

        // 6. 更新会话的 updateTime（用于按最后活动时间排序）
        Conversation conv = conversationMapper.selectById(conversationId);
        if (conv != null) {
            conv.setUpdateTime(java.time.LocalDateTime.now());
            conversationMapper.updateById(conv);
        }

        return record;
    }

    /**
     * 流式问答完成后保存记录（由 ChatController 异步调用）。
     * <p>
     * 与 {@link #ask} 类似，但不会再次调用 RAG 引擎。
     * </p>
     *
     * @param userId         用户 ID
     * @param conversationId 会话 ID（null 则自动创建新会话）
     * @param question       用户问题
     * @param answer         RAG 完整答案
     * @param sources        来源文档标题列表
     * @return 会话 ID
     */
    @Transactional
    public Long saveStreamQa(Long userId, Long conversationId, String question,
                              String answer, List<String> sources) {
        String sourceDocs;
        try {
            sourceDocs = objectMapper.writeValueAsString(sources);
        } catch (JsonProcessingException e) {
            log.error("来源序列化失败", e);
            sourceDocs = "[]";
        }

        // 如果没有传入 conversationId，自动创建新会话
        if (conversationId == null) {
            Conversation conv = Conversation.builder()
                    .userId(userId)
                    .title(question.length() > 30 ? question.substring(0, 30) + "..." : question)
                    .build();
            conversationMapper.insert(conv);
            conversationId = conv.getId();
        }

        // 保存 qa_record
        QaRecord record = QaRecord.builder()
                .userId(userId)
                .conversationId(conversationId)
                .question(question)
                .answer(answer)
                .sourceDocs(sourceDocs)
                .build();
        save(record);

        // 保存用户消息
        Message userMsg = Message.builder()
                .conversationId(conversationId)
                .role("user")
                .content(question)
                .build();
        messageMapper.insert(userMsg);

        // 保存 AI 回复
        Message aiMsg = Message.builder()
                .conversationId(conversationId)
                .role("assistant")
                .content(answer)
                .sources(sourceDocs)
                .build();
        messageMapper.insert(aiMsg);

        // 更新会话的 updateTime
        Conversation conv = conversationMapper.selectById(conversationId);
        if (conv != null) {
            conv.setUpdateTime(java.time.LocalDateTime.now());
            conversationMapper.updateById(conv);
        }

        return conversationId;
    }

    // ==================== Conversation（会话） ====================

    /** 重命名会话（仅所属用户可操作） */
    public void renameConversation(Long conversationId, Long userId, String newTitle) {
        if (newTitle == null || newTitle.isBlank()) {
            throw new BizException(400, "标题不能为空");
        }
        if (newTitle.length() > 100) {
            throw new BizException(400, "标题不能超过100个字符");
        }
        Conversation conv = conversationMapper.selectById(conversationId);
        if (conv == null || !conv.getUserId().equals(userId)) {
            throw new BizException(403, "无权操作该会话");
        }
        conv.setTitle(newTitle);
        conv.setUpdateTime(java.time.LocalDateTime.now());
        conversationMapper.updateById(conv);
    }

    /** 创建新会话，返回会话 ID */
    public Long createConversation(Long userId, String question) {
        Conversation conv = Conversation.builder()
                .userId(userId)
                .title(question.length() > 30 ? question.substring(0, 30) + "..." : question)
                .build();
        conversationMapper.insert(conv);
        return conv.getId();
    }

    /** 查询某用户的会话列表（支持按标题关键字模糊搜索） */
    public List<Conversation> getConversations(Long userId, String keyword) {
        LambdaQueryWrapper<Conversation> qw = new LambdaQueryWrapper<>();
        qw.eq(Conversation::getUserId, userId);
        if (StringUtils.hasText(keyword)) {
            qw.like(Conversation::getTitle, keyword);
        }
        qw.orderByDesc(Conversation::getUpdateTime);
        List<Conversation> list = conversationMapper.selectList(qw);
        fillConversationCounts(list);
        return list;
    }

    /** 分页查询某用户的会话列表（含消息数 + 问题数统计），用于问答记录管理 */
    public Page<Conversation> pageConversations(Long userId, int page, int size, String keyword) {
        LambdaQueryWrapper<Conversation> qw = new LambdaQueryWrapper<>();
        qw.eq(Conversation::getUserId, userId);
        if (StringUtils.hasText(keyword)) {
            qw.like(Conversation::getTitle, keyword);
        }
        qw.orderByDesc(Conversation::getUpdateTime);
        Page<Conversation> result = conversationMapper.selectPage(new Page<>(page, size), qw);
        fillConversationCounts(result.getRecords());
        return result;
    }

    /** 为会话列表填充 messageCount 和 questionCount */
    private void fillConversationCounts(List<Conversation> conversations) {
        if (conversations == null || conversations.isEmpty()) return;
        for (Conversation conv : conversations) {
            // 总消息数
            Long totalMsgs = messageMapper.selectCount(
                    new LambdaQueryWrapper<Message>()
                            .eq(Message::getConversationId, conv.getId()));
            // 问题数（role = 'user'）
            Long userMsgs = messageMapper.selectCount(
                    new LambdaQueryWrapper<Message>()
                            .eq(Message::getConversationId, conv.getId())
                            .eq(Message::getRole, "user"));
            conv.setMessageCount(totalMsgs.intValue());
            conv.setQuestionCount(userMsgs.intValue());
        }
    }

    /** 删除会话及其所有消息和关联的问答记录 */
    @Transactional
    public void deleteConversation(Long conversationId, Long userId) {
        Conversation conv = conversationMapper.selectById(conversationId);
        if (conv == null || !conv.getUserId().equals(userId)) {
            throw new BizException(403, "无权操作该会话");
        }
        // 删除关联的 qa_record
        remove(new LambdaQueryWrapper<QaRecord>()
                .eq(QaRecord::getConversationId, conversationId));
        // 删除消息
        messageMapper.delete(new LambdaQueryWrapper<Message>()
                .eq(Message::getConversationId, conversationId));
        // 删除会话
        conversationMapper.deleteById(conversationId);
    }

    /** 查询某会话的所有消息 */
    public List<Message> getMessages(Long conversationId) {
        return messageMapper.selectList(
                new LambdaQueryWrapper<Message>()
                        .eq(Message::getConversationId, conversationId)
                        .orderByAsc(Message::getCreateTime)
        );
    }
}
