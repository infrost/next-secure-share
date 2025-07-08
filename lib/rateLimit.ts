// lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';
// 【新增】为了返回 NextResponse
import { NextResponse } from 'next/server';

// 环境变量控制ratelimit
export const ENABLE_RATE_LIMIT = process.env.RATE_LIMIT_ENABLE !== 'false';
export const ENABLE_AUDIT_LOG = process.env.AUDIT_LOG_ENABLE !== 'false';


const RATE_LIMIT_COUNT = parseInt(process.env.RATE_LIMIT_COUNT || '5', 10);
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || '1 m';
// 【新增】一个独立的、只负责记录日志的函数
const LOG_TTL = parseInt(process.env.RATE_LIMIT_LOG_TTL || '604800', 10); // 7天

function parseWindow(str: string): `${number} ${'s'|'m'|'h'|'d'}` {
  const match = str.match(/^(\d+)\s*([smhd])$/);
  if (!match) return '1 m';
  return `${parseInt(match[1], 10)} ${match[2]}` as `${number} ${'s'|'m'|'h'|'d'}`;
}
const WINDOW = parseWindow(RATE_LIMIT_WINDOW);

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(RATE_LIMIT_COUNT, WINDOW),
  analytics: false, //这里用自己的logic来处理日志，设置成true有系统log
});


export async function writeLog(key: string, linkId: string | null, data: Record<string, string>) {
  // 如果日志功能被禁用，则直接返回，不执行任何操作
  if (!ENABLE_AUDIT_LOG) {
    return;
  }
  const finalLinkId = linkId || 'N/A'; // 如果没有 linkId，使用 N/A 作为占位符
  const logKey = `log:${key}:${finalLinkId}:${Date.now()}`; // 用时间戳保证唯一性
  await redis.set(logKey, JSON.stringify(data), { ex: LOG_TTL });
}

// 【新增】一个封装了完整IP守卫逻辑的函数
/**
 * 检查给定IP的速率限制。
 * 如果被阻止，它会智能地记录一次日志并返回一个拒绝响应。
 * 如果通过，它会返回 null。
 * @param ip 用户的IP地址
 * @returns 如果被阻止，则返回 NextResponse 对象，否则返回 null。
 */
export async function ipRateLimit(ip: string): Promise<NextResponse | null> {
  if (!ENABLE_RATE_LIMIT) {
    return null; // 如果功能关闭，则直接放行
  }
  
  const { success, reset } = await ratelimit.limit(`view_attempt:${ip}`);
  
  if (success) {
    return null; // 如果通过，则放行
  }

  // 如果被阻止，执行智能日志记录
  const logTrackerKey = `log_tracker:fail:${ip}`;
  const hasBeenLogged = await redis.get(logTrackerKey);

  if (!hasBeenLogged) {
    await writeLog('view:ratelimit:fail', null, { 
      ip: ip, 
      reason: 'IP_RATE_LIMIT_EXCEEDED' 
    });
    await redis.set(logTrackerKey, '1', { pxat: reset });
  }
  
  // 返回一个标准的“请求过多”响应
  return new NextResponse('Too many requests.', { status: 429 });
}