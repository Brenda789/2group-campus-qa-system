package com.hhu.campusqa.service;

import com.hhu.campusqa.dto.ChatRequest;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.mapper.QaRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** 问答服务 */
@Service
@RequiredArgsConstructor
public class QaService {

    private final QaRecordMapper qaRecordMapper;

    /** 查询用户的问答历史 */
    public List<QaRecord> getHistory(Long userId) {
        return qaRecordMapper.findByUserId(userId);
    }

    /**
     * 问答处理（Day 1 先返回占位，后续 Day 3/4 接入 RAG）
     */
    public QaRecord ask(Long userId, ChatRequest req) {
        QaRecord record = QaRecord.builder()
                .userId(userId)
                .question(req.getQuestion())
                .answer("（RAG 引擎接入中，后续版本将返回智能回答）")
                .sourceDocs("[]")
                .build();
        qaRecordMapper.insert(record);
        return record;
    }
}
