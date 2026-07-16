package com.hhu.campusqa.config;

import com.hhu.campusqa.interceptor.JwtInterceptor;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 层配置
 * <ul>
 *   <li>CORS 跨域（允许前端 localhost:5173 访问）</li>
 *   <li>注册 JWT 认证拦截器</li>
 * </ul>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Resource
    private JwtInterceptor jwtInterceptor;

    /** CORS 跨域 */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    /** 注册 JWT 拦截器 */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtInterceptor)
                .addPathPatterns("/api/**")                          // 拦截所有 API
                .excludePathPatterns(                                 // 放行白名单
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/health"
                );
    }
}
