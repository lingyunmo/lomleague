import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

// Reject hostnames, ports, zone IDs and legacy/octal IPv4 forms before parsing.
export function normalizeIp(value) {
  if (typeof value !== 'string') return '';
  const ip = value.trim();
  if (ip.length > 64 || ip.includes('%') || !isIP(ip)) return '';
  return ipaddr.process(ip).toString();
}

export function isPublicIp(value) {
  const ip = normalizeIp(value);
  return !!ip && ipaddr.parse(ip).range() === 'unicast';
}

// Explicit address/CIDR allowlist: never trust-all, hop counts or all Docker peers.
export function createProxyTrust(value = '') {
  if (typeof value !== 'string' || value.length > 4096) throw new TypeError('Invalid TRUSTED_PROXY_CIDRS');
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length > 64) throw new TypeError('Too many trusted proxy CIDRs');
  const ranges = entries.map((entry) => {
    const parts = entry.split('/');
    const address = normalizeIp(parts[0]);
    const bits = address && ipaddr.parse(address).kind() === 'ipv4' ? 32 : 128;
    const prefix = parts.length === 1 ? bits : Number(parts[1]);
    if (
      !address ||
      parts.length > 2 ||
      (parts.length === 2 && !/^\d+$/.test(parts[1])) ||
      !Number.isInteger(prefix) ||
      prefix < 1 ||
      prefix > bits
    ) {
      throw new TypeError('Invalid trusted proxy address/CIDR');
    }
    return [ipaddr.parse(address), prefix];
  });
  return (value) => {
    const ip = normalizeIp(value);
    if (!ip) return false;
    const address = ipaddr.parse(ip);
    return ranges.some(([network, prefix]) => network.kind() === address.kind() && address.match(network, prefix));
  };
}

export function getClientIp(req) {
  return normalizeIp(req.ip) || normalizeIp(req.socket?.remoteAddress) || '';
}
