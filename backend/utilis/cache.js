const crypto = require('crypto');

const cache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hashKey(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}

function get(summary) {
  const key = hashKey(summary);
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function set(summary, value, ttlMs = DEFAULT_TTL_MS) {
  const key = hashKey(summary);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function clear() {
  cache.clear();
}

function size() {
  return cache.size;
}

module.exports = { get, set, clear, size, hashKey };
