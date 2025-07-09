// app/send/actions.ts
'use server';

import { headers } from 'next/headers';
import { generateLinkLogic } from '@/lib/generate-logic'; // 导入共享逻辑

export interface GenerateActionResult {
  url?: string;
  password?: string;
  error?: string;
}

export async function generateSecureLink(
  prevState: GenerateActionResult | undefined,
  formData: FormData,
): Promise<GenerateActionResult> {
  const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';
  
  const result = await generateLinkLogic({
    adminPassword: formData.get('adminPassword') as string,
    enable2FA: formData.get('enable2FA') === 'true',
    email: formData.get('email') as string | null,
    expiry: formData.get('expiry') as string | null,
    message: formData.get('message') as string | null,
    customPassword: formData.get('customPassword') as string | null,
    burnAfterRead: formData.get('burnAfterRead') === 'true',
    ip: ip,
  });

  if (result.error) {
    return { error: result.error };
  }
  
  return result.data || {};
}