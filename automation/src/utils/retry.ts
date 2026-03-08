import { Logger } from './logger';

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试包装器
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  logger?: Logger
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.delayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      if (logger) {
        logger.debug(`执行尝试 ${attempt}/${finalConfig.maxAttempts}`);
      }
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (logger) {
        logger.warn(`尝试 ${attempt} 失败: ${lastError.message}`);
      }

      if (attempt < finalConfig.maxAttempts) {
        if (logger) {
          logger.debug(`等待 ${delay}ms 后重试...`);
        }
        await sleep(delay);
        delay *= finalConfig.backoffMultiplier;
      }
    }
  }

  throw lastError || new Error('重试次数已用尽');
}

/**
 * 带条件判断的重试
 */
export async function retryUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    timeout?: number;
  } = {},
  logger?: Logger
): Promise<T> {
  const maxAttempts = options.maxAttempts || 10;
  const delayMs = options.delayMs || 1000;
  const timeout = options.timeout || 30000;

  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await fn();

    if (predicate(result)) {
      return result;
    }

    if (Date.now() - startTime > timeout) {
      throw new Error(`重试超时 (${timeout}ms)`);
    }

    if (logger) {
      logger.debug(`条件未满足，等待 ${delayMs}ms 后重试... (尝试 ${attempt}/${maxAttempts})`);
    }

    await sleep(delayMs);
  }

  throw new Error(`重试次数已用尽，条件始终未满足`);
}

export default { retry, retryUntil, sleep };
