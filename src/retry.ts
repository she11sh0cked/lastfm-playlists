import chalk from "chalk-template";

/**
 * Options for the retry strategy
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial backoff time in milliseconds */
  initialBackoffMs?: number;
  /** Maximum backoff time in milliseconds */
  maxBackoffMs?: number;
  /** Backoff factor for exponential backoff */
  backoffFactor?: number;
  /** Whether to log retry attempts */
  logging?: boolean;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  initialBackoffMs: 1000,
  maxBackoffMs: 60000,
  backoffFactor: 2,
  logging: true,
};

/**
 * Executes a function with retry logic using exponential backoff.
 * Retries on any error up to the configured number of attempts.
 * If the error includes a `retry-after` header, that delay will be respected.
 * @param fn The function to execute with retry logic
 * @param options Retry strategy options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let attempt = 0;
  let backoffMs = opts.initialBackoffMs;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;

      // Check if we've hit the max retries
      if (attempt >= opts.maxRetries) {
        throw error;
      }

      // Get retry delay from header or use exponential backoff
      let retryAfterMs = backoffMs;
      if (error?.headers?.get("retry-after")) {
        const retryAfterSec = parseInt(error.headers.get("retry-after") || "1");
        retryAfterMs = retryAfterSec * 1000;
      }

      // Cap the retry delay at max backoff
      retryAfterMs = Math.min(retryAfterMs, opts.maxBackoffMs);

      if (opts.logging) {
        console.log(
          chalk`{yellow Retrying in ${Math.round(
            retryAfterMs / 1000
          )}s (attempt ${attempt}/${opts.maxRetries})}`
        );
      }

      // Wait for the specified time
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));

      // Increase backoff for next attempt
      backoffMs = Math.min(backoffMs * opts.backoffFactor, opts.maxBackoffMs);
    }
  }
}
