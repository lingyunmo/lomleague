export const SESSION_EXPIRED_EVENT = 'lom:session-expired';

// An old failed request must never clear a newer login session.
export function expireSession(storage, expectedToken, notify) {
  if (!expectedToken || storage.getItem('token') !== expectedToken) return false;
  storage.removeItem('token');
  storage.removeItem('user');
  notify();
  return true;
}
