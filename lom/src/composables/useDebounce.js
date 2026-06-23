/**
 * useDebounce — 防抖 composable
 * 解决 Issue #10: 搜索防抖逻辑在 Forums.vue / Articles.vue 中重复
 *
 * @param {Function} fn — 需要防抖的函数
 * @param {number}   delay — 延迟毫秒数，默认 300
 * @returns {Function} 防抖后的函数 + cancel 方法
 */
import { ref, onUnmounted } from 'vue';

export function useDebounce(fn, delay = 300) {
  const timer = ref(null);

  function debounced(...args) {
    if (timer.value) clearTimeout(timer.value);
    timer.value = setTimeout(() => {
      fn(...args);
      timer.value = null;
    }, delay);
  }

  function cancel() {
    if (timer.value) {
      clearTimeout(timer.value);
      timer.value = null;
    }
  }

  onUnmounted(() => cancel());

  return { debounced, cancel };
}
