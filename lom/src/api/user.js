/**
 * 用户 API 模块
 * 解决 Issue #12: API 端点路径封装
 */
import client from './client.js';

export const userApi = {
  /** 用户注册 */
  register(data) {
    return client.post('/user/register', data);
  },

  /** 用户登录 */
  login(data) {
    return client.post('/user/login', data);
  },

  /** 获取当前用户信息 */
  getMe() {
    return client.get('/user/me');
  },

  /** 更新用户信息 */
  updateProfile(data) {
    return client.put('/user/update', data);
  },

  /** 修改密码 */
  changePassword(oldPassword, newPassword) {
    return client.put('/user/change-password', { oldPassword, newPassword });
  },

  /** 每日签到 */
  checkin() {
    return client.post('/user/checkin');
  },
};
