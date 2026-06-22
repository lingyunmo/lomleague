import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import config from './utils/config.js';
import helmet from 'helmet';
import winston from 'winston';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import userRoutes from './routes/userRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import path from 'path';
import forumRoutes from './routes/forumRoutes.js';
import articleRoutes from './routes/ArticleRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import axios from 'axios';

dotenv.config();

const app = express();

// Request ID middleware
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Winston logger (before routes so it catches all requests)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/app.log' })
    ]
});

app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url, requestId: req.id });
    next();
});

// Compression
app.use(compression());

// CORS
app.use(cors(config.cors));

// Helmet (includes XSS protection)
app.use(helmet());

// Morgan dev logging
app.use(morgan('dev'));

// Body parser
app.use(bodyParser.json({ limit: '10mb' }));

// Global rate limit — reasonable for browsing a community platform
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: '请求过于频繁，请稍后再试' }
});
app.use('/api', globalLimiter);

// Auth rate limit — prevent brute force, but allow reasonable retries
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: '登录尝试过于频繁，请15分钟后再试' }
});
app.use('/api/user/login', authLimiter);
app.use('/api/user/register', authLimiter);

// Likes toggle limit — frequent but lightweight
const likeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: '操作过于频繁，请稍后再试' }
});
app.use('/api/likes', likeLimiter);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ message: 'Server is up and running' });
});

// Routes
app.use('/api/user', userRoutes);
app.use('/api/file', fileRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/notifications', notificationRoutes);

// Static files
app.use('/api/upload', express.static(path.join(process.cwd(), 'upload')));

// IP geolocation
app.get('/api/get-ip', async (req, res) => {
    let userIp = (
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.connection.remoteAddress
    )
        .split(',')[0]
        .trim();

    // 标准化 IPv4-mapped IPv6 地址 (::ffff:127.0.0.1 → 127.0.0.1)
    userIp = userIp.replace(/^::ffff:/i, '');

    const isPrivateIp = /^(::1|127\.0\.0\.1|0\.0\.0\.0|localhost|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})$/i.test(userIp);

    try {
        let ipData;
        if (isPrivateIp) {
            // 内网 IP：通过 ip-api.com 获取服务器公网 IP
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

        // 校验 API 返回数据有效性
        if (ipData && ipData.status !== 'fail' && ipData.country) {
            const parts = [ipData.country, ipData.regionName, ipData.city].filter(Boolean);
            const region = parts.length > 0 ? parts.join(' ') : '未知地区';
            res.json({
                ip: isPrivateIp ? (ipData.query || userIp) : userIp,
                region,
            });
        } else {
            res.json({
                ip: isPrivateIp ? (ipData?.query || userIp) : userIp,
                region: '未知地区',
            });
        }
    } catch (error) {
        logger.error('Failed to fetch IP geolocation', { error: error.message, requestId: req.id });
        res.json({
            ip: userIp,
            region: '未知地区',
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, requestId: req.id });
    res.status(500).json({ message: 'Internal Server Error', requestId: req.id });
});

// Start server
const port = config.port || 3000;
app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
});

export default app;
