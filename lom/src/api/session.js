export const SESSION_EXPIRED_EVENT = 'lom:session-expired';
const sessionGenerations = new WeakMap();

export function getSessionGeneration(storage) {
  return sessionGenerations.get(storage) || 0;
}

export function invalidateSessionRequests(storage) {
  sessionGenerations.set(storage, getSessionGeneration(storage) + 1);
}

// An old failed request must never clear a newer login session.
export function expireSession(storage, expectedToken, notify) {
  if (!expectedToken || storage.getItem('token') !== expectedToken) return false;
  invalidateSessionRequests(storage);
  storage.removeItem('token');
  storage.removeItem('user');
  notify();
  return true;
}
