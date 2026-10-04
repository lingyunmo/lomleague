import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIpLocationService } from '../services/ipLocationService.js';
const queryIp = (url) => decodeURIComponent(new URL(url).pathname.split('/').at(-1));
const answer = (ip, data = {}, options) =>
  new Response(
    JSON.stringify({
      status: 'success',
      query: ip,
      country: '中国',
      regionName: '浙江',
      city: '杭州',
      ...data,
    }),
    options,
  );
const provider = () => vi.fn(async (url) => answer(queryIp(url)));
afterEach(() => vi.useRealTimers());
describe('existing HTTP ip-api with bounded fail-safe lookup', () => {
  it('does not reset quota at a wall-clock minute boundary', async () => {
    let time = 59_999;
    const request = provider(),
      lookup = createIpLocationService({ request, now: () => time, minuteLimit: 1 });
    await lookup('8.8.8.1');
    time = 60_000;
    expect((await lookup('8.8.8.2')).region).toBe('未知地区');
    expect(request).toHaveBeenCalledOnce();
    time = 119_999;
    expect((await lookup('8.8.8.2')).region).toBe('中国 浙江 杭州');
  });
  it('retains the reachable HTTP provider and explicit validated IP', async () => {
    const request = provider(),
      lookup = createIpLocationService({ request });
    expect(await lookup('::ffff:8.8.8.8')).toEqual({ ip: '8.8.8.8', region: '中国 浙江 杭州' });
    expect(request).toHaveBeenCalledOnce();
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('http://ip-api.com/json/8.8.8.8?lang=zh-CN&fields=status,message,query,country,regionName,city');
    expect(options).toMatchObject({ redirect: 'error', headers: { Accept: 'application/json' } });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it('queries explicit IPv6 rather than the server outbound IP', async () => {
    const request = provider();
    expect(await createIpLocationService({ request })('2001:4860:4860::8888')).toEqual({
      ip: '2001:4860:4860::8888',
      region: '中国 浙江 杭州',
    });
    expect(queryIp(request.mock.calls[0][0])).toBe('2001:4860:4860::8888');
  });
  it.each(['127.0.0.2', '10.0.0.8', '172.29.0.12', 'fd00::1', 'fe80::1', '2001:db8::1', '100.64.0.1'])(
    'never transmits or substitutes private/reserved %s',
    async (ip) => {
      const request = provider();
      expect(await createIpLocationService({ request })(ip)).toEqual({ ip, region: '未知地区' });
      expect(request).not.toHaveBeenCalled();
    },
  );
  it.each(['hostname', '8.8.8.8/path', '8.8.8.8?callback=attack', null])('rejects invalid %j', async (ip) => {
    const request = provider();
    expect(await createIpLocationService({ request })(ip)).toEqual({ ip: '', region: '未知地区' });
    expect(request).not.toHaveBeenCalled();
  });
  it.each([
    { status: 'fail' },
    { query: '1.1.1.1' },
    { country: '' },
    { country: ['中国'] },
    { city: '<script>' },
    { city: 'line\nbreak' },
    { country: '界'.repeat(129) },
    { country: '界'.repeat(100), regionName: '区'.repeat(100) },
  ])('rejects mismatched/malformed provider result %j', async (data) => {
    const request = vi.fn(async () => answer('8.8.8.8', data));
    expect(await createIpLocationService({ request })('8.8.8.8')).toEqual({ ip: '8.8.8.8', region: '未知地区' });
  });
  it('caches for six hours, deduplicates same-IP work and returns independent copies', async () => {
    let time = 0;
    const request = provider(),
      lookup = createIpLocationService({ request, now: () => time });
    const results = await Promise.all(Array.from({ length: 5 }, () => lookup('8.8.8.8')));
    expect(request).toHaveBeenCalledOnce();
    results[0].region = 'modified';
    expect((await lookup('8.8.8.8')).region).toBe('中国 浙江 杭州');
    time = 6 * 60 * 60 * 1000;
    await lookup('8.8.8.8');
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('bounds the cache', async () => {
    const request = provider(),
      lookup = createIpLocationService({ request, maxEntries: 2 });
    for (const ip of ['8.8.8.1', '8.8.8.2', '8.8.8.3', '8.8.8.1']) await lookup(ip);
    expect(request).toHaveBeenCalledTimes(4);
  });
  it('returns within 1800ms even for a provider that never resolves', async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => new Promise(() => {})),
      lookup = createIpLocationService({ request, timeoutMs: 1800 });
    const result = lookup('8.8.8.8');
    await vi.advanceTimersByTimeAsync(1800);
    expect(await result).toEqual({ ip: '8.8.8.8', region: '未知地区' });
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('does not let a late response overwrite the timed-out cache', async () => {
    vi.useFakeTimers();
    let finish;
    const request = vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
      lookup = createIpLocationService({ request, timeoutMs: 100 });
    const result = lookup('8.8.8.8');
    await vi.advanceTimersByTimeAsync(100);
    expect((await result).region).toBe('未知地区');
    finish(answer('8.8.8.8'));
    await Promise.resolve();
    expect((await lookup('8.8.8.8')).region).toBe('未知地区');
  });
  it('bounds distinct concurrent work without queueing provider calls', async () => {
    const complete = [];
    const request = vi.fn((url) => new Promise((resolve) => complete.push(() => resolve(answer(queryIp(url))))));
    const lookup = createIpLocationService({ request, maxConcurrent: 2 });
    const first = lookup('8.8.8.1'),
      second = lookup('8.8.8.2');
    expect(await lookup('8.8.8.3')).toEqual({ ip: '8.8.8.3', region: '未知地区' });
    expect(request).toHaveBeenCalledTimes(2);
    complete.forEach((finish) => finish());
    await Promise.all([first, second]);
  });
  it('enforces a provider-wide minute budget', async () => {
    let time = 0;
    const request = provider(),
      lookup = createIpLocationService({ request, now: () => time, minuteLimit: 2 });
    await lookup('8.8.8.1');
    await lookup('8.8.8.2');
    expect((await lookup('8.8.8.3')).region).toBe('未知地区');
    expect(request).toHaveBeenCalledTimes(2);
    time = 60_000;
    expect((await lookup('8.8.8.3')).region).toBe('中国 浙江 杭州');
  });
  it.each([429, 200])('honors quota headers on HTTP %s', async (status) => {
    let time = 0;
    const request = vi.fn(async (url) =>
      answer(queryIp(url), {}, { status, headers: { 'X-Rl': '0', 'X-Ttl': '120' } }),
    );
    const lookup = createIpLocationService({ request, now: () => time });
    expect((await lookup('8.8.8.1')).region).toBe(status === 200 ? '中国 浙江 杭州' : '未知地区');
    expect((await lookup('8.8.8.2')).region).toBe('未知地区');
    expect(request).toHaveBeenCalledOnce();
    time = 120_000;
    await lookup('8.8.8.2');
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('backs off on failures and negatively caches the failed IP', async () => {
    let time = 0;
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(async (url) => answer(queryIp(url)));
    const lookup = createIpLocationService({ request, now: () => time });
    expect((await lookup('8.8.8.1')).region).toBe('未知地区');
    expect((await lookup('8.8.8.2')).region).toBe('未知地区');
    time = 30_000;
    expect((await lookup('8.8.8.1')).region).toBe('未知地区');
    expect((await lookup('8.8.8.2')).region).toBe('中国 浙江 杭州');
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([
    () => new Response('invalid JSON'),
    () => new Response('x'.repeat(16 * 1024 + 1)),
    () => new Response('', { status: 503 }),
    () => new Response('', { status: 302 }),
  ])('handles malformed/oversized/unsuccessful replies', async (response) => {
    expect(await createIpLocationService({ request: vi.fn(async () => response()) })('8.8.8.8')).toEqual({
      ip: '8.8.8.8',
      region: '未知地区',
    });
  });
});
