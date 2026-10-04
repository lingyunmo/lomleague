// Client-side expiry scheduling only; the server still verifies JWT signatures.
export function isTokenExpired(token, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.split('.').length !== 3) return true;
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp * 1000 <= now;
  } catch {
    return true;
  }
}
