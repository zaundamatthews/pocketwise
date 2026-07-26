/**
 * Runs `fn` with automatic retries for transient failures only.
 * Non-retryable errors (bad API key, malformed request) fail immediately
 * instead of wasting time retrying something that will never succeed.
 */

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function isRetryable(err) {
  const status = err.status || err.statusCode || (err.response && err.response.status);
  if (RETRYABLE_STATUS_CODES.has(status)) return true;

  const code = err.code || '';
  const message = (err.message || '').toLowerCase();
  if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(code)) return true;
  if (message.includes('timeout') || message.includes('network')) return true;

  return false;
}

function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {Function} fn - async function to attempt, receives no args
 * @param {Object} opts
 * @param {number} opts.retries - max retry attempts after the first try (default 2)
 * @param {number} opts.baseDelayMs - base delay for exponential backoff (default 300)
 * @param {number} opts.timeoutMs - hard timeout per attempt (default 8000)
 * @param {string} opts.label - name for logging/timeout messages
 */
async function withRetry(fn, opts = {}) {
  const { retries = 2, baseDelayMs = 300, timeoutMs = 8000, label = 'operation' } = opts;

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, label);
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < retries && isRetryable(err);
      console.error(`${label} attempt ${attempt + 1}/${retries + 1} failed: ${err.message}${canRetry ? ' — retrying' : ''}`);
      if (!canRetry) throw err;

      const jitter = Math.random() * 100;
      const delay = baseDelayMs * 2 ** attempt + jitter;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

module.exports = { withRetry, isRetryable };
