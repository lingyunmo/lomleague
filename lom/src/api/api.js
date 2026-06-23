/**
 * 向后兼容 — 重新导出 client 实例
 *
 * 新代码应使用 api/ 目录下的模块化 API（user.js, forum.js, article.js, like.js, notification.js, file.js）
 * @deprecated 请使用新的 API 模块导入（如 import { forumApi } from '../api/forum.js'）
 */
export { default } from './client.js';
