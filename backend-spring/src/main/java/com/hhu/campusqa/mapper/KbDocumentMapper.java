package com.hhu.campusqa.mapper;

import com.hhu.campusqa.entity.KbDocument;
import org.apache.ibatis.annotations.*;

import java.util.List;

/** kb_document 表 MyBatis Mapper */
@Mapper
public interface KbDocumentMapper {

    @Select("SELECT * FROM kb_document ORDER BY id DESC")
    List<KbDocument> findAll();

    @Select("SELECT * FROM kb_document WHERE id = #{id}")
    KbDocument findById(Long id);

    @Insert("INSERT INTO kb_document(title, file_path, file_type, chunk_count, status) " +
            "VALUES(#{title}, #{filePath}, #{fileType}, #{chunkCount}, #{status})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(KbDocument doc);

    @Update("UPDATE kb_document SET status = #{status}, chunk_count = #{chunkCount} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status,
                     @Param("chunkCount") Integer chunkCount);

    @Delete("DELETE FROM kb_document WHERE id = #{id}")
    int deleteById(Long id);
}
