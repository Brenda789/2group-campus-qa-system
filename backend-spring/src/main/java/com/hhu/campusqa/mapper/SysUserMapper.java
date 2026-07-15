package com.hhu.campusqa.mapper;

import com.hhu.campusqa.entity.SysUser;
import org.apache.ibatis.annotations.*;

/** sys_user 表 MyBatis Mapper */
@Mapper
public interface SysUserMapper {

    @Select("SELECT * FROM sys_user WHERE username = #{username}")
    SysUser findByUsername(String username);

    @Select("SELECT * FROM sys_user WHERE id = #{id}")
    SysUser findById(Long id);

    @Insert("INSERT INTO sys_user(username, password, email, role, status) " +
            "VALUES(#{username}, #{password}, #{email}, #{role}, #{status})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(SysUser user);

    @Select("SELECT * FROM sys_user ORDER BY create_time DESC")
    java.util.List<SysUser> findAll();

    @Update("UPDATE sys_user SET status = #{status} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
}
