// lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// 环境变量控制ratelimit
const ENABLE_RATE_LIMIT = process.env.RATE_LIMIT_ENABLE !== 'false';
const RATE_LIMIT_COUNT = parseInt(process.env.RATE_LIMIT_COUNT || '5', 10);
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || '1 m';

function parseWindow(str: string): `${number} ${'s'|'m'|'h'|'d'}` {
  const match = str.match(/^(\d+)\s*([smhd])$/);
  if (!match) return '1 m';
  return `${parseInt(match[1], 10)} ${match[2]}` as `${number} ${'s'|'m'|'h'|'d'}`;
}
const WINDOW = parseWindow(RATE_LIMIT_WINDOW);

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(RATE_LIMIT_COUNT, WINDOW),
  analytics: true,
});

export async function checkRateLimit(key: string) {
  if (!ENABLE_RATE_LIMIT) {
    return { success: true, limit: RATE_LIMIT_COUNT, remaining: RATE_LIMIT_COUNT, reset: Date.now() + 60000 };
  }
  // 返回 { success: boolean, limit: number, remaining: number, reset: number }
  return ratelimit.limit(key);
}
