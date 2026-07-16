package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.common.LoginAttemptCache;
import com.hhu.campusqa.common.Result;
import com.hhu.campusqa.common.RsaKeyManager;
import com.hhu.campusqa.dto.LoginRequest;
import com.hhu.campusqa.dto.RegisterRequest;
import com.hhu.campusqa.service.SysUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

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
    private final LoginAttemptCache loginAttemptCache;
    private final RsaKeyManager rsaKeyManager;
    private final Validator validator;

    public AuthController(SysUserService sysUserService,
                          LoginAttemptCache loginAttemptCache,
                          RsaKeyManager rsaKeyManager,
                          Validator validator) {
        this.sysUserService = sysUserService;
        this.loginAttemptCache = loginAttemptCache;
        this.rsaKeyManager = rsaKeyManager;
        this.validator = validator;
    }

    /** 获取 RSA 公钥（前端用于加密密码） */
    @GetMapping("/public-key")
    public Result<String> publicKey() {
        return Result.success(rsaKeyManager.getPublicKeyBase64());
    }

    /** 注册（密码由前端 RSA 加密，后端解密后再 BCrypt 存储） */
    @PostMapping("/register")
    public Result<Long> register(@RequestBody Map<String, String> body) {
        // RSA 解密密码
        decryptPassword(body);

        RegisterRequest req = new RegisterRequest();
        req.setUsername(body.get("username"));
        req.setPassword(body.get("password"));
        req.setEmail(body.get("email"));

        // 手动校验
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(req);
        if (!violations.isEmpty()) {
            String msg = violations.iterator().next().getMessage();
            throw new BizException(400, msg);
        }

        return Result.success(sysUserService.register(req));
    }

    /** 登录（密码由前端 RSA 加密，后端解密后再验证） */
    @PostMapping("/login")
    public Result<?> login(@RequestBody Map<String, String> body,
                           HttpServletRequest request) {
        String ip = getClientIp(request);

        // 检查是否被锁定
        if (loginAttemptCache.isLocked(ip)) {
            long remain = loginAttemptCache.getRemainSeconds(ip);
            throw new BizException(429, "登录失败次数过多，请 " + remain + " 秒后再试");
        }

        // RSA 解密密码
        decryptPassword(body);

        LoginRequest req = new LoginRequest();
        req.setUsername(body.get("username"));
        req.setPassword(body.get("password"));

        // 手动校验
        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(req);
        if (!violations.isEmpty()) {
            String msg = violations.iterator().next().getMessage();
            throw new BizException(400, msg);
        }

        try {
            Result<?> result = Result.success(sysUserService.login(req));
            loginAttemptCache.clearFailure(ip);
            return result;
        } catch (BizException e) {
            if (e.getCode() == 401) {
                loginAttemptCache.recordFailure(ip);
            }
            throw e;
        }
    }

    /** 解密 body 中的 password 字段（RSA 解密） */
    private void decryptPassword(Map<String, String> body) {
        String encrypted = body.get("password");
        if (encrypted != null && !encrypted.isEmpty()) {
            body.put("password", rsaKeyManager.decrypt(encrypted));
        }
    }

    /** 获取客户端真实 IP */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // X-Forwarded-For 可能包含多个 IP，取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
