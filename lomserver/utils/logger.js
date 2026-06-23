/**
 * Winston 日志器 — 全局单例
 * 解决 Issue #4: Winston 配好了，路由里仍在用 console.error
 * 从 index.js 提取，供所有模块导入使用
 */
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' }),
  ],
});

export default logger;
