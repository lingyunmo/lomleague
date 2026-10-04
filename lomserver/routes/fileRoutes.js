/**
 * 文件上传路由 — 使用 asyncHandler 统一错误处理
 * 解决 Issue #3 #4: 用 asyncHandler 替代手动 try/catch
 */
import express from 'express';
import multer from 'multer';
import { rm } from 'node:fs/promises';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createPublisher, createStagingStorage, MAX_FILE_SIZE, positiveLimit } from '../utils/uploadStorage.js';
import { UploadError, validateUploadMetadata, validateUploadContent } from '../utils/uploadPolicy.js';
import logger from '../utils/logger.js';

export function createFileRouter(uploadDirectory = path.join(process.cwd(), 'upload'), options = {}) {
  const router = express.Router();

  const storage = createStagingStorage(uploadDirectory, options.clock);
  const publisher = createPublisher(uploadDirectory, options);
  const active = new Map();
  let totalActive = 0;
  const perUser = options.maxConcurrentPerUser ?? 2;
  const globalMaximum = options.maxConcurrent ?? 4;
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.rateLimit ?? positiveLimit(process.env.UPLOAD_RATE_LIMIT, 20),
    keyGenerator: (req) => String(req.user.id),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: '上传过于频繁，请稍后再试' },
  });

  const fileFilter = (req, file, cb) => {
    try {
      validateUploadMetadata(file.originalname, file.mimetype);
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  };

  const upload = multer({
    defParamCharset: 'utf8',
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 2 },
    fileFilter,
  });

  // POST /upload
  router.post(
    '/upload',
    authMiddleware,
    (req, res, next) => {
      if (!Number.isSafeInteger(req.user.id) || req.user.id < 1)
        return res.status(401).json({ message: '无效的用户身份' });
      res.set('Cache-Control', 'no-store');
      next();
    },
    limiter,
    (req, res, next) => {
      const userId = req.user.id;
      if ((active.get(userId) || 0) >= perUser || totalActive >= globalMaximum)
        return res.status(429).json({ message: '同时上传的文件过多，请稍后重试' });
      active.set(userId, (active.get(userId) || 0) + 1);
      totalActive++;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        totalActive--;
        const remaining = active.get(userId) - 1;
        if (remaining) active.set(userId, remaining);
        else active.delete(userId);
      };
      res.once('finish', release);
      res.once('close', release);
      publisher.ensureSpace().then(() => next(), next);
    },
    upload.single('file'),
    async (req, res, next) => {
      if (!req.file) {
        return res.status(400).json({ message: '未找到上传的文件或文件格式不支持' });
      }

      const abort = new AbortController();
      const onClose = () => {
        if (!res.writableFinished) abort.abort();
      };
      res.once('close', onClose);
      let stored, failure;
      try {
        await validateUploadContent(req.file, abort.signal, options.detector);
        stored = await publisher.publish(req.file, req.user.id, abort.signal);
      } catch (error) {
        failure = error;
      } finally {
        res.removeListener('close', onClose);
        await rm(req.file.staging, { recursive: true, force: true }).catch(() =>
          logger.error('Failed to remove private upload scratch directory'),
        );
      }
      if (failure) return next(failure);
      if (!res.destroyed)
        res.status(200).json({
          message: '文件上传成功',
          url: `/api/upload/${req.user.id}/${encodeURIComponent(stored.filename)}`,
          filename: stored.filename,
        });
    },
  );

  // Multer 错误处理（必须在路由之后）
  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '文件大小不能超过10MB' });
      }
      return res.status(400).json({ message: '文件上传失败' });
    }
    if (err instanceof UploadError) return res.status(err.status).json({ message: err.message });
    if (err) {
      logger.error('文件上传错误', { error: err.message, requestId: req.id });
      return res.status(500).json({ message: '文件上传失败，请稍后重试' });
    }
    next(err);
  });

  return router;
}

export default createFileRouter();
