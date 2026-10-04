import path from 'node:path';
import { Worker } from 'node:worker_threads';

const formats = new Map([
  ['image/jpeg', ['.jpg', '.jpeg', '.jpe']],
  ['image/png', ['.png']],
  ['image/gif', ['.gif']],
  ['image/webp', ['.webp']],
  ['audio/mpeg', ['.mp3']],
  ['audio/wav', ['.wav']],
  ['video/mp4', ['.mp4']],
  ['video/x-msvideo', ['.avi']],
  ['application/pdf', ['.pdf']],
  ['application/zip', ['.zip']],
  ['application/x-rar-compressed', ['.rar']],
]);
const aliases = new Map([
  ['audio/x-wav', 'audio/wav'],
  ['video/vnd.avi', 'video/x-msvideo'],
  ['application/vnd.rar', 'application/x-rar-compressed'],
  ['application/x-zip-compressed', 'application/zip'],
]);
const canonicalMime = (mime) => aliases.get(mime) || mime;

export class UploadError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateUploadMetadata(originalname, mimetype) {
  const extension = path.extname(originalname).toLowerCase();
  const mime = canonicalMime(mimetype);
  const expected = [...formats].find(([, extensions]) => extensions.includes(extension))?.[0];
  if (!expected || (!['', 'application/octet-stream'].includes(mime) && mime !== expected)) {
    throw new UploadError(400, '文件扩展名与声明类型不一致，或格式不受支持');
  }
  return expected;
}

export function detectUploadType(filePath, signal, timeout = 2000) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new UploadError(400, '上传已中断'));
    const worker = new Worker(new URL('./fileTypeWorker.js', import.meta.url), {
      workerData: filePath,
      env: {},
      resourceLimits: { maxOldGenerationSizeMb: 32, maxYoungGenerationSizeMb: 8 },
    });
    let settled = false;
    const finish = (error, type) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
      if (error) reject(error);
      else resolve(type);
    };
    const abort = () => finish(new UploadError(400, '上传已中断'));
    const timer = setTimeout(() => finish(new UploadError(400, '文件类型检查超时，请检查文件是否损坏')), timeout);
    signal?.addEventListener('abort', abort, { once: true });
    worker.once('message', (result) =>
      finish(result.error ? new UploadError(400, '无法识别文件内容') : null, result.type),
    );
    worker.once('error', () => finish(new UploadError(400, '无法识别文件内容')));
    worker.once('exit', () => {
      if (!settled) finish(new UploadError(400, '文件类型检查未完成'));
    });
  });
}

export async function validateUploadContent(file, signal, detector = detectUploadType) {
  const expected = validateUploadMetadata(file.originalname, file.mimetype);
  const detected = await detector(file.path, signal);
  if (!detected || canonicalMime(detected.mime) !== expected)
    throw new UploadError(400, '实际文件内容与扩展名不一致，或文件已损坏');
}
