package com.hhu.campusqa.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** sys_user 用户表实体 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SysUser {
    private Long id;
    private String username;
    private String password;
    private String email;
    private String role;       // admin / user
    private Integer status;    // 1启用 0禁用
    private LocalDateTime createTime;
}
