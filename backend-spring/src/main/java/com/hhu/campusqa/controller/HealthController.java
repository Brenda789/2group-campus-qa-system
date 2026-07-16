package com.hhu.campusqa.controller;

import com.hhu.campusqa.common.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 健康检查
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Result<Map<String, String>> health() {
        return Result.success(Map.of("status", "ok", "version", "1.0.0", "mode", "spring-boot"));
    }
}
