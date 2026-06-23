/**
 * usePaginatedFetch — 分页数据获取 composable
 * 解决 Issue #10: 分页逻辑在多个组件中重复
 *
 * @param {Function} fetchFn — (params) => Promise<{ data: { items, total } }>
 * @param {Object}   defaultParams — 默认查询参数
 *
 * @returns {{ data, total, loading, error, page, pageSize, fetch, refresh, reset }}
 */
import { ref, reactive } from 'vue';

export function usePaginatedFetch(fetchFn, defaultParams = {}) {
  const data = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);

  const pagination = reactive({
    page: 1,
    pageSize: 20,
  });

  /** 执行数据获取 */
  async function fetch(extraParams = {}) {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetchFn({
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...defaultParams,
        ...extraParams,
      });
      const result = response.data;
      data.value = result.articles || result.posts || result.replies || result.notifications || [];
      total.value = result.total || 0;
      return result;
    } catch (err) {
      error.value = err;
      console.error('数据获取失败:', err);
    } finally {
      loading.value = false;
    }
  }

  /** 重置到第一页并刷新 */
  async function refresh() {
    pagination.page = 1;
    await fetch();
  }

  /** 切换页码/每页条数 */
  async function onPageChange(page, pageSize) {
    pagination.page = page;
    pagination.pageSize = pageSize;
    await fetch();
  }

  /** 清空数据 */
  function reset() {
    data.value = [];
    total.value = 0;
    pagination.page = 1;
    error.value = null;
  }

  return {
    data,
    total,
    loading,
    error,
    pagination,
    fetch,
    refresh,
    onPageChange,
    reset,
  };
}
