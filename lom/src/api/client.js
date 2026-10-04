/**
 * API 客户端 — Axios 实例 + 拦截器（唯一入口）
 * 解决 Issue #12: API 端点路径散落在组件中，无封装
 *
 * 所有 API 模块从此文件导入 client 实例
 */
import axios from 'axios';
import { isTokenExpired } from './utils.js';
import { expireSession, SESSION_EXPIRED_EVENT } from './session.js';

export function createApiClient({
  storage = localStorage,
  onSessionExpired = () => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)),
} = {}) {
  const instance = axios.create({ baseURL: '/api', timeout: 15000 });
  instance.interceptors.request.use((config) => {
    const token = storage.getItem('token');
    if (token) {
      if (isTokenExpired(token)) {
        expireSession(storage, token, onSessionExpired);
      } else if (!/^\/?user\/(login|register)(?:\?|$)/.test(config.url || '')) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const authorization = error.config?.headers?.Authorization;
        const sentToken = typeof authorization === 'string' ? authorization.replace(/^Bearer /, '') : null;
        expireSession(storage, sentToken, onSessionExpired);
      }
      // Permission errors and transient network failures do not invalidate a login.
      return Promise.reject(error);
    },
  );
  return instance;
}

export default createApiClient();
