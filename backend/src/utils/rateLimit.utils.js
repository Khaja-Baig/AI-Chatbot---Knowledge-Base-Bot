/**
 * Simple Promise-based sleep helper.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Computes batch delay in ms based on environment variables.
 * Priority:
 *  1. EMBED_BATCH_DELAY_MS  — explicit override
 *  2. EMBED_REQUESTS_PER_MINUTE — computed cap (with 10% headroom buffer)
 *  3. Default: 1200 ms (approx 50 requests/min, safe for Gemini free tier)
 * @returns {number} Delay in milliseconds
 */
export function computeBatchDelay() {
  if (process.env.EMBED_BATCH_DELAY_MS) {
    const delay = parseInt(process.env.EMBED_BATCH_DELAY_MS, 10);
    if (!isNaN(delay)) return delay;
  }
  if (process.env.EMBED_REQUESTS_PER_MINUTE) {
    const rpm = parseInt(process.env.EMBED_REQUESTS_PER_MINUTE, 10);
    if (!isNaN(rpm) && rpm > 0) {
      // Add a 10% safety buffer: 60s / RPM * 1.1
      return Math.ceil((60000 / rpm) * 1.1);
    }
  }
  return 1200; // default for Gemini free tier
}

/**
 * Wraps an asynchronous operation with retry logic, exponential backoff, and random jitter.
 * @template T
 * @param {() => Promise<T>} fn - Async function to run
 * @param {object} options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.baseDelayMs=2000] - Initial delay before first retry
 * @param {number} [options.jitterMs=400] - Random jitter to add (spread range)
 * @param {(err: any) => boolean} [options.isRetryable] - Callback determining retry logic
 * @param {(attempt: number, delayMs: number, err: any) => void} [options.onRetry] - Hook run on each retry
 * @returns {Promise<T>} Result of the async operation
 */
export async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  let baseDelayMs = options.baseDelayMs ?? 2000;
  const jitterMs = options.jitterMs ?? 400;
  
  const defaultIsRetryable = (err) => {
    const status = err?.status ?? err?.statusCode;
    if (status === 429 || status >= 500) return true;
    const msg = (err?.message ?? '').toLowerCase();
    if (msg.includes('429') || msg.includes('too many requests') || msg.includes('quota')) return true;
    return false;
  };
  const isRetryable = options.isRetryable ?? defaultIsRetryable;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryAllowed = isRetryable(err);
      if (retryAllowed && attempt <= maxRetries) {
        // Calculate exponential delay + jitter
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * jitterMs;
        if (options.onRetry) {
          options.onRetry(attempt, Math.round(delay), err);
        }
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}
