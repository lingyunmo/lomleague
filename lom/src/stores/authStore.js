import { defineStore } from 'pinia';
import { userApi } from '../api/user.js';
import client from '../api/client.js';
import { isTokenExpired } from '../api/utils.js';
import { invalidateSessionRequests } from '../api/session.js';

const pendingProfiles = new WeakMap();
const pendingAchievements = new WeakMap();

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
      achLoading: false,
      achError: null,
      achReady: false,
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
      localStorage.setItem('token', token);
      this.token = token;
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
      const operation = { token, promise: null };
      pendingProfiles.set(this, operation);
      const isCurrent = () => this.token === token && pendingProfiles.get(this) === operation;
      const promise = (async () => {
        try {
          const response = await userApi.getMe();
          if (!isCurrent()) return null;
          this.setUser(response.data);
          return this.user;
        } catch (error) {
          if (isCurrent()) {
            if (error?.response?.status === 401) this.logout();
            else this.userError = '用户信息暂时无法刷新，登录状态已保留。';
          }
          return null;
        } finally {
          if (pendingProfiles.get(this) === operation) {
            this.userLoading = false;
            pendingProfiles.delete(this);
          }
        }
      })();
      operation.promise = promise;
      return promise;
    },
    fetchAchievements() {
      const token = this.token;
      const userId = this.user?.id;
      if (!token || !userId) return Promise.resolve(null);
      const existing = pendingAchievements.get(this);
      if (existing?.token === token && existing.userId === userId) return existing.promise;
      const operation = { token, userId, promise: null };
      pendingAchievements.set(this, operation);
      this.achLoading = true;
      this.achError = null;
      const isCurrent = () =>
        this.token === token && this.user?.id === userId && pendingAchievements.get(this) === operation;
      operation.promise = (async () => {
        try {
          const res = await client.get(`/user/achievements/${userId}`);
          if (!isCurrent()) return null;
          this.achList = Array.isArray(res.data.achievements) ? res.data.achievements : [];
          this.achFrame = res.data.frame || 'none';
          this.achStats = res.data.stats || {};
          this.achReady = true;
          return res.data;
        } catch {
          if (isCurrent()) this.achError = '成就暂时无法加载，请重试。';
          return null;
        } finally {
          if (pendingAchievements.get(this) === operation) {
            this.achLoading = false;
            pendingAchievements.delete(this);
          }
        }
      })();
      return operation.promise;
    },
    logout() {
      invalidateSessionRequests(localStorage);
      pendingProfiles.delete(this);
      pendingAchievements.delete(this);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.token = null;
      this.user = null;
      this.userLoading = false;
      this.userError = null;
      this.achList = [];
      this.achFrame = 'none';
      this.achStats = {};
      this.achLoading = false;
      this.achError = null;
      this.achReady = false;
    },
  },
});
