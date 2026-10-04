import { createWriteStream } from 'node:fs';
import { link, lstat, mkdir, mkdtemp, readdir, rm, statfs } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { createStoredFilename } from './filename.js';
import { UploadError } from './uploadPolicy.js';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const DEFAULT_QUOTA = 1024 * 1024 * 1024;
export const DEFAULT_DAY_QUOTA = 100 * 1024 * 1024;
export const DEFAULT_MIN_FREE = 256 * 1024 * 1024;

export function positiveLimit(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function storedFilename(originalname, now) {
  const name = createStoredFilename(originalname, now);
  if (Buffer.byteLength(name, 'utf8') > 255) throw new UploadError(400, '文件名过长，请缩短文件名后重试');
  return name;
}

export async function availableBytes(directory) {
  const status = await statfs(directory, { bigint: true });
  return status.bavail * status.bsize;
}

async function realDirectory(directory, mode = 0o755) {
  await mkdir(directory, { recursive: true, mode });
  const status = await lstat(directory);
  if (!status.isDirectory() || status.isSymbolicLink()) throw new UploadError(503, '上传目录异常，请联系管理员');
}

export function createStagingStorage(directory, clock = Date.now) {
  return {
    _handleFile(req, file, callback) {
      let staging;
      (async () => {
        const filename = storedFilename(file.originalname, clock());
        await realDirectory(path.join(directory, '.pending'), 0o700);
        staging = await mkdtemp(path.join(directory, '.pending', 'upload-'));
        const target = path.join(staging, filename);
        const output = createWriteStream(target, { flags: 'wx', mode: 0o600 });
        let size = 0;
        file.stream.on('data', (chunk) => {
          size += chunk.length;
        });
        const abort = () => file.stream.destroy(new UploadError(400, '上传已中断'));
        req.once('aborted', abort);
        try {
          await pipeline(file.stream, output);
        } finally {
          req.removeListener('aborted', abort);
        }
        return { filename, path: target, staging, size };
      })().then(
        (info) => callback(null, info),
        async (error) => {
          if (staging) await rm(staging, { recursive: true, force: true }).catch(() => {});
          callback(error);
        },
      );
    },
    _removeFile(req, file, callback) {
      // Multer can remove only this operation's private scratch directory, never a published file.
      rm(file.staging, { recursive: true, force: true }).then(() => callback(null), callback);
    },
  };
}

export function createPublisher(directory, options = {}) {
  const locks = new Map();
  const quota = options.quota ?? positiveLimit(process.env.UPLOAD_USER_QUOTA_BYTES, DEFAULT_QUOTA);
  const dayQuota = options.dayQuota ?? positiveLimit(process.env.UPLOAD_DAY_QUOTA_BYTES, DEFAULT_DAY_QUOTA);
  const minimumFree = options.minimumFree ?? positiveLimit(process.env.UPLOAD_MIN_FREE_BYTES, DEFAULT_MIN_FREE);
  const space = options.space || availableBytes;
  const clock = options.clock || Date.now;
  const ensureSpace = async () => {
    await realDirectory(directory);
    if (BigInt(await space(directory)) < BigInt(minimumFree + MAX_FILE_SIZE))
      throw new UploadError(503, '存储空间不足，暂时无法上传');
  };
  const publish = async (file, userId, signal) => {
    const previous = locks.get(userId) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });
    locks.set(userId, current);
    await previous;
    try {
      if (signal?.aborted) throw new UploadError(400, '上传已中断');
      const userDirectory = path.join(directory, String(userId));
      await realDirectory(userDirectory);
      let total = 0,
        recent = 0;
      for (const entry of await readdir(userDirectory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new UploadError(503, '上传目录异常，请联系管理员');
        if (!entry.isFile()) continue;
        const status = await lstat(path.join(userDirectory, entry.name));
        total += status.size;
        if (status.mtimeMs >= clock() - 86400000) recent += status.size;
      }
      if (total + file.size > quota) throw new UploadError(413, '已达到个人上传容量上限，请联系管理员');
      if (recent + file.size > dayQuota) throw new UploadError(413, '已达到近24小时上传容量上限，请稍后再试');
      await ensureSpace();
      let filename = file.filename;
      for (let attempt = 0; attempt < 32; attempt++) {
        if (signal?.aborted) throw new UploadError(400, '上传已中断');
        const target = path.join(userDirectory, filename);
        try {
          // Same filesystem hard link: atomic publish, EEXIST rather than overwrite.
          await link(file.path, target);
          return { filename, path: target };
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
          await delay(2);
          filename = storedFilename(file.originalname, clock());
        }
      }
      throw new UploadError(409, '同名文件上传发生冲突，请稍后重试');
    } finally {
      release();
      if (locks.get(userId) === current) locks.delete(userId);
    }
  };
  return { publish, ensureSpace };
}
