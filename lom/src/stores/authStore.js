import { defineStore } from 'pinia';
import { userApi } from '../api/user.js';
import client from '../api/client.js';

export const useAuthStore = defineStore('auth', {
  state: () => {
    let user = null;
    try {
      const stored = localStorage.getItem('user');
      if (stored) user = JSON.parse(stored);
    } catch { /* ignore */ }
    return {
      token: localStorage.getItem('token') || null,
      user,
      userLoading: false,
      // 成就/头像框缓存
      achList: [],
      achFrame: 'none',
      achStats: {},
    };
  },
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => !!state.user?.is_admin,
    userAvatar: (state) => state.user?.avatar || '/default-avatar.png',
    userDisplayName: (state) => state.user?.username || '',
    achCount: (state) => state.achList.filter(a => a.unlocked).length,
  },
  actions: {
    setToken(token) {
      this.token = token;
      localStorage.setItem('token', token);
    },
    setUser(user) {
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
    async fetchAchievements() {
      if (!this.user?.id) return;
      try {
        const res = await client.get(`/user/achievements/${this.user.id}`);
        this.achList = res.data.achievements || [];
        this.achFrame = res.data.frame || 'none';
        this.achStats = res.data.stats || {};
      } catch { /* ignore */ }
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
