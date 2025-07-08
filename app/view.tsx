// app/view.tsx
import { cache } from 'react';
import { redis } from '@/lib/redis';
import { decrypt } from '@/lib/crypto';
import type { StoredData } from '@/lib/types';
import ViewClientComponent from './ViewClientComponent';
//import { ratelimit, writeLog, ENABLE_RATE_LIMIT } from '@/lib/rateLimit'; 
import { writeLog } from '@/lib/rateLimit'; 
import { headers } from 'next/headers';

// 数据获取逻辑，现在接收一个明确的 id，而不是整个 searchParams 对象
const getPageData = cache(async (id: string | undefined, ip: string) => {
    if (!id) return { error: '无效请求。\n Invalid Request' };

    try {
        if (id.length === 6) {
            // 二次验证链接，原有逻辑不动
            const originalId: string | null = await redis.get(id);
            if (!originalId) return { error: '二次验证链接无效或已过期。\n Invalid or Expired 2FA Link' };
            await redis.del(id);
            const data: StoredData | null = await redis.get(originalId);
            if (!data) return { error: '原始链接已失效。\n Original link has expired.' };
            await writeLog(`view:success:2fa`, originalId, { ip });
            const password = decrypt(data.passwordCipher);
            const message = data.messageCipher ? decrypt(data.messageCipher) : undefined;
            // 中间步骤，所以isFinal为false
            return { props: { initialPassword: password, message, isFinal: false, id: originalId } };
        }
        if (id.length === 5) {
            const data: StoredData | null = await redis.get(id);
            if (!data) return { error: '链接无效或已过期。\n Invalid or Expired Link' };
            const message = data.messageCipher ? decrypt(data.messageCipher) : undefined;
            
            // 情况一：需要二次验证
            if (data.requires2FA) {
                return { props: { id, requires2FA: true, email: data.email, message } };
            }

            // 情况二：不需要二次验证 (普通链接或阅后即焚链接)

            const password = decrypt(data.passwordCipher);
            await writeLog(`view:success:direct`, id, { ip });
            // 如果是阅后即焚链接
            if (data.burnAfterRead) {
                // 异步删除，确保响应能正常发送给用户
                // 使用 redis.del(id) 而不是 setTimeout，因为 await redis.get 之后已经是异步上下文
                await redis.del(id); 
                return { 
                    props: { 
                        initialPassword: password, 
                        message, 
                        id, 
                        // isFinal 和 burnAfterRead 都为 true，告诉客户端这是最终展示且已销毁
                        isFinal: true, 
                        burnAfterRead: true 
                    } 
                };
            }

            // 如果是普通链接 (非2FA，非阅后即焚)
            return { 
                props: { 
                    initialPassword: password, 
                    message, 
                    id, 
                    isFinal: false // isFinal 为 false，会显示“复制并销毁”按钮
                } 
            };
        }
    } catch (e) {
        console.error("Data processing error:", e);
        return { error: '数据处理失败，可能是密钥不匹配或数据已损坏。\n Data processing failed, possibly due to key mismatch or data corruption.' };
    }
    return { error: '无效的ID格式。\n Invalid ID format.' };
});

// 这是新的视图组件，它接收 'v' 作为 prop
export default async function View({ v }: { v?: string | string[] }) {
    // 获取用户IP（优先 X-Forwarded-For，回退到 remote address）
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || '';
    if (!ip) {
        return <div className="text-center p-8 text-red-500 text-xl">无法识别访问者IP，拒绝访问。 Unable to identify visitor IP, access denied.</div>;
    }

    // 【修改点】第1层：IP守卫
    // 这个 rate limit 检查所有访问尝试，无论链接是否有效
    // 它的 key 只跟 ip 相关，用于防止 IP 爆破
    // if (ENABLE_RATE_LIMIT){
    //     const { success } = await ratelimit.limit(`view_attempt:${ip}`);
    //     if (!success) {
    //         // 此处不记录详细日志，因为目的就是用最低开销拒绝请求
    //         return <div className="text-center p-8 text-red-500 text-xl">访问过于频繁，请稍后再试。</div>;
    //     }
    // }


    // 从 prop 'v' 中安全地提取 id
    const id = Array.isArray(v) ? v[0] : v;

    // 调用数据获取逻辑
    const { error, props } = await getPageData(id, ip);

    if (error) {
        return <div className="text-center p-8 text-red-500 text-xl">{error}</div>;
    }

    return <ViewClientComponent {...props} />;
}