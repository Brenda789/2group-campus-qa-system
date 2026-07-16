package com.hhu.campusqa.common;

import lombok.Data;

/**
 * 统一响应体
 * <p>
 * 所有 Controller 返回值统一包装为 Result&lt;T&gt;，
 * 前端通过 code 判断成功/失败，message 展示提示，data 获取业务数据。
 * </p>
 *
 * <pre>
 * 成功：{"code":200, "message":"success", "data":{...}, "timestamp":...}
 * 业务异常：{"code":400, "message":"用户名已存在", "data":null, "timestamp":...}
 * 未登录：{"code":401, "message":"请先登录", "data":null, "timestamp":...}
 * 无权限：{"code":403, "message":"仅管理员可用", "data":null, "timestamp":...}
 * 服务端异常：{"code":500, "message":"服务器内部错误", "data":null, "timestamp":...}
 * </pre>
 */
@Data
public class Result<T> {

    /** 状态码：200 成功 / 400 请求错误 / 401 未登录 / 403 无权限 / 500 服务端异常 */
    private int code;

    /** 提示消息（给用户看） */
    private String message;

    /** 业务数据（可为 null） */
    private T data;

    /** 时间戳 */
    private long timestamp = System.currentTimeMillis();

    // ==================== 静态工厂方法 ====================

    /** 操作成功 */
    public static <T> Result<T> success(T data) {
        Result<T> r = new Result<>();
        r.code = 200;
        r.message = "success";
        r.data = data;
        return r;
    }

    /** 操作成功（无数据返回时） */
    public static <T> Result<T> success() {
        return success(null);
    }

    /** 业务异常 */
    public static <T> Result<T> error(int code, String message) {
        Result<T> r = new Result<>();
        r.code = code;
        r.message = message;
        r.data = null;
        return r;
    }
}
