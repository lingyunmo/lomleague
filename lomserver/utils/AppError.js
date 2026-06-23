/**
 * 自定义应用错误类 — 统一错误处理的基础设施
 * 解决 Issue #3: 25 个端点各自复制粘贴 try/catch 错误处理
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // 标记为已知业务错误，可安全返回给客户端
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授权，请先登录') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = '没有权限执行此操作') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ValidationError extends AppError {
  constructor(message = '参数验证失败', errors = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'CONFLICT');
  }
}

export { AppError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError };
