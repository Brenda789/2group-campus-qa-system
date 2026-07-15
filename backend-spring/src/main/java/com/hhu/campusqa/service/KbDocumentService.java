package com.hhu.campusqa.service;

import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.mapper.KbDocumentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** 知识库文档服务 */
@Service
@RequiredArgsConstructor
public class KbDocumentService {

    private final KbDocumentMapper kbDocumentMapper;

    public List<KbDocument> listAll() {
        return kbDocumentMapper.findAll();
    }

    public KbDocument getById(Long id) {
        return kbDocumentMapper.findById(id);
    }

    public KbDocument upload(String title, String filePath, String fileType) {
        KbDocument doc = KbDocument.builder()
                .title(title)
                .filePath(filePath)
                .fileType(fileType)
                .chunkCount(0)
                .status("PROCESSING")
                .build();
        kbDocumentMapper.insert(doc);
        return doc;
    }

    public void delete(Long id) {
        kbDocumentMapper.deleteById(id);
    }

    public void updateStatus(Long id, String status, Integer chunkCount) {
        kbDocumentMapper.updateStatus(id, status, chunkCount);
    }
}
