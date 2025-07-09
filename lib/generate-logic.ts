// lib/generate-logic.ts
import { redis } from '@/lib/redis';
import { encrypt } from '@/lib/crypto';
import { nanoid } from 'nanoid';
import { writeLog } from '@/lib/rateLimit';
import type { StoredData } from '@/lib/types';

interface GenerateParams {
    adminPassword?: string | null;
    enable2FA?: boolean;
    email?: string | null;
    expiry?: string | null;
    message?: string | null;
    customPassword?: string | null;
    burnAfterRead?: boolean;
    ip: string;
}

export async function generateLinkLogic(params: GenerateParams) {
    const { adminPassword, enable2FA, email, expiry, message, customPassword, burnAfterRead, ip } = params;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return { error: 'Unauthorized', status: 401 };
    }
    
    // ... (所有生成逻辑都放在这里)
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
        burnAfterRead: !!burnAfterRead,
    };

    if (message) dataToStore.messageCipher = encrypt(message);
    if (enable2FA && email) dataToStore.email = email;

    const expiryInSeconds = expiry ? parseInt(expiry, 10) * 3600 : 3 * 24 * 3600;
    await redis.set(id, JSON.stringify(dataToStore), { ex: expiryInSeconds });

    await writeLog(`generate:${ip}`, id, {
        linkId: id,
        ip: ip,
        action: 'CREATE_SUCCESS_BY_API', // 区分API调用
    });

    const generatedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/?v=${id}`;
    const responsePayload: { url: string; password?: string } = { url: generatedUrl };

    if (passwordWasGenerated) {
        responsePayload.password = finalPassword;
    }

    return { data: responsePayload, status: 200 };
}