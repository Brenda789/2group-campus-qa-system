package com.hhu.campusqa.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hhu.campusqa.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;

/**
 * sys_user 表 Mapper（继承 MyBatis-Plus BaseMapper）
 * <p>
 * 继承后自动拥有：insert / deleteById / updateById / selectById / selectList 等
 * 无需手写 SQL。
 * </p>
 */
@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {
}
