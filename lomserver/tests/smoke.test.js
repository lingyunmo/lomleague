import { describe, expect, it, vi } from 'vitest';
import { checkApplication } from '../scripts/smoke.mjs';
const response = (data, status = 200) => new Response(JSON.stringify(data), { status });

describe('read-only container preflight', () => {
  it('checks revision and an actual read-only database-backed route', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response({ version: 'test', revision: 'sha' }))
      .mockResolvedValueOnce(response({ posts: [] }));
    expect(await checkApplication('http://localhost', 'sha', request)).toEqual({ version: 'test', revision: 'sha' });
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost/api/health',
      'http://localhost/api/forum/posts?pageSize=1',
    ]);
    expect(request.mock.calls.every(([, options]) => !options.method || options.method === 'GET')).toBe(true);
  });
  it('rejects the wrong application revision before querying the database', async () => {
    const request = vi.fn().mockResolvedValue(response({ revision: 'old' }));
    await expect(checkApplication('http://localhost', 'sha', request)).rejects.toThrow('revision mismatch');
    expect(request).toHaveBeenCalledOnce();
  });
  it('rejects an unhealthy application', async () => {
    await expect(checkApplication('http://localhost', 'sha', async () => response({}, 503))).rejects.toThrow(
      'Health endpoint returned HTTP 503',
    );
  });
  it('rejects a failing database-backed read without exposing response data', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response({ revision: 'sha' }))
      .mockResolvedValueOnce(response({ message: 'private database detail' }, 500));
    await expect(checkApplication('http://localhost', 'sha', request)).rejects.toThrow(
      'Read-only database endpoint returned HTTP 500',
    );
  });
  it('rejects incompatible forum responses', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(response({ revision: 'sha' }))
      .mockResolvedValueOnce(response({ html: true }));
    await expect(checkApplication('http://localhost', 'sha', request)).rejects.toThrow(
      'Invalid forum response contract',
    );
  });
});
