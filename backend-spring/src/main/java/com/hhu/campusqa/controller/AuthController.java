package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.dto.LoginRequest;
import com.hhu.campusqa.dto.RegisterRequest;
import com.hhu.campusqa.service.SysUserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * 认证接口
 * <p>
 * 返回格式统一为 Result&lt;T&gt;
 * </p>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final SysUserService sysUserService;

    public AuthController(SysUserService sysUserService) {
        this.sysUserService = sysUserService;
    }

    /** 注册 */
    @PostMapping("/register")
    public Result<Long> register(@Valid @RequestBody RegisterRequest req) {
        return Result.success(sysUserService.register(req));
    }

    /** 登录 */
    @PostMapping("/login")
    public Result<?> login(@Valid @RequestBody LoginRequest req) {
        return Result.success(sysUserService.login(req));
    }
}
