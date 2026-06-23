/**
 * IP 定位 API
 */
import client from './client.js';

export const ipApi = {
  /** 获取当前 IP 和地区 */
  getIpRegion() {
    return client.get('/get-ip');
  },
};
