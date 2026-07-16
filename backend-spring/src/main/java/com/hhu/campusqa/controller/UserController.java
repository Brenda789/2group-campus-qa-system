package com.hhu.campusqa.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.entity.SysUser;
import com.hhu.campusqa.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 用户管理接口（管理员）
 */
@RestController
@RequestMapping("/api/user")
public class UserController {

    private final SysUserService sysUserService;

    public UserController(SysUserService sysUserService) {
        this.sysUserService = sysUserService;
    }

    /** 分页查询用户列表 */
    @GetMapping("/list")
    public Result<Page<SysUser>> list(@RequestParam(defaultValue = "1") int page,
                                       @RequestParam(defaultValue = "10") int size,
                                       @RequestParam(required = false) String keyword) {
        return Result.success(sysUserService.pageUsers(page, size, keyword));
    }

    /** 启停用户 */
    @PutMapping("/{id}/status")
    public Result<Void> toggleStatus(@PathVariable Long id,
                                      @RequestBody Map<String, Integer> body,
                                      HttpServletRequest request) {
        checkAdmin(request);
        Integer status = body.get("status");
        if (status == null || (status != 0 && status != 1)) {
            throw new BizException(400, "status 必须为 0 或 1");
        }
        sysUserService.toggleUserStatus(id, status);
        return Result.success();
    }

    /** 删除用户（软删除） */
    @DeleteMapping("/{id}")
    public Result<Void> deleteUser(@PathVariable Long id, HttpServletRequest request) {
        checkAdmin(request);
        // 软删除：将 status 设为 0
        sysUserService.toggleUserStatus(id, 0);
        return Result.success();
    }

    /** 修改密码 */
    @PutMapping("/password")
    public Result<Void> changePassword(@RequestBody Map<String, String> body,
                                        HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");
        if (oldPassword == null || newPassword == null) {
            throw new BizException(400, "旧密码和新密码不能为空");
        }
        sysUserService.changePassword(userId, oldPassword, newPassword);
        return Result.success();
    }

    /** 修改个人信息 */
    @PutMapping("/profile")
    public Result<Void> updateProfile(@RequestBody Map<String, String> body,
                                       HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String email = body.get("email");
        sysUserService.updateProfile(userId, email);
        return Result.success();
    }

    /** 获取当前用户信息 */
    @GetMapping("/me")
    public Result<?> me(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        String username = (String) request.getAttribute("username");
        String role = (String) request.getAttribute("role");
        return Result.success(Map.of("id", userId, "username", username, "role", role));
    }

    private void checkAdmin(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (!"admin".equals(role)) {
            throw new BizException(403, "仅管理员可用");
        }
    }
}
