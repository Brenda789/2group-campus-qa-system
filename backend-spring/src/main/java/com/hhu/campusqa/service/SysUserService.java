package com.hhu.campusqa.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.dto.LoginRequest;
import com.hhu.campusqa.dto.RegisterRequest;
import com.hhu.campusqa.entity.Conversation;
import com.hhu.campusqa.entity.KbDocument;
import com.hhu.campusqa.entity.Message;
import com.hhu.campusqa.entity.QaRecord;
import com.hhu.campusqa.entity.SysUser;
import com.hhu.campusqa.mapper.ConversationMapper;
import com.hhu.campusqa.mapper.KbDocumentMapper;
import com.hhu.campusqa.mapper.MessageMapper;
import com.hhu.campusqa.mapper.QaRecordMapper;
import com.hhu.campusqa.mapper.SysUserMapper;
import com.hhu.campusqa.util.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 用户服务（继承 MyBatis-Plus ServiceImpl）
 * <p>
 * 自动拥有：save / remove / update / list / page 等 CRUD 方法
 * </p>
 */
@Slf4j
@Service
public class SysUserService extends ServiceImpl<SysUserMapper, SysUser> {

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final QaRecordMapper qaRecordMapper;
    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final KbDocumentMapper kbDocumentMapper;
    private final RagService ragService;

    public SysUserService(SysUserMapper mapper,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil,
                          QaRecordMapper qaRecordMapper,
                          ConversationMapper conversationMapper,
                          MessageMapper messageMapper,
                          KbDocumentMapper kbDocumentMapper,
                          RagService ragService) {
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.qaRecordMapper = qaRecordMapper;
        this.conversationMapper = conversationMapper;
        this.messageMapper = messageMapper;
        this.kbDocumentMapper = kbDocumentMapper;
        this.ragService = ragService;
    }

    // ==================== 注册 ====================

    /** 注册新用户（公开注册，密码已由 AuthController RSA 解密） */
    public Long register(RegisterRequest dto) {
        Long exist = lambdaQuery()
                .eq(SysUser::getUsername, dto.getUsername())
                .count();
        if (exist > 0) {
            throw new BizException(400, "用户名已存在");
        }

        SysUser user = new SysUser();
        BeanUtils.copyProperties(dto, user);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole("user");
        user.setStatus(1);
        save(user);
        return user.getId();
    }

