/**
 * 资源所有权检查中间件 — 消除重复 6+ 次的权限检查
 * 解决 Issue #6: 权限检查（userId === post.userId || isAdmin）重复 6+ 次
 *
 * 使用方式:
 *   router.put('/posts/:id', authMiddleware, requireOwner(ForumDAO.getPostById), asyncHandler(...))
 *   检查通过后 req.entity 即为已加载的实体对象
 *
 * @param {Function} lookupFn — (id: number) => entity | null  查找实体的函数
 * @param {string}   paramName — URL 参数名，默认 'id'
 */
const requireOwner = (lookupFn, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const entityId = parseInt(req.params[paramName], 10);
      if (isNaN(entityId)) {
        return res.status(400).json({ message: '无效的ID参数' });
      }
      const entity = await lookupFn(entityId);
      if (!entity) {
        return res.status(404).json({ message: '资源不存在' });
      }
      if (entity.userId !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ message: '没有权限执行此操作' });
      }
      req.entity = entity; // 下游可直接使用，避免重复查询
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default requireOwner;
