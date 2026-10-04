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
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import { createUploadStatic } from './middleware/uploadStatic.js';

import userRoutes from './routes/userRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import articleRoutes from './routes/articleRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { getServerStatus } from './services/serverStatusService.js';
import packageInfo from './package.json' with { type: 'json' };
import prisma from './dao/prismaClient.js';
import { createProxyTrust, getClientIp } from './utils/clientIp.js';
import { getIpLocation } from './services/ipLocationService.js';

const app = express();
app.set('trust proxy', createProxyTrust(process.env.TRUSTED_PROXY_CIDRS || ''));
const ipLimitKey = (req) => ipKeyGenerator(getClientIp(req) || 'unknown');

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
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // SPA policy is separate; upload responses use their own isolation below.
  }),
);

// Morgan dev 日志
app.use(morgan('dev'));

// Body parser — Express 4.16+ 内置（Issue #7: 替换废弃的 body-parser）
app.use(express.json({ limit: '10mb' }));

// ==================== 限流 ====================

const globalLimiter = rateLimit({
  keyGenerator: ipLimitKey,
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  keyGenerator: ipLimitKey,
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '登录尝试过于频繁，请15分钟后再试' },
});
app.use('/api/user/login', authLimiter);
app.use('/api/user/register', authLimiter);

const likeLimiter = rateLimit({
  keyGenerator: ipLimitKey,
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '操作过于频繁，请稍后再试' },
});
app.use('/api/likes', likeLimiter);

// ==================== API 路由 ====================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server is up and running',
    version: packageInfo.version,
    revision: process.env.APP_REVISION || null,
  });
});

app.get('/api/server/status', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(await getServerStatus());
  } catch (error) {
    next(error);
  }
});

app.use('/api/user', userRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/notifications', notificationRoutes);

// 静态文件 — 上传目录
app.use('/api/upload', createUploadStatic(path.join(process.cwd(), 'upload')));

// IP 定位使用与限流相同的可信地址；HTTP 响应不得共享缓存。
const locationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: ipLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '地区查询过于频繁，请稍后再试' },
});
app.use('/api/get-ip', locationLimiter);
app.get('/api/get-ip', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(await getIpLocation(getClientIp(req)));
});

// ==================== 前端静态文件服务（Issue #18: 单进程部署） ====================

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback — 所有非 /api 请求返回 index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API endpoint not found' });
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

export function startServer(port = config.port || 3000) {
  return app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = startServer();
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    server.closeIdleConnections();
    setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

export default app;
