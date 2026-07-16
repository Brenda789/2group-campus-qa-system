package com.hhu.campusqa.interceptor;

import com.hhu.campusqa.common.BizException;
import com.hhu.campusqa.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * JWT 认证拦截器（替代旧版 JwtAuthFilter）
 * <p>
 * 在请求到达 Controller 前校验 Authorization: Bearer &lt;token&gt;，
 * 校验通过后将 userId、username、role 注入 request attribute。
 * </p>
 */
@Component
public class JwtInterceptor implements HandlerInterceptor {

    @Resource
    private JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new BizException(401, "请先登录");
        }

        try {
            Claims claims = jwtUtil.parseToken(auth.substring(7));
            request.setAttribute("userId", Long.valueOf(claims.getSubject()));
            request.setAttribute("username", claims.get("username", String.class));
            request.setAttribute("role", claims.get("role", String.class));
            return true;
        } catch (Exception e) {
            throw new BizException(401, "登录状态已失效，请重新登录");
        }
    }
}
