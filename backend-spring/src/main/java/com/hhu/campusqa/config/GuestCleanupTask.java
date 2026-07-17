package com.hhu.campusqa.config;

import com.hhu.campusqa.entity.SysUser;
import com.hhu.campusqa.service.SysUserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 定时清理过期访客用户（安全网：防止 beforeunload 未触发导致访客数据残留）
 * <p>
 * 每 30 分钟清理创建时间超过 1 小时的访客用户及其关联数据。
 * </p>
 */
@Slf4j
@Component
@EnableScheduling
public class GuestCleanupTask {

    private final SysUserService sysUserService;

    public GuestCleanupTask(SysUserService sysUserService) {
        this.sysUserService = sysUserService;
    }

    @Scheduled(fixedRate = 30 * 60 * 1000) // 每 30 分钟
    public void cleanupStaleGuests() {
        log.info("开始定时清理过期访客...");
        List<SysUser> guests = sysUserService.lambdaQuery()
                .eq(SysUser::getRole, "guest")
                .lt(SysUser::getCreateTime,
                        java.time.LocalDateTime.now().minusHours(1))
                .list();

        int count = 0;
        for (SysUser guest : guests) {
            try {
                sysUserService.cleanupGuestUser(guest.getId());
                count++;
            } catch (Exception e) {
                log.warn("清理访客 {} 失败: {}", guest.getId(), e.getMessage());
            }
        }
        if (count > 0) {
            log.info("已清理 {} 个过期访客用户", count);
        }
    }
}
