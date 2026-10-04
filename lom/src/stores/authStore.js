import { defineStore } from 'pinia';
import { userApi } from '../api/user.js';
import client from '../api/client.js';
import { isTokenExpired } from '../api/utils.js';

const pendingProfiles = new WeakMap();

export const useAuthStore = defineStore('auth', {
  state: () => {
    let token = localStorage.getItem('token');
    let user = null;
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      token = null;
    }
    try {
      const stored = localStorage.getItem('user');
      if (token && stored) user = JSON.parse(stored);
    } catch {
      /* ignore */
    }
    return {
      token,
      user,
      userLoading: false,
      userError: null,
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
    achCount: (state) => state.achList.filter((a) => a.unlocked).length,
  },
  actions: {
    setToken(token) {
      if (!token) return this.logout();
      if (this.token !== token) this.logout();
      this.token = token;
      localStorage.setItem('token', token);
    },
    setUser(user) {
      this.user = user
        ? { ...user, goldCoins: user.gold_coins, createdAt: user.created_at, updatedAt: user.updated_at }
        : null;
      localStorage.setItem('user', JSON.stringify(this.user));
    },
    fetchUser() {
      if (!this.token) return Promise.resolve(null);
      const token = this.token;
      const existing = pendingProfiles.get(this);
      if (existing?.token === token) return existing.promise;
      this.userLoading = true;
      this.userError = null;
      const promise = (async () => {
        try {
          const response = await Promise.resolve().then(() => userApi.getMe());
          if (this.token !== token) return null;
          this.setUser(response.data);
          return this.user;
        } catch (error) {
          if (this.token === token) {
            if (error?.response?.status === 401) this.logout();
            else this.userError = '用户信息暂时无法刷新，登录状态已保留。';
          }
          return null;
        } finally {
          if (pendingProfiles.get(this)?.promise === promise) {
            this.userLoading = false;
            pendingProfiles.delete(this);
          }
        }
      })();
      pendingProfiles.set(this, { token, promise });
      return promise;
    },
    async fetchAchievements() {
      const token = this.token;
      const userId = this.user?.id;
      if (!token || !userId) return;
      try {
        const res = await client.get(`/user/achievements/${userId}`);
        if (this.token !== token || this.user?.id !== userId) return;
        this.achList = res.data.achievements || [];
        this.achFrame = res.data.frame || 'none';
        this.achStats = res.data.stats || {};
      } catch {
        /* ignore */
      }
    },
    logout() {
      this.token = null;
      this.user = null;
      this.userLoading = false;
      this.userError = null;
      this.achList = [];
      this.achFrame = 'none';
      this.achStats = {};
      pendingProfiles.delete(this);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
