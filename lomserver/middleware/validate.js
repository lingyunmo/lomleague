/**
 * Zod 验证中间件 — 每个路由一行搞定参数校验
 * 解决 Issue #5: Zod 验证未封装成中间件，每个路由手动调用 safeParse
 *
 * 使用方式: router.post('/path', validate(mySchema), asyncHandler(async (req, res) => { ... }))
 * 验证通过后 req.body 已被替换为 parsed.data（含 Zod 默认值/转换）
 */
const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: '参数验证失败',
      errors: parsed.error.flatten(),
    });
  }
  req.body = parsed.data; // 替换为净化/转换后的数据
  next();
};

export default validate;
