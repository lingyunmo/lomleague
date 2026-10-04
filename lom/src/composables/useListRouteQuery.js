import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDebounce } from './useDebounce.js';
import { readListQuery, writeListQuery } from '../utils/listQuery.js';

export function useListRouteQuery(pagination, fetchList) {
  const route = useRoute();
  const router = useRouter();
  const listPath = route.path;
  const searchKeyword = ref(readListQuery(route.query).keyword);
  let loadedKey;

  async function navigate(state, replace = false) {
    const query = writeListQuery(route.query, state);
    const target = { path: listPath, query, hash: route.hash };
    if (router.resolve(target).fullPath === route.fullPath) {
      return fetchList({ keyword: state.keyword || undefined });
    }
    const sameState = JSON.stringify(state) === loadedKey;
    await router[replace ? 'replace' : 'push'](target);
    if (sameState && route.path === listPath) return fetchList({ keyword: state.keyword || undefined });
  }

  const { debounced, cancel } = useDebounce((keyword) => {
    navigate({ keyword, page: 1, pageSize: pagination.pageSize }, true);
  }, 300);

  watch(searchKeyword, (keyword) => {
    if (keyword !== readListQuery(route.query).keyword) debounced(keyword);
  });

  watch(
    () => [route.path, route.query.q, route.query.page, route.query.pageSize],
    () => {
      if (route.path !== listPath) {
        cancel();
        return;
      }
      cancel();
      const state = readListQuery(route.query);
      searchKeyword.value = state.keyword;
      pagination.page = state.page;
      pagination.pageSize = state.pageSize;
      const key = JSON.stringify(state);
      if (key !== loadedKey) {
        loadedKey = key;
        fetchList({ keyword: state.keyword || undefined });
      }
    },
    { immediate: true },
  );

  function onPageChange(page, pageSize) {
    cancel();
    const keyword = searchKeyword.value;
    const searchChanged = keyword !== readListQuery(route.query).keyword;
    return navigate({ keyword, page: searchChanged ? 1 : page, pageSize });
  }

  function refresh() {
    cancel();
    return navigate({ keyword: searchKeyword.value, page: 1, pageSize: pagination.pageSize });
  }

  return { searchKeyword, onPageChange, refresh };
}
