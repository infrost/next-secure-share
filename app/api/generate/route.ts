// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { encrypt } from '@/lib/crypto';
import { nanoid } from 'nanoid';
import { checkRateLimit } from '@/lib/rateLimit';
import type { StoredData } from '@/lib/types';

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await checkRateLimit(`generate:${ip}`);
  if (!success) {
    return new Response('Too many requests.', { status: 429 });
  }

  const body = await request.json();
  const { adminPassword, enable2FA, email, expiry, message, customPassword } = body;

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  let finalPassword = customPassword;
  let passwordWasGenerated = false;
  if (!finalPassword) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    finalPassword = '';
    for (let i = 0; i < 16; i++) {
      finalPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    passwordWasGenerated = true;
  }
  
  const passwordCipher = encrypt(finalPassword);
  const id = nanoid(5);
  const dataToStore: StoredData = {
    passwordCipher,
    requires2FA: !!enable2FA,
  };
  // 如果有 message，加密它
  if (message) {
    dataToStore.messageCipher = encrypt(message);
  }
  if (enable2FA && email) dataToStore.email = email;

  const expiryInSeconds = expiry ? parseInt(expiry, 10) * 3600 : 3 * 24 * 3600; // 默认3天
  await redis.set(id, JSON.stringify(dataToStore), { ex: expiryInSeconds });

  const generatedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/?v=${id}`;
  const responsePayload: { url: string; password?: string } = { url: generatedUrl };
  
  // 只有当密码是系统生成的，才把它返回给前端
  if (passwordWasGenerated) {
    responsePayload.password = finalPassword;
  }
  return NextResponse.json(responsePayload);
}