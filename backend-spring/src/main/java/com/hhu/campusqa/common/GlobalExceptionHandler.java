package com.hhu.campusqa.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器
 * <p>
 * 拦截所有 Controller 抛出的异常，统一转为 Result.error() 返回，
 * 避免 try-catch 散落在每个方法里。
 * </p>
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 业务异常 → 原样返回 code + message */
    @ExceptionHandler(BizException.class)
    public Result<Void> handleBiz(BizException e) {
        log.warn("业务异常 [{}] {}", e.getCode(), e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }

    /** 参数校验失败（@Valid）→ 400 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldError() != null
                ? e.getBindingResult().getFieldError().getDefaultMessage()
                : "参数校验失败";
        log.warn("参数校验失败: {}", msg);
        return Result.error(400, msg);
    }

    /** 兜底：未预期的运行时异常 → 500 */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleAll(Exception e) {
        log.error("服务端异常", e);
        return Result.error(500, "服务器内部错误: " + e.getMessage());
    }
}
