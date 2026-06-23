/**
 * lomserver 入口 — Express 应用
 * 解决 Issue #7: express.json() 替换废弃的 body-parser
 * 解决 Issue #3: 全局 errorHandler 统一捕获所有错误
 * 解决 Issue #4: 统一 Winston 日志
 * 解决 Issue #18: 生产环境自动服务前端静态文件（vue build 产物）
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import morgan from 'morgan';
import config from './utils/config.js';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';

import userRoutes from './routes/userRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import articleRoutes from './routes/articleRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// ==================== 基础中间件 ====================

// Request ID
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Winston 请求日志
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, requestId: req.id });
  next();
});

// Compression
app.use(compression());

// CORS
app.use(cors(config.cors));

// Helmet（XSS 防护等安全头）
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // 允许跨域加载资源
}));

// Morgan dev 日志
app.use(morgan('dev'));

// Body parser — Express 4.16+ 内置（Issue #7: 替换废弃的 body-parser）
app.use(express.json({ limit: '10mb' }));

// ==================== 限流 ====================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '登录尝试过于频繁，请15分钟后再试' },
});
app.use('/api/user/login', authLimiter);
app.use('/api/user/register', authLimiter);

const likeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '操作过于频繁，请稍后再试' },
});
app.use('/api/likes', likeLimiter);

// ==================== API 路由 ====================

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is up and running' });
});

app.use('/api/user', userRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/notifications', notificationRoutes);

// 静态文件 — 上传目录
app.use('/api/upload', express.static(path.join(process.cwd(), 'upload')));

// IP 定位
app.get('/api/get-ip', async (req, res) => {
  let userIp = (
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress
  )
    .split(',')[0]
    .trim();

  userIp = userIp.replace(/^::ffff:/i, '');

  const isPrivateIp = /^(::1|127\.0\.0\.1|0\.0\.0\.0|localhost|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})$/i.test(userIp);

  try {
    let ipData;
    if (isPrivateIp) {
      try {
        const proxyResponse = await axios.get('http://ip-api.com/json/?lang=zh-CN');
        ipData = proxyResponse.data;
      } catch {
        const directResponse = await axios.get('http://ip-api.com/json/?lang=zh-CN', {
          proxy: false,
        });
        ipData = directResponse.data;
      }
    } else {
      const response = await axios.get(`http://ip-api.com/json/${userIp}?lang=zh-CN`, {
        proxy: false,
      });
      ipData = response.data;
    }

    if (ipData && ipData.status !== 'fail' && ipData.country) {
      const parts = [ipData.country, ipData.regionName, ipData.city].filter(Boolean);
      const region = parts.length > 0 ? parts.join(' ') : '未知地区';
      res.json({ ip: isPrivateIp ? (ipData.query || userIp) : userIp, region });
    } else {
      res.json({ ip: isPrivateIp ? (ipData?.query || userIp) : userIp, region: '未知地区' });
    }
  } catch (error) {
    logger.error('IP 定位失败', { error: error.message, requestId: req.id });
    res.json({ ip: userIp, region: '未知地区' });
  }
});

// ==================== 前端静态文件服务（Issue #18: 单进程部署） ====================

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback — 所有非 /api 请求返回 index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return; // 不应该到这里，但保留安全检查
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ message: 'Not Found' });
    }
  });
});

// ==================== 错误处理 ====================

// 全局错误处理（Issue #3: 一处捕获，统一响应）
app.use(errorHandler);

// ==================== 启动 ====================

const port = config.port || 3000;
app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});

export default app;
