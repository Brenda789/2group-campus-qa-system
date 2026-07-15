package com.hhu.campusqa.mapper;

import com.hhu.campusqa.entity.QaRecord;
import org.apache.ibatis.annotations.*;

import java.util.List;

/** qa_record 表 MyBatis Mapper */
@Mapper
public interface QaRecordMapper {

    @Select("SELECT * FROM qa_record WHERE user_id = #{userId} ORDER BY create_time DESC")
    List<QaRecord> findByUserId(Long userId);

    @Insert("INSERT INTO qa_record(user_id, question, answer, source_docs) " +
            "VALUES(#{userId}, #{question}, #{answer}, #{sourceDocs})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(QaRecord record);

    @Select("SELECT * FROM qa_record WHERE id = #{id}")
    QaRecord findById(Long id);
}
