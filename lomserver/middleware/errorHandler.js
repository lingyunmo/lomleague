/**
 * 全局错误处理中间件 — 一处捕获，统一响应
 * 解决 Issue #3: 25 个端点各自复制粘贴 try/catch
 * 解决 Issue #4: 统一使用 Winston 记录错误
 *
 * 必须在所有路由之后注册
 * 区分已知业务错误（AppError，返回对应状态码）和未知错误（500）
 */
import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const response = {
    message: err.isOperational ? err.message : '服务器内部错误',
    requestId: req.id,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  // 统一 Winston 日志（不再混用 console.error）
  logger.error('请求处理错误', {
    statusCode,
    errorMessage: err.message,
    stack: err.stack,
    requestId: req.id,
    method: req.method,
    url: req.url,
    isOperational: !!err.isOperational,
  });

  res.status(statusCode).json(response);
};

export default errorHandler;
