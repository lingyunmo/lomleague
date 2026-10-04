import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFileRouter } from '../routes/fileRoutes.js';
import { createUploadStatic } from '../middleware/uploadStatic.js';
import { detectUploadType } from '../utils/uploadPolicy.js';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=',
  'base64',
);
const secret = 'hardening-test-only';
const token = jwt.sign({ id: 7 }, secret);
const fixtures = [];
async function fixture(options = {}) {
  vi.stubEnv('JWT_SECRET', secret);
  const directory = await mkdtemp(path.join(tmpdir(), 'lom-upload-harden-test-'));
  const app = express();
  app.use('/api/file', createFileRouter(directory, { rateLimit: 1000, ...options }));
  app.use('/api/upload', createUploadStatic(directory));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const upload = async (name = '论文🧱100% %E4%B8%AD.png', bytes = png, type = 'image/png', member = token) => {
    const body = new FormData();
    body.append('file', new Blob([bytes], { type }), name);
    const response = await fetch(`${base}/api/file/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${member}` },
      body,
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  const result = { directory, server, base, upload };
  fixtures.push(result);
  return result;
}
afterEach(async () => {
  for (const { server, directory } of fixtures.splice(0)) {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
  vi.unstubAllEnvs();
});

describe('bounded private validation and immutable publication', () => {
  it.each([
    ['fake.png', '<html><script>bad()</script></html>', 'image/png'],
    ['fake.png', '%PDF-1.7\n%%EOF', 'image/png'],
    ['bad.pdf', png, 'application/pdf'],
    ['bad.html', png, 'image/png'],
    ['claimed.png', png, 'application/pdf'],
  ])('rejects spoofed %s before publishing', async (name, bytes, type) => {
    const f = await fixture();
    expect((await f.upload(name, bytes, type)).status).toBe(400);
    expect(await readdir(f.directory)).not.toContain('7');
    if ((await readdir(f.directory)).includes('.pending'))
      expect(await readdir(path.join(f.directory, '.pending'))).toEqual([]);
  });
  it('accepts genuine content with an unspecified client MIME without changing its name', async () => {
    const f = await fixture();
    const result = await f.upload('世界🧱.png', png, 'application/octet-stream');
    expect(result.status).toBe(200);
    expect(result.data.filename.replace(/^\d+_/, '')).toBe('世界🧱.png');
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects a UTF-8 basename that exceeds filesystem byte limits rather than renaming it', async () => {
    const f = await fixture();
    expect((await f.upload(`${'界'.repeat(100)}.png`)).status).toBe(400);
    expect(await readdir(f.directory)).not.toContain('7');
  });
  it('never overwrites an existing same-timestamp name', async () => {
    const f = await fixture({ clock: () => 1000000000000 });
    await mkdir(path.join(f.directory, '7'));
    await writeFile(path.join(f.directory, '7', '1000000000000_same.png'), 'original-business-bytes');
    const result = await f.upload('same.png');
    expect(result.status).toBe(409);
    expect(await readFile(path.join(f.directory, '7', '1000000000000_same.png'), 'utf8')).toBe(
      'original-business-bytes',
    );
    expect(await readdir(path.join(f.directory, '7'))).toEqual(['1000000000000_same.png']);
  });
  it('publishes overlapping same-name uploads with only timestamp prefixes and exact bytes', async () => {
    const f = await fixture({ maxConcurrent: 8, maxConcurrentPerUser: 8 });
    const results = await Promise.all(Array.from({ length: 6 }, () => f.upload('并发论文100% %E4%B8%AD.png')));
    expect(results.map((result) => result.status)).toEqual(Array(6).fill(200));
    expect(new Set(results.map((result) => result.data.filename)).size).toBe(6);
    for (const { data } of results) {
      expect(data.filename.replace(/^\d+_/, '')).toBe('并发论文100% %E4%B8%AD.png');
      expect(await readFile(path.join(f.directory, '7', data.filename))).toEqual(png);
      expect(data.url).toBe(`/api/upload/7/${encodeURIComponent(data.filename)}`);
    }
  });
  it('serializes quota decisions for simultaneous uploads', async () => {
    const f = await fixture({ quota: png.length + 10 });
    const results = await Promise.all([f.upload('first.png'), f.upload('second.png')]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 413]);
    expect((await readdir(path.join(f.directory, '7'))).length).toBe(1);
    expect(await readdir(path.join(f.directory, '.pending'))).toEqual([]);
  });
  it('enforces rolling-day capacity without deleting existing files', async () => {
    const f = await fixture({ dayQuota: png.length + 10 });
    expect((await f.upload('first.png')).status).toBe(200);
    expect((await f.upload('second.png')).status).toBe(413);
    expect((await readdir(path.join(f.directory, '7'))).length).toBe(1);
  });
  it('refuses low disk space before creating scratch files', async () => {
    const f = await fixture({ space: async () => 0n });
    expect((await f.upload()).status).toBe(503);
    expect(await readdir(f.directory)).toEqual([]);
  });
  it('keeps validation files out of both canonical and hidden public URLs', async () => {
    let release, entered, staged;
    const waiting = new Promise((resolve) => {
      entered = resolve;
    });
    const f = await fixture({
      maxConcurrentPerUser: 1,
      detector: async (file) => {
        staged = file;
        entered();
        await new Promise((resolve) => {
          release = resolve;
        });
        return { mime: 'image/png' };
      },
    });
    const pending = f.upload();
    await waiting;
    try {
      const proposed = path.basename(staged);
      expect((await fetch(`${f.base}/api/upload/7/${encodeURIComponent(proposed)}`)).status).toBe(404);
      const hidden = path.relative(f.directory, staged).split(path.sep).map(encodeURIComponent).join('/');
      expect((await fetch(`${f.base}/api/upload/${hidden}`)).status).toBe(404);
      expect((await f.upload('overlap.png')).status).toBe(429);
    } finally {
      release();
    }
    expect((await pending).status).toBe(200);
  });
  it('limits by authenticated member and recovers after a rejected attempt', async () => {
    const f = await fixture({ rateLimit: 1 });
    expect((await f.upload()).status).toBe(200);
    expect((await f.upload()).status).toBe(429);
    expect((await f.upload('other.png', png, 'image/png', jwt.sign({ id: 8 }, secret))).status).toBe(200);
  });
  it('bounds detector execution and recognizes a real file in the isolated worker', async () => {
    const f = await fixture();
    const file = path.join(f.directory, 'fixture.png');
    await writeFile(file, png);
    expect((await detectUploadType(file)).mime).toBe('image/png');
    await expect(detectUploadType(file, undefined, 1)).rejects.toThrow('超时');
    await expect(detectUploadType(file, AbortSignal.abort())).rejects.toThrow('中断');
  });
});
