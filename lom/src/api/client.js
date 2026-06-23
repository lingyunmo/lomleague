/**
 * API 客户端 — Axios 实例 + 拦截器（唯一入口）
 * 解决 Issue #12: API 端点路径散落在组件中，无封装
 *
 * 所有 API 模块从此文件导入 client 实例
 */
import axios from 'axios';
import { isTokenExpired } from './utils.js';

const client = axios.create({
  baseURL: '/api',
});

// ==================== 请求拦截器 ====================

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (isTokenExpired(token)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

// ==================== 响应拦截器 ====================

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default client;
