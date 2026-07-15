package com.hhu.campusqa.config;

import com.hhu.campusqa.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

/** JWT 认证过滤器：每个请求进入 Controller 前校验 token */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter implements Filter {

    private final JwtUtil jwtUtil;

    /** 不需要鉴权的路径 */
    private static final List<String> WHITELIST = List.of(
            "/api/auth/", "/api/health"
    );

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        String path = req.getRequestURI();

        // 白名单放行
        for (String white : WHITELIST) {
            if (path.startsWith(white)) {
                chain.doFilter(request, response);
                return;
            }
        }

        // OPTIONS 预检放行
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        // 校验 JWT
        String authHeader = req.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            resp.setStatus(401);
            resp.getWriter().write("{\"error\":\"请先登录\"}");
            return;
        }

        String token = authHeader.substring(7);
        try {
            if (jwtUtil.isExpired(token)) {
                resp.setStatus(401);
                resp.getWriter().write("{\"error\":\"登录状态已失效\"}");
                return;
            }
            Claims claims = jwtUtil.parseToken(token);
            // 把用户信息存入 request attribute，Controller 里用
            req.setAttribute("userId", Long.valueOf(claims.getSubject()));
            req.setAttribute("username", claims.get("username", String.class));
            req.setAttribute("role", claims.get("role", String.class));
        } catch (Exception e) {
            resp.setStatus(401);
            resp.getWriter().write("{\"error\":\"无效的认证令牌\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}
