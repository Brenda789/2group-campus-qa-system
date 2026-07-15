package com.hhu.campusqa.service;

import com.hhu.campusqa.dto.LoginRequest;
import com.hhu.campusqa.dto.RegisterRequest;
import com.hhu.campusqa.entity.SysUser;
import com.hhu.campusqa.mapper.SysUserMapper;
import com.hhu.campusqa.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 用户服务 */
@Service
@RequiredArgsConstructor
public class SysUserService {

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /** 注册 */
    public Map<String, Object> register(RegisterRequest req) {
        if (sysUserMapper.findByUsername(req.getUsername()) != null) {
            throw new RuntimeException("用户名已存在");
        }
        SysUser user = SysUser.builder()
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))
                .email(req.getEmail())
                .role("user")
                .status(1)
                .build();
        sysUserMapper.insert(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", toUserMap(user));
        return result;
    }

    /** 登录 */
    public Map<String, Object> login(LoginRequest req) {
        SysUser user = sysUserMapper.findByUsername(req.getUsername());
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        if (user.getStatus() == 0) {
            throw new RuntimeException("账号已停用");
        }
        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", toUserMap(user));
        return result;
    }

    /** 管理员：用户列表 */
    public List<SysUser> listUsers() {
        return sysUserMapper.findAll();
    }

    /** 管理员：启停用户 */
    public void toggleUser(Long id, Integer status) {
        sysUserMapper.updateStatus(id, status);
    }

    private Map<String, Object> toUserMap(SysUser user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail());
        map.put("role", user.getRole());
        map.put("status", user.getStatus());
        map.put("createTime", user.getCreateTime());
        return map;
    }
}
