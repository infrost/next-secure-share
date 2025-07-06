// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { Resend } from 'resend';
import { nanoid } from 'nanoid';
import type { StoredData } from '@/lib/types';

export async function POST(request: NextRequest) {
  // --- 关键修正：把所有环境变量的检查和使用，都放在函数内部 ---

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // 1. 在函数开头集中检查所有需要的环境变量
  // 这是最稳妥的做法，能确保服务器配置正确，并彻底解决类型问题
  if (!fromEmail || !resendApiKey || !appUrl) {
    // 打印具体的服务端错误日志，方便排查
    console.error('Missing one or more environment variables: RESEND_FROM_EMAIL, RESEND_API_KEY, NEXT_PUBLIC_APP_URL');
    // 向客户端返回一个通用的服务器错误，而不是暴露细节
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  
  // --- 检查通过后，TypeScript 就能确定这些变量都是 string ---

  const { id } = await request.json(); // 5位主ID

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const originalData: StoredData | null = await redis.get(id);
  if (!originalData || !originalData.email) {
    return NextResponse.json({ error: 'Invalid ID or no email associated.' }, { status: 404 });
  }

  const resend = new Resend(resendApiKey);
  const tempId = nanoid(6);
  await redis.set(tempId, id, { ex: 300 });

  const magicLink = `${appUrl}/?v=${tempId}`;
  
  try {
    // 到这里，fromEmail 已经被确认为 string，编译将不再报错
    await resend.emails.send({
      from: fromEmail, 
      to: originalData.email,
      subject: '您的安全信息一次性访问链接',
      html: `<p>请点击此链接查看安全信息 (5分钟内有效): <a href="${magicLink}">${magicLink}</a></p>`,
    });
    return NextResponse.json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send email.' }, { status: 500 });
  }
}