// app/chat/actions.ts
'use server';

import { redis } from '@/lib/redis';
import { nanoid } from 'nanoid';
import { encrypt } from '@/lib/crypto'; // 复用服务端的加密库来加密访问密码
import { writeLog } from '@/lib/rateLimit';
import type { ChatData, EncryptedMessage } from '@/lib/types';
import { revalidatePath } from 'next/cache';
//【新增】导入共享的链接生成逻辑和 headers
import { generateLinkLogic } from '@/lib/generate-logic';
import { headers } from 'next/headers';

const CHAT_EXPIRY = 3 * 24 * 3600; // 聊天记录默认保留3天

// 1. 创建新聊天
export async function createChat(
    adminPassword: string, 
    accessPassword?: string,
    inactiveHours: number = 72 // 默认不设置非活跃时间
): Promise<{ success: boolean; links?: { a: string; b: string }; error?: string }> {
  try {
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return { success: false, error: 'Unauthorized' };
    }

    const chatId = nanoid(7);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    const initialChatData: ChatData = {
        messages: [],
        inactiveHours: inactiveHours, // 设置非活跃时间
        accessPasswordCipher: accessPassword ? encrypt(accessPassword) : undefined,
    };

    // 如果提供了访问密码，用服务端密钥加密它
    if (accessPassword) {
        initialChatData.accessPasswordCipher = encrypt(accessPassword);
    }

    await redis.set(`chat:${chatId}`, JSON.stringify(initialChatData), { ex: CHAT_EXPIRY });

    // 审计日志
    await writeLog(`chat:create`, chatId, { action: 'CHAT_CREATED' });

    // 客户端JS将在此基础上附加 #accessKey
    const baseUrl = `${appUrl}/chat/${chatId}`;
    return {
        success: true,
        links: {
        a: `${baseUrl}?p=A`,
        b: `${baseUrl}?p=B`,
        },
    };
    } catch (e) {
        console.error('Create chat error:', e);
        return { success: false, error: 'Failed to create chat due to a server error.' };
    }
}

// 2. 获取聊天数据（仅包含加密的访问密码）
export async function getChatAccessData(chatId: string): Promise<{ accessPasswordCipher?: string; error?: string }> {
  try {
    const data: ChatData | null = await redis.get(`chat:${chatId}`);
    if (!data) return { error: 'Chat not found or expired.' };
    return { accessPasswordCipher: data.accessPasswordCipher };
  } catch (e) {
    console.error('Get chat access data error:', e);
    return { error: 'Failed to fetch chat data.' };
  }
}

// 3. 获取加密的聊天历史
export async function getChatHistory(chatId: string): Promise<{ messages?: EncryptedMessage[]; error?: string }> {
    try {
        const data: ChatData | null = await redis.get(`chat:${chatId}`);
        if (!data) return { error: 'Chat not found or expired.' };
        return { messages: data.messages };
    } catch (e) {
        console.error('Get chat history error:', e);
        return { error: 'Failed to fetch chat history.' };
    }
}

// 4. 发布新消息 (原子操作) - 更正版本
export async function postMessage(chatId: string, message: EncryptedMessage): Promise<{ success: boolean; error?: string }> {
  try {
    // 步骤 1: 直接获取当前数据
    // redis.get() 已经为我们处理了 JSON.parse
    const currentData: ChatData | null = await redis.get(`chat:${chatId}`);

    if (!currentData) {
      return { success: false, error: 'Chat not found or expired.' };
    }

    // 步骤 2: 修改 JavaScript 对象
    // 确保 messages 数组存在
    if (!Array.isArray(currentData.messages)) {
      currentData.messages = [];
    }
    currentData.messages.push(message);

    // 步骤 3: 将修改后的整个对象写回 Redis
    // redis.set() 会自动处理 JSON.stringify,默认过期时间为 3 天
    const newExpiryInSeconds = (currentData.inactiveHours || 72) * 3600;
    await redis.set(`chat:${chatId}`, currentData, { ex: newExpiryInSeconds });
    
    // 按需重新验证，通知其他客户端可能有新消息
    revalidatePath(`/chat/${chatId}`);

    return { success: true };
  } catch (e) {
    console.error('Post message error:', e);
    // 返回一个更通用的错误，避免暴露内部实现细节
    return { success: false, error: 'Failed to post message due to a server error.' };
  }
}

// 5. 销毁聊天
export async function destroyChat(chatId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await redis.del(`chat:${chatId}`);
        await writeLog(`chat:destroy`, chatId, { action: 'CHAT_DESTROYED' });
        revalidatePath(`/chat/${chatId}`);
        return { success: true };
    } catch (e) {
        console.error('Destroy chat error:', e);
        return { success: false, error: 'Failed to destroy chat.' };
    }
}

// 【新增的 Server Action】
// 专门用于在创建聊天后，为参与者B生成一个阅后即焚的凭证链接
export async function generateBurnLinkForChat(
    adminPassword: string,
    messageForBurnLink: string,
    linkForParticipantB: string
): Promise<{ url?: string; error?: string }> {
    try {
        // 在服务端安全地获取 IP
        const ip = headers().get('x-forwarded-for') ?? '127.0.0.1';

        // 调用我们已经创建的共享逻辑函数
        const result = await generateLinkLogic({
            adminPassword,
            // 核心机密是 B 的链接，作为自定义密码传递
            customPassword: linkForParticipantB,
            // 附加的提示信息
            message: messageForBurnLink,
            // 强制阅后即焚
            burnAfterRead: true,
            // 此场景下不启用 2FA
            enable2FA: false,
            email: null,
            expiry: null, // 使用默认过期时间
            ip: ip,
        });

        if (result.error) {
            return { error: result.error };
        }

        // generateLinkLogic 返回的 data 包含 url
        return { url: result.data?.url };

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        console.error('Failed to generate burn link for chat:', errorMessage);
        return { error: `服务器内部错误: ${errorMessage}` };
    }
}