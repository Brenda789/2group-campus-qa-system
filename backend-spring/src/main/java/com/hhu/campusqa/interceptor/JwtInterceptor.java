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

    /** 可选认证路径：没有 token 也放行，controller 自行判断 */
    private static final java.util.Set<String> OPTIONAL_AUTH_PATHS = java.util.Set.of(
            "/api/chat/ask",
            "/api/chat/stream",
            "/api/documents"
    );

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        String auth = request.getHeader("Authorization");
        String uri = request.getRequestURI();

        // 没有 token 的情况
        if (auth == null || !auth.startsWith("Bearer ")) {
            // 可选路径：放行，不设 userId
            if (isOptionalPath(uri)) {
                return true;
            }
            throw new BizException(401, "请先登录");
        }

        try {
            Claims claims = jwtUtil.parseToken(auth.substring(7));
            request.setAttribute("userId", Long.valueOf(claims.getSubject()));
            request.setAttribute("username", claims.get("username", String.class));
            request.setAttribute("role", claims.get("role", String.class));
            return true;
        } catch (Exception e) {
            // 可选路径：token 无效也不拦截，降级为匿名
            if (isOptionalPath(uri)) {
                return true;
            }
            throw new BizException(401, "登录状态已失效，请重新登录");
        }
    }

    private boolean isOptionalPath(String uri) {
        for (String path : OPTIONAL_AUTH_PATHS) {
            if (uri.startsWith(path)) return true;
        }
        return false;
    }
}
