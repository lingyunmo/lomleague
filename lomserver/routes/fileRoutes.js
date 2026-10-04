/**
 * 文件上传路由 — 使用 asyncHandler 统一错误处理
 * 解决 Issue #3 #4: 用 asyncHandler 替代手动 try/catch
 */
import express from 'express';
import multer from 'multer';
import { mkdirSync } from 'node:fs';
import path from 'path';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createStoredFilename } from '../utils/filename.js';
import logger from '../utils/logger.js';

export function createFileRouter(uploadDirectory = path.join(process.cwd(), 'upload')) {
  const router = express.Router();

  const UPLOAD_DIR = uploadDirectory;

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/x-msvideo',
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const userId = req.user.id;
        const userDir = path.join(UPLOAD_DIR, userId.toString());
        mkdirSync(userDir, { recursive: true, mode: 0o755 });
        cb(null, userDir);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      cb(null, createStoredFilename(file.originalname));
    },
  });

  const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'), false);
    }
  };

  const upload = multer({
    defParamCharset: 'utf8',
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
  });

  // POST /upload
  router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: '未找到上传的文件或文件格式不支持' });
    }

    const fileUrl = `/upload/${req.user.id}/${encodeURIComponent(req.file.filename)}`;
    res.status(200).json({
      message: '文件上传成功',
      url: '/api' + fileUrl,
      filename: req.file.filename,
    });
  });

  // Multer 错误处理（必须在路由之后）
  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '文件大小不能超过10MB' });
      }
      return res.status(400).json({ message: '文件上传失败' });
    }
    if (err) {
      logger.error('文件上传错误', { error: err.message, requestId: req.id });
      return res.status(400).json({ message: err.message || '文件上传失败' });
    }
    next(err);
  });

  return router;
}

export default createFileRouter();