    /** 管理员创建用户（明文密码，不走 RSA，直接 BCrypt） */
    public Long createUser(String username, String password, String email, String role) {
        Long exist = lambdaQuery()
                .eq(SysUser::getUsername, username)
                .count();
        if (exist > 0) {
            throw new BizException(400, "用户名已存在");
        }

        SysUser user = new SysUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email != null ? email : "");
        if (role != null && !role.isEmpty()) {
            String normalized = role.toLowerCase();
            if (!"admin".equals(normalized) && !"user".equals(normalized)) {
                throw new BizException(400, "角色值无效，需为 admin 或 user");
            }
            user.setRole(normalized);
        } else {
            user.setRole("user");
        }
        user.setStatus(1);
        save(user);
        return user.getId();
    }

    // ==================== 登录 ====================

    /** 登录校验，返回 token + 用户信息 */
    public Map<String, Object> login(LoginRequest dto) {
        SysUser user = lambdaQuery()
                .eq(SysUser::getUsername, dto.getUsername())
                .one();
        if (user == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BizException(401, "用户名或密码错误");
        }
        if (user.getStatus() == 0) {
            throw new BizException(403, "账号已停用，请联系管理员");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("username", user.getUsername());
        result.put("role", user.getRole());
        return result;
    }

    // ==================== 管理 ====================

    /** 分页查询用户列表（支持关键词搜索） */
    public Page<SysUser> pageUsers(int page, int size, String keyword) {
        LambdaQueryWrapper<SysUser> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            qw.like(SysUser::getUsername, keyword);
        }
        qw.orderByDesc(SysUser::getCreateTime);
        return this.page(new Page<>(page, size), qw);
    }

    /** 修改个人信息（邮箱等，用户名不可改） */
    public void updateProfile(Long userId, String email) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new BizException(400, "用户不存在");
        }
        user.setEmail(email);
        updateById(user);
    }

    /** 修改密码 */
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        SysUser user = getById(userId);
        if (user == null) {
            throw new BizException(400, "用户不存在");
        }
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BizException(400, "旧密码错误");
        }
        if (oldPassword.equals(newPassword)) {
            throw new BizException(400, "新密码不能与旧密码相同");
        }
        if (newPassword.length() < 6 || newPassword.length() > 20) {
            throw new BizException(400, "新密码长度需在6-20位之间");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        updateById(user);
    }

    /** 编辑用户信息（邮箱、角色），用户名不可改 */
    public void updateUser(Long id, String email, String role) {
        SysUser user = getById(id);
        if (user == null) {
            throw new BizException(400, "用户不存在");
        }
        if (email != null) {
            user.setEmail(email);
        }
        if (role != null) {
            String normalized = role.toLowerCase();
            if (!"admin".equals(normalized) && !"user".equals(normalized)) {
                throw new BizException(400, "角色值无效，需为 admin 或 user");
            }
            user.setRole(normalized);
        }
        updateById(user);
    }

    /** 启停用户（管理员不能停用自己的账号） */
    public void toggleUserStatus(Long id, Integer status, Long operatorId) {
        SysUser user = getById(id);
        if (user == null) {
            throw new BizException(400, "用户不存在");
        }
        if (id.equals(operatorId)) {
            throw new BizException(400, "不能停用自己的账号");
        }
        user.setStatus(status);
        updateById(user);
    }

    /** 管理员重置用户密码为 "admin123"（不能重置自己的密码） */
    public void resetUserPassword(Long id, Long operatorId) {
        SysUser user = getById(id);
        if (user == null) {
            throw new BizException(400, "用户不存在");
        }
        if (id.equals(operatorId)) {
            throw new BizException(400, "不能重置自己的密码，请使用个人管理的修改密码功能");
        }
        user.setPassword(passwordEncoder.encode("admin123"));
        updateById(user);
    }

    /** 硬删除用户（管理员不能删除自己，但可以删除其他管理员） */
    @Transactional
    public void hardDeleteUser(Long id, Long operatorId) {
        SysUser user = getById(id);
        if (user == null) {
            throw new BizException(400, "用户不存在");
        }
        if (id.equals(operatorId)) {
            throw new BizException(400, "不能删除自己的账号");
        }
        removeById(id);
    }

    // ==================== 访客用户管理 ====================

    /** 创建访客用户，返回 token + 用户信息 */
    @Transactional
    public Map<String, Object> createGuestUser() {
        String guestId = UUID.randomUUID().toString().substring(0, 8);
        String username = "guest_" + guestId;
        String rawPassword = UUID.randomUUID().toString();

        SysUser user = new SysUser();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setEmail("");
        user.setRole("guest");
        user.setStatus(1);
        save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), "guest");
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("username", user.getUsername());
        result.put("role", "guest");
        result.put("userId", user.getId());
        return result;
    }

    /** 删除访客用户及其所有关联数据（问答记录、会话、消息、文档、物理文件） */
    @Transactional
    public void cleanupGuestUser(Long userId) {
        SysUser user = getById(userId);
        if (user == null || !"guest".equals(user.getRole())) {
            return;
        }

        // 1) 问答记录
        qaRecordMapper.delete(new LambdaQueryWrapper<QaRecord>()
                .eq(QaRecord::getUserId, userId));

        // 2) 会话及消息
        List<Conversation> convs = conversationMapper.selectList(
                new LambdaQueryWrapper<Conversation>()
                        .eq(Conversation::getUserId, userId));
        for (Conversation conv : convs) {
            messageMapper.delete(new LambdaQueryWrapper<Message>()
                    .eq(Message::getConversationId, conv.getId()));
        }
        conversationMapper.delete(new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId));

        // 3) 文档 + 物理文件 + 向量
        List<KbDocument> docs = kbDocumentMapper.selectList(
                new LambdaQueryWrapper<KbDocument>()
                        .eq(KbDocument::getUploadedBy, userId));
        for (KbDocument doc : docs) {
            // 移除向量库中的切片
            ragService.removeDocumentVectors(doc.getTitle());
            try {
                Files.deleteIfExists(Paths.get(doc.getFilePath()));
            } catch (IOException e) {
                log.warn("访客文档物理文件删除失败: {}", doc.getFilePath(), e);
            }
        }
        kbDocumentMapper.delete(new LambdaQueryWrapper<KbDocument>()
                .eq(KbDocument::getUploadedBy, userId));

        // 4) 删除用户本身
        removeById(userId);
        log.info("访客用户 {} (id={}) 及其所有关联数据已清理", user.getUsername(), userId);
    }
}
