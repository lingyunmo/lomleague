/**
 * useLike — 点赞逻辑 composable
 * 解决 Issue #10: 点赞逻辑在多个组件中重复
 *
 * @returns {{ toggleLike, isLiked, likeCount, loading, batchLoadStatus }}
 */
import { ref } from 'vue';
import { likeApi } from '../api/like.js';
import { useAuth } from './useAuth.js';

export function useLike() {
  const { isLoggedIn } = useAuth();
  const loading = ref(false);
  const error = ref(null);

  /** 切换单个实体的点赞状态 */
  async function toggleLike(entityType, entityId) {
    if (loading.value) return null;
    error.value = null;
    if (!isLoggedIn.value) {
      error.value = '登录后才能点赞。';
      return null;
    }
    loading.value = true;
    try {
      const res = await likeApi.toggle(entityType, entityId);
      return res.data;
    } catch {
      error.value = '点赞失败，请稍后重试。';
      return null;
    } finally {
      loading.value = false;
    }
  }

  /** 获取点赞数 */
  async function getLikeCount(entityType, entityId) {
    try {
      const res = await likeApi.getCount(entityType, entityId);
      return res.data.count;
    } catch {
      return 0;
    }
  }

  /** 获取当前用户点赞状态 */
  async function getLikeStatus(entityType, entityId) {
    if (!isLoggedIn.value) return false;
    try {
      const res = await likeApi.getStatus(entityType, entityId);
      return res.data.liked;
    } catch {
      return false;
    }
  }

  /** 批量加载点赞状态 */
  async function batchLoadStatus(entityType, entityIds) {
    if (!isLoggedIn.value || !entityIds.length) return [];
    try {
      const res = await likeApi.getBatchStatus(entityType, entityIds);
      return res.data.likedIds;
    } catch {
      return [];
    }
  }

  return {
    toggleLike,
    getLikeCount,
    getLikeStatus,
    batchLoadStatus,
    loading,
    error,
  };
}
