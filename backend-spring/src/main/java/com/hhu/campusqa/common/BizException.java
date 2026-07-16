package com.hhu.campusqa.common;

import lombok.Getter;

/**
 * 业务异常
 * <p>
 * Service 层遇到业务逻辑错误时抛出此异常，
 * 由 GlobalExceptionHandler 统一捕获并转为 Result.error() 返回前端。
 * </p>
 *
 * <pre>
 * 用法：
 *   throw new BizException(400, "用户名已存在");
 *   throw new BizException(401, "用户名或密码错误");
 *   throw new BizException(403, "仅管理员可用");
 * </pre>
 */
@Getter
public class BizException extends RuntimeException {

    /** 业务状态码（对应 Result.code） */
    private final int code;

    /**
     * @param code    业务状态码（400/401/403 等）
     * @param message 提示消息
     */
    public BizException(int code, String message) {
        super(message);
        this.code = code;
    }
}
