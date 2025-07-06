// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // 允许访问 /send 页面
  if (pathname === '/send') {
    return NextResponse.next();
  }

  // 允许访问 API 路由
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 对于根路径，必须带有 v 参数
  if (pathname === '/') {
    const v = searchParams.get('v');
    // v 参数必须存在，且长度为5或6
    if (v && (v.length === 5 || v.length === 6)) {
      return NextResponse.next();
    }
  }

  // 其他所有请求都返回 404 Not Found
  return new Response(null, { status: 404 });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};