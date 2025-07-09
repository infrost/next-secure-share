// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateLinkLogic } from '@/lib/generate-logic'; // 导入共享逻辑

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ip = request.ip ?? '127.0.0.1';

  // 将请求体和IP传递给核心逻辑函数
  const result = await generateLinkLogic({ ...body, ip });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}