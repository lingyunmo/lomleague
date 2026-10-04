import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createFileRouter } from '../routes/fileRoutes.js';
import { createUploadStatic } from '../middleware/uploadStatic.js';

describe('real multipart upload → disk → returned URL', () => {
  let directory, server, baseUrl;
  const secret = 'local-upload-test-only';
  const token = jwt.sign({ id: 7 }, secret);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=',
    'base64',
  );
  beforeAll(async () => {
    vi.stubEnv('JWT_SECRET', secret);
    directory = await mkdtemp(path.join(tmpdir(), 'lom-upload-test-'));
    const app = express();
    app.use('/api/file', createFileRouter(directory, { rateLimit: 1000 }));
    app.use('/api/upload', createUploadStatic(directory));
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
      body.append('file', new Blob([png], { type: 'image/png' }), name);
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
      expect(await readFile(path.join(directory, '7', data.filename))).toEqual(png);
      const download = await fetch(`${baseUrl}${data.url}`);
      expect(download.status).toBe(200);
      expect(download.headers.get('x-content-type-options')).toBe('nosniff');
      expect(download.headers.get('content-security-policy')).toContain('sandbox allow-downloads');
      expect(Buffer.from(await download.arrayBuffer())).toEqual(png);
    },
  );
  it('does not double-decode UTF-8 filename* parameters', async () => {
    const boundary = 'lom-test-boundary';
    const name = '论文终稿.png';
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename*=UTF-8''${encodeURIComponent(name)}\r\nContent-Type: image/png\r\n\r\n`,
      ),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
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
  it.each(['中文论文.pdf', '100%.pdf', '%E4%B8%AD.pdf', '世界🧱.pdf'])(
    'accepts the advertised PDF format and preserves %s end to end',
    async (name) => {
      const bytes = '%PDF-1.4\nlocal-fixture\n%%EOF';
      const body = new FormData();
      body.append('file', new Blob([bytes], { type: 'application/pdf' }), name);
      const response = await fetch(`${baseUrl}/api/file/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.filename).toMatch(/^\d+_/);
      expect(data.filename.replace(/^\d+_/, '')).toBe(name);
      expect(data.url).toBe(`/api/upload/7/${encodeURIComponent(data.filename)}`);
      expect(await readFile(path.join(directory, '7', data.filename), 'utf8')).toBe(bytes);
      const download = await fetch(`${baseUrl}${data.url}`);
      expect(download.status).toBe(200);
      expect(download.headers.get('content-type')).toContain('application/pdf');
      expect(download.headers.get('content-security-policy')).not.toContain('sandbox');
      expect(await download.text()).toBe(bytes);
    },
  );
  it('still rejects unsupported MIME types without leaving a stored file', async () => {
    const before = await readdir(path.join(directory, '7'));
    const body = new FormData();
    body.append('file', new Blob(['fixture'], { type: 'text/html' }), 'unsafe.html');
    const response = await fetch(`${baseUrl}/api/file/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    expect(response.status).toBe(400);
    expect(await readdir(path.join(directory, '7'))).toEqual(before);
  });
  it('rejects new active documents but continues isolating an already stored legacy document', async () => {
    const bytes =
      '<!doctype html><h1>Local isolation fixture</h1><script>document.body.dataset.executed="yes"</script>';
    const body = new FormData();
    body.append('file', new Blob([bytes], { type: 'image/png' }), 'local-isolation.html');
    const response = await fetch(`${baseUrl}/api/file/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    expect(response.status).toBe(400);
    const filename = '1_legacy-isolation.html';
    await writeFile(path.join(directory, '7', filename), bytes);
    const download = await fetch(`${baseUrl}/api/upload/7/${filename}`);
    expect(download.status).toBe(200);
    const policy = download.headers.get('content-security-policy');
    expect(policy).toContain('sandbox allow-downloads');
    expect(policy).not.toContain('allow-scripts');
    expect(policy).not.toContain('allow-same-origin');
    expect(download.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await download.text()).toBe(bytes);
  });
  it('still enforces the 10 MB limit and removes rejected partial uploads', async () => {
    const before = await readdir(path.join(directory, '7'));
    const body = new FormData();
    body.append('file', new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'large.pdf');
    const response = await fetch(`${baseUrl}/api/file/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    expect(response.status).toBe(400);
    expect(await readdir(path.join(directory, '7'))).toEqual(before);
  });
});
