/**
 * 认证状态 Pinia Store — 唯一真相源
 * 解决 Issue #11: 所有 Auth 状态读取统一走此 Store
 * 解决 Issue #12: API 调用改用 userApi 模块
 */
import { defineStore } from 'pinia';
import { userApi } from '../api/user.js';

export const useAuthStore = defineStore('auth', {
  state: () => {
    let user = null;
    try {
      const stored = localStorage.getItem('user');
      if (stored) user = JSON.parse(stored);
    } catch { /* ignore corrupt data */ }
    return {
      token: localStorage.getItem('token') || null,
      user,
      userLoading: false,
    };
  },
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => !!state.user?.is_admin,
    userAvatar: (state) => state.user?.avatar || '/default-avatar.png',
    userDisplayName: (state) => state.user?.username || '',
  },
  actions: {
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token);
    },
    setUser(user) {
      // 标准化：同时保留原始字段 + camelCase 别名，组件无需手动映射
      if (user) {
        user.goldCoins = user.gold_coins;
        user.createdAt = user.created_at;
        user.updatedAt = user.updated_at;
      }
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    async fetchUser() {
      if (!this.token) return null;
      if (this.userLoading) return this.user;
      this.userLoading = true;
      try {
        const response = await userApi.getMe();
        this.setUser(response.data);
        return this.user;
      } catch {
        this.logout();
        return null;
      } finally {
        this.userLoading = false;
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
