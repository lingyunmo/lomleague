import { describe, expect, it } from 'vitest';
import { normalizeIp, isPublicIp, createProxyTrust, getClientIp } from '../utils/clientIp.js';
describe('strict canonical IP and explicit proxy trust', () => {
  it.each([
    ['8.8.8.8', '8.8.8.8'],
    ['::ffff:8.8.8.8', '8.8.8.8'],
    ['2001:4860:4860:0000:0000:0000:0000:8888', '2001:4860:4860::8888'],
    [' ::1 ', '::1'],
  ])('normalizes %s', (input, result) => expect(normalizeIp(input)).toBe(result));
  it.each([
    'localhost',
    'not-an-ip',
    '10.999.1.1',
    '8.8.8.8:80',
    '[::1]:80',
    '127.1',
    '0177.0.0.1',
    '0x7f000001',
    'fe80::1%eth0',
    '8.8.8.8,1.1.1.1',
    '',
    null,
    [],
  ])('rejects %j', (ip) => {
    expect(normalizeIp(ip)).toBe('');
    expect(isPublicIp(ip)).toBe(false);
  });
  it.each([
    '0.0.0.0',
    '10.0.0.8',
    '127.0.0.2',
    '169.254.1.1',
    '172.29.0.12',
    '192.168.1.1',
    '100.64.0.1',
    '192.0.2.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    'fd00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
    '::ffff:192.168.1.1',
    '64:ff9b::808:808',
  ])('keeps %s private/reserved', (ip) => {
    expect(normalizeIp(ip)).not.toBe('');
    expect(isPublicIp(ip)).toBe(false);
  });
  it.each(['8.8.8.8', '1.1.1.1', '2001:4860:4860::8888'])('recognizes public %s', (ip) =>
    expect(isPublicIp(ip)).toBe(true),
  );
  it('trusts only explicit proxy/CDN ranges, not the entire Docker network', () => {
    const trust = createProxyTrust('172.29.0.12/32,173.245.48.0/20,2606:4700::/32');
    expect(trust('::ffff:172.29.0.12')).toBe(true);
    expect(trust('172.29.0.13')).toBe(false);
    expect(trust('173.245.48.9')).toBe(true);
    expect(trust('2606:4700::1')).toBe(true);
    expect(trust('8.8.8.8')).toBe(false);
    expect(trust('invalid')).toBe(false);
    expect(createProxyTrust()('127.0.0.1')).toBe(false);
  });
  it.each(['true', '1', 'loopback', '0.0.0.0/0', '::/0', '8.8.8.8/33', '::1/129', '127.1/8', '8.8.8.8/'])(
    'fails closed for proxy configuration %s',
    (value) => expect(() => createProxyTrust(value)).toThrow(),
  );
  it('never reads arbitrary IP headers itself', () => {
    expect(
      getClientIp({
        ip: '::ffff:4.4.4.4',
        headers: { 'x-forwarded-for': '8.8.8.8', 'x-real-ip': '1.1.1.1', 'cf-connecting-ip': '9.9.9.9' },
      }),
    ).toBe('4.4.4.4');
    expect(getClientIp({ ip: 'invalid', socket: { remoteAddress: '127.0.0.1' } })).toBe('127.0.0.1');
    expect(getClientIp({})).toBe('');
  });
});
