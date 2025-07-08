// app/chat/CreateChatClient.tsx
'use client';

import { useState, useTransition } from 'react';
import { createChat } from './actions';
import { generateKey } from '@/lib/chat-crypto';

export default function CreateChatClient() {
  const [adminPassword, setAdminPassword] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [useAccessPassword, setUseAccessPassword] = useState(false);
  const [inactiveHours, setInactiveHours] = useState(72);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [links, setLinks] = useState<{ a: string; b: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLinks(null);

    startTransition(async () => {
      // 1. 在客户端生成唯一的加密密钥
      const chatKey = await generateKey();

      // 2. 调用 Server Action 创建聊天室
      const result = await createChat(
        adminPassword,
        useAccessPassword ? accessPassword : undefined,
        inactiveHours
      );

      if (result.success && result.links) {
        // 3. 将密钥附加到 URL 的 hash 部分
        setLinks({
          a: `${result.links.a}#${chatKey}`,
          b: `${result.links.b}#${chatKey}`,
        });
      } else {
        setError(result.error || '创建聊天失败，请稍后再试。');
      }
    });
  };

  if (links) {
    return (
      <div className="space-y-4">
        <h2 className="font-bold text-green-600">聊天已创建！</h2>
        <p>分享这些链接。它们包含加密密钥，如果删除 &apos;#&apos; 后面的部分将无法使用。</p>
        <p className='text-red-500'>一旦丢失此链接，将无法恢复聊天内容</p>
        <div className="space-y-2">
          <label className="block font-semibold">你的链接 (参与者 A):</label>
          <input type="text" readOnly value={links.a} className="w-full p-2 border rounded" onClick={e => e.currentTarget.select()} />
        </div>
        <div className="space-y-2">
          <label className="block font-semibold">你的朋友的链接 (参与者 B):</label>
          <input type="text" readOnly value={links.b} className="w-full p-2 border rounded" onClick={e => e.currentTarget.select()} />
        </div>
        <button onClick={() => setLinks(null)} className="w-full px-4 py-2 mt-4 font-bold text-white bg-indigo-600 rounded-md">
            创建另一个聊天
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">管理员密码</label>
        <input
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={useAccessPassword}
            onChange={(e) => setUseAccessPassword(e.target.checked)}
            className="mr-2"
          />
          需要独立访问密码
        </label>
      </div>
      {useAccessPassword && (
        <div>
          <label className="block font-semibold">聊天访问密码</label>
          <input
            type="password"
            value={accessPassword}
            onChange={(e) => setAccessPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required={useAccessPassword}
          />
        </div>
      )}
        <div>
            <label htmlFor="inactiveHours" className="block font-semibold">
            失效时间 (小时)
            </label>
            <input
            type="number"
            id="inactiveHours"
            value={inactiveHours}
            onChange={(e) => setInactiveHours(parseInt(e.target.value, 10) || 0)}
            className="w-full p-2 border rounded"
            min="1"
            required
            />
            <p className="text-xs text-gray-500 mt-1">
            如果在此期间没有发送新消息，聊天将被销毁。
            </p>
        </div>
      <button type="submit" disabled={isPending} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md disabled:bg-indigo-300">
        {isPending ? '创建中...' : '创建聊天'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}