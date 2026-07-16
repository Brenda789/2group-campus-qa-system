package com.hhu.campusqa.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hhu.campusqa.entity.Conversation;
import org.apache.ibatis.annotations.Mapper;

/**
 * conversation 表 Mapper
 */
@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {
}
