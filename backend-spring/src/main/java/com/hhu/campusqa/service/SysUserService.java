package com.hhu.campusqa.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.dto.LoginRequest;
import com.hhu.campusqa.dto.RegisterRequest;
import com.hhu.campusqa.entity.SysUser;
import com.hhu.campusqa.mapper.SysUserMapper;
import com.hhu.campusqa.util.JwtUtil;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;

/**
 * 用户服务（继承 MyBatis-Plus ServiceImpl）
 * <p>
 * 自动拥有：save / remove / update / list / page 等 CRUD 方法
 * </p>
 */
@Service
public class SysUserService extends ServiceImpl<SysUserMapper, SysUser> {

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public SysUserService(SysUserMapper mapper, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    // ==================== 注册 ====================

    /** 注册新用户 */
    public Long register(RegisterRequest dto) {
        // 检查用户名是否已存在
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
        save(user);  // MyBatis-Plus 自动填充 createTime
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

    /** 启停用户 */
    public void toggleUserStatus(Long id, Integer status) {
        SysUser user = getById(id);
        if (user == null) {
            throw new BizException(400, "用户不存在");
        }
        user.setStatus(status);
        updateById(user);
    }
}
