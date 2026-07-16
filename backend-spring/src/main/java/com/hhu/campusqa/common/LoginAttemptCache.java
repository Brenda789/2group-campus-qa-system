package com.hhu.campusqa.common;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * 登录失败限流缓存（内存实现）
 * <p>
 * 同一 IP 连续失败 5 次后锁定 15 分钟
 * </p>
 */
@Component
public class LoginAttemptCache {

    /** 最大失败次数 */
    private static final int MAX_FAIL_COUNT = 5;
    /** 锁定时长（毫秒） */
    private static final long LOCK_DURATION_MS = 15 * 60 * 1000;

    private final ConcurrentHashMap<String, Attempt> cache = new ConcurrentHashMap<>();

    /**
     * 检查 IP 是否被锁定
     * @return true 表示被锁定
     */
    public boolean isLocked(String ip) {
        Attempt attempt = cache.get(ip);
        if (attempt == null) {
            return false;
        }
        if (attempt.lockUntil > 0) {
            if (System.currentTimeMillis() < attempt.lockUntil) {
                return true; // 仍在锁定中
            }
            // 锁定期已过，清除记录
            cache.remove(ip);
        }
        return false;
    }

    /** 获取剩余锁定秒数 */
    public long getRemainSeconds(String ip) {
        Attempt attempt = cache.get(ip);
        if (attempt == null || attempt.lockUntil <= 0) {
            return 0;
        }
        long remain = (attempt.lockUntil - System.currentTimeMillis()) / 1000;
        return Math.max(0, remain);
    }

    /** 记录一次失败 */
    public void recordFailure(String ip) {
        Attempt attempt = cache.computeIfAbsent(ip, k -> new Attempt());
        attempt.failCount++;
        if (attempt.failCount >= MAX_FAIL_COUNT) {
            attempt.lockUntil = System.currentTimeMillis() + LOCK_DURATION_MS;
        }
    }

    /** 登录成功，清除失败记录 */
    public void clearFailure(String ip) {
        cache.remove(ip);
    }

    /** 内部类：记录失败次数与锁定时间 */
    private static class Attempt {
        int failCount = 0;
        long lockUntil = 0;
    }
}
