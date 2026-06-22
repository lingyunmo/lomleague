// utils.js
export const isTokenExpired = (token) => {
    if (!token) return true;  // 如果没有 token，认为过期

    const payload = JSON.parse(atob(token.split('.')[1]));  // 解码 JWT 获取 payload
    const expirationDate = new Date(payload.exp * 1000);  // 过期时间 (秒转毫秒)
    return expirationDate < new Date();  // 如果当前时间超过过期时间，认为过期
};
