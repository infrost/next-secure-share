// app/view.tsx
import { cache } from 'react';
import { redis } from '@/lib/redis';
import { decrypt } from '@/lib/crypto';
import type { StoredData } from '@/lib/types';
import ViewClientComponent from './ViewClientComponent';
import { checkRateLimit } from '@/lib/rateLimit';
import { headers } from 'next/headers';

// 数据获取逻辑，现在接收一个明确的 id，而不是整个 searchParams 对象
const getPageData = cache(async (id: string | undefined) => {
    if (!id) return { error: '无效请求。' };

    try {
        if (id.length === 6) {
            const originalId: string | null = await redis.get(id);
            if (!originalId) return { error: '二次验证链接无效或已过期。' };
            await redis.del(id);
            const data: StoredData | null = await redis.get(originalId);
            if (!data) return { error: '原始链接已失效。' };
            const password = decrypt(data.passwordCipher);
            const message = data.messageCipher ? decrypt(data.messageCipher) : undefined;
            return { props: { initialPassword: password, message, isFinal: false, id: originalId } };
        }
        if (id.length === 5) {
            const data: StoredData | null = await redis.get(id);
            if (!data) return { error: '链接无效或已过期。' };
            const message = data.messageCipher ? decrypt(data.messageCipher) : undefined;
            if (!data.requires2FA) {
                const password = decrypt(data.passwordCipher);
                return { props: { initialPassword: password, message, id, isFinal: false } };
            } else {
                return { props: { id, requires2FA: true, email: data.email, message } };
            }
        }
    } catch (e) {
        console.error("Data processing error:", e);
        return { error: '数据处理失败，可能是密钥不匹配或数据已损坏。' };
    }
    return { error: '无效的ID格式。' };
});

// 这是新的视图组件，它接收 'v' 作为 prop
export default async function View({ v }: { v?: string | string[] }) {
    // 获取用户IP（优先 X-Forwarded-For，回退到 remote address）
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || '';
    if (!ip) {
        return <div className="text-center p-8 text-red-500 text-xl">无法识别访问者IP，拒绝访问。</div>;
    }
    // rate limit 检查
    const rate = await checkRateLimit(`view:${ip}`);
    if (!rate.success) {
        return <div className="text-center p-8 text-red-500 text-xl">访问过于频繁，请稍后再试。</div>;
    }

    // 从 prop 'v' 中安全地提取 id
    const id = Array.isArray(v) ? v[0] : v;

    // 调用数据获取逻辑
    const { error, props } = await getPageData(id);

    if (error) {
        return <div className="text-center p-8 text-red-500 text-xl">{error}</div>;
    }

    return <ViewClientComponent {...props} />;
}