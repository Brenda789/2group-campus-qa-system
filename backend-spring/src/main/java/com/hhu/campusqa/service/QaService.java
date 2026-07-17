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

    /** 管理端：分页查询所有用户问答记录 */
    public Page<QaRecord> pageAllQaRecords(int page, int size) {
        return this.page(
                new Page<>(page, size),
                new LambdaQueryWrapper<QaRecord>()
                        .orderByDesc(QaRecord::getCreateTime)
        );
    }

    /**
     * 问答处理 — 调用 RAG 引擎，返回基于知识库的答案
     *
     * @param userId         用户 ID（匿名时为 null）
     * @param question       用户问题
     * @param conversationId 会话 ID（匿名时为 null）
     */
    @Transactional
    public QaRecord ask(Long userId, String question, Long conversationId) {
        // 1. 调用 RAG 引擎获取答案
        AnswerService.AnswerResult ragResult = ragService.answer(question);
        String answer = ragResult.answer();
        String sourceDocs;
        try {
            sourceDocs = objectMapper.writeValueAsString(ragResult.sources());
        } catch (JsonProcessingException e) {
            log.error("来源序列化失败", e);
            sourceDocs = "[]";
        }

        // 匿名模式：不存库，直接返回结果对象
        if (userId == null) {
            QaRecord record = new QaRecord();
            record.setQuestion(question);
            record.setAnswer(answer);
            record.setSourceDocs(sourceDocs);
            return record;
        }

        // 2. 保存到 qa_record（汇总表）
        QaRecord record = QaRecord.builder()
                .userId(userId)
                .conversationId(conversationId)
                .question(question)
                .answer(answer)
                .sourceDocs(sourceDocs)
                .build();
        save(record);

        // 3. 如果没有传入 conversationId，自动创建新会话
        if (conversationId == null) {
            Conversation conv = Conversation.builder()
                    .userId(userId)
                    .title(question.length() > 30 ? question.substring(0, 30) + "..." : question)
                    .build();
            conversationMapper.insert(conv);
            conversationId = conv.getId();
        }

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

        return record;
    }

    // ==================== Conversation（会话） ====================

    /** 查询某用户的会话列表 */
    public List<Conversation> getConversations(Long userId) {
        return conversationMapper.selectList(
                new LambdaQueryWrapper<Conversation>()
                        .eq(Conversation::getUserId, userId)
                        .orderByDesc(Conversation::getUpdateTime)
        );
    }

    /** 删除会话及其所有消息 */
    @Transactional
    public void deleteConversation(Long conversationId, Long userId) {
        Conversation conv = conversationMapper.selectById(conversationId);
        if (conv == null || !conv.getUserId().equals(userId)) {
            throw new BizException(403, "无权操作该会话");
        }
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
