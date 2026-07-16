package com.hhu.campusqa.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hhu.campusqa.entity.Message;
import org.apache.ibatis.annotations.Mapper;

/**
 * message 表 Mapper
 */
@Mapper
public interface MessageMapper extends BaseMapper<Message> {
}
