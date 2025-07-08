// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ipRateLimit } from '@/lib/rateLimit';

// 根据您的 action.ts (nanoid(7))，我们定义一个严格的正则表达式来匹配聊天室路径
// 它只匹配 /chat/ 后面跟着7个字符（字母、数字、下划线、中划线）的路径
const VALID_CHAT_ROOM_PATH_REGEX = /^\/chat\/[a-zA-Z0-9_-]{7}$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip ?? '127.0.0.1';

  // --- 【第一步】应用速率限制 ---
  // 我们将对所有潜在的高频或受保护的端点进行速率限制
  
  // 1. 判断是否是有效的聊天室访问路径
  const isChatRoomPath = VALID_CHAT_ROOM_PATH_REGEX.test(pathname);

  // 2. 您原有的其他受保护路径逻辑
  const v = request.nextUrl.searchParams.get('v');
  const isProtectedRootView = pathname === '/' && v && (v.length === 5 || v.length === 6);
  const isProtectedApiRequest = pathname === '/api/generate' || pathname === '/api/verify';

  // 如果请求命中了任何一个受保护的规则，则执行速率限制
  if (isChatRoomPath || isProtectedRootView || isProtectedApiRequest) {
    const rateLimitResponse = await ipRateLimit(ip);
    if (rateLimitResponse) {
      // 如果被限流，则直接返回限流响应
      return rateLimitResponse;
    }
  }

  // --- 【第二步】处理路由访问控制 ---
  // 只有通过了速率限制（或无需限制）的请求才会到达这里

  // 1. 允许访问 /chat 管理首页 (用于输入管理员密码)
  if (pathname === '/chat') {
    return NextResponse.next();
  }

  // 2. 如果是格式正确的聊天室路径，则放行
  if (isChatRoomPath) {
    return NextResponse.next();
  }

  // 3. 允许访问您原有的其他路径
  if (pathname === '/send' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // 4. 处理根路径的访问逻辑 (与您原来保持一致)
  if (pathname === '/') {
    // 只有当v参数存在且合法时，才认为是有效路径
    if (v && (v.length === 5 || v.length === 6)) {
      return NextResponse.next();
    }
    // 注意：如果只是访问 /，上面的if不满足，会继续向下走到最终的404
  }

  // 【兜底规则】如果以上所有规则都不匹配，说明是无效路径，返回 404
  // 这将自动拦截 /chat/123, /chat/too-long, /chat/ 等所有不符合格式的请求
  return new Response('Not Found', { status: 404 });
}

export const config = {
  // 您的 matcher 保持不变，它很好地排除了静态资源
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

         //旧版逻辑（备份）
        //const ip = request.ip ?? '127.0.0.1';
        // const rateLimitResponse = await ipRateLimit(ip);
        // if (rateLimitResponse) {
        //   // 如果 ipRateLimit 返回了一个响应，说明该IP被阻止了，
        //   // 我们直接返回这个响应，中断后续所有逻辑。
        //   return rateLimitResponse;
        // }