package com.hhu.campusqa.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 安全相关 Bean 配置
 * <p>
 * 注意：本项目不使用 Spring Security 的认证链，
 * 认证由 JwtInterceptor + WebConfig 处理。
 * 这里只保留 BCrypt 加密器 Bean。
 * </p>
 */
@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
