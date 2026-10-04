import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFileRouter } from '../routes/fileRoutes.js';

describe('real multipart upload → disk → returned URL', () => {
  let directory, server, baseUrl;
  const secret = 'local-upload-test-only';
  const token = jwt.sign({ id: 7 }, secret);
  beforeAll(async () => {
    vi.stubEnv('JWT_SECRET', secret);
    directory = await mkdtemp(path.join(tmpdir(), 'lom-upload-test-'));
    const app = express();
    app.use('/api/file', createFileRouter(directory));
    app.use('/api/upload', express.static(directory));
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (directory) await rm(directory, { recursive: true });
    vi.unstubAllEnvs();
  });
  it.each(['中文论文.png', '100%.png', '%E4%B8%AD.png', 'café.png', '世界🧱.png'])(
    'keeps %s identical through upload, storage and reading',
    async (name) => {
      const body = new FormData();
      body.append('file', new Blob(['fixture-bytes'], { type: 'image/png' }), name);
      const response = await fetch(`${baseUrl}/api/file/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.filename).toMatch(/^\d+_/);
      expect(data.filename.replace(/^\d+_/, '')).toBe(name);
      expect(await readdir(path.join(directory, '7'))).toContain(data.filename);
      expect(await readFile(path.join(directory, '7', data.filename), 'utf8')).toBe('fixture-bytes');
      const download = await fetch(`${baseUrl}${data.url}`);
      expect(download.status).toBe(200);
      expect(await download.text()).toBe('fixture-bytes');
    },
  );
  it('does not double-decode UTF-8 filename* parameters', async () => {
    const boundary = 'lom-test-boundary';
    const name = '论文终稿.png';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename*=UTF-8''${encodeURIComponent(name)}\r\nContent-Type: image/png\r\n\r\nfixture\r\n--${boundary}--\r\n`;
    const response = await fetch(`${baseUrl}/api/file/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    expect(response.status).toBe(200);
    expect((await response.json()).filename.replace(/^\d+_/, '')).toBe(name);
  });
  it('rejects unauthenticated uploads before storing data', async () => {
    const response = await fetch(`${baseUrl}/api/file/upload`, { method: 'POST' });
    expect(response.status).toBe(401);
  });
});
