// app/actions.ts
'use server';

import { redis } from '@/lib/redis';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { nanoid } from 'nanoid';
import type { StoredData } from '@/lib/types';

// --- Destroy Action ---
export async function destroyLinkAction(id: string): Promise<{ success: boolean; message: string }> {
  if (!id) {
    return { success: false, message: 'ID is required' };
  }
  try {
    await redis.del(id);
    revalidatePath('/'); // 清除相关页面的缓存
    return { success: true, message: '链接已销毁！' };
  } catch (error) {
    console.error(error);
    return { success: false, message: '销毁失败，请重试。' };
  }
}


// --- Verify Email Action ---
export async function sendVerificationEmailAction(id: string): Promise<{ success: boolean; message: string }> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!fromEmail || !resendApiKey || !appUrl) {
    console.error('Missing one or more environment variables for email.');
    return { success: false, message: '服务器配置错误，无法发送邮件。' };
  }
  
  if (!id) return { success: false, message: 'ID is required' };

  const originalData: StoredData | null = await redis.get(id);
  if (!originalData || !originalData.email) {
    return { success: false, message: '无效ID或没有关联的邮箱。' };
  }

  const resend = new Resend(resendApiKey);
  const tempId = nanoid(6);
  await redis.set(tempId, id, { ex: 300 }); // 5分钟有效

  const magicLink = `${appUrl}/?v=${tempId}`;
  
  try {
    await resend.emails.send({
      from: fromEmail, 
      to: originalData.email,
      subject: '您的安全信息一次性访问链接',
      html: `<p>请点击此链接查看安全信息 (5分钟内有效): <a href="${magicLink}">${magicLink}</a></p>`,
    });
    return { success: true, message: '验证邮件已发送到您的邮箱，请查收。（如未收到请检查垃圾邮件）' };
  } catch (error) {
    console.error(error);
    return { success: false, message: '邮件发送失败。' };
  }
}