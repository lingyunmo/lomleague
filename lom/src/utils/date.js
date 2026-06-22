export const formatDate = (dateStr) => {
  if (!dateStr) return '未知时间';
  const date = new Date(dateStr);
  return isNaN(date) ? '无效日期' : date.toLocaleString('zh-CN');
};

export const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '未知时间';
  const date = new Date(dateStr);
  if (isNaN(date)) return '无效日期';
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return formatDate(dateStr);
};
