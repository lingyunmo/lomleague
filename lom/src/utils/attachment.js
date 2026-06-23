/**
 * parseAttachments — 解析附件字段
 * 解决：Forum.vue / Article.vue 中完全相同的解析逻辑
 *
 * 后端可能返回 JSON 字符串或已解析的数组，统一转为数组返回。
 *
 * @param {string|Array|null|undefined} val — 附件字段值
 * @returns {Array} 附件 URL 数组
 */
export function parseAttachments(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
