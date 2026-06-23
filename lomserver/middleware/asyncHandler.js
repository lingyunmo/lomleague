/**
 * 异步路由处理器包装 — 消除手动 try/catch 样板
 * 解决 Issue #3: 25 个端点各自复制粘贴 try/catch 错误处理
 *
 * 使用方式: router.get('/path', asyncHandler(async (req, res) => { ... }))
 * 抛出的错误会自动传递给 errorHandler 中间件
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
