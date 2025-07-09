'use client';

import { useState, useTransition } from 'react';
import { createChat, generateBurnLinkForChat } from './actions';
import { generateKey } from '@/lib/chat-crypto';

// 定义结果状态的接口，使其更灵活
interface ResultState {
  linkA: string;
  linkB?: string;
  burnLink?: string;
}

export default function CreateChatClient() {
  const [adminPassword, setAdminPassword] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [useAccessPassword, setUseAccessPassword] = useState(false);
  const [inactiveHours, setInactiveHours] = useState(72);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  // --- 新增和修改的状态 ---
  const [result, setResult] = useState<ResultState | null>(null);
  const [copiedLink, setCopiedLink] = useState<'a' | 'b' | 'burn' | null>(null);
  // 新增：独立的阅后即焚选项
  const [useBurnLinkToSend, setUseBurnLinkToSend] = useState(false);

  // 辅助函数：复制到剪贴板
  const handleCopyToClipboard = (text: string, linkType: 'a' | 'b' | 'burn') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    startTransition(async () => {
      // 1. 在客户端生成唯一的加密密钥
      const chatKey = await generateKey();

      // 2. 调用 Server Action 创建聊天室
      const createResult = await createChat(
        adminPassword,
        useAccessPassword ? accessPassword : undefined,
        inactiveHours
      );

      if (!createResult.success || !createResult.links) {
        setError(createResult.error || '创建聊天失败，请稍后再试。');
        return;
      }

      const finalLinkA = `${createResult.links.a}#${chatKey}`;
      const finalLinkB = `${createResult.links.b}#${chatKey}`;

      // 3. 【核心修改】根据是否勾选“阅后即焚”来决定下一步操作
      if (useBurnLinkToSend) {
        // --- 如果使用阅后即焚链接 ---
        let messageForBurnLink = '';
        
        // 根据是否有访问密码，准备不同的附加消息
        if (useAccessPassword && accessPassword) {
          messageForBurnLink = `聊天室密码为：${accessPassword}，以下是端到端加密聊天链接。请妥善保存，链接丢失将无法恢复。`;
        } else {
          messageForBurnLink = '以下是端到端加密的聊天链接。请妥善保存，链接丢失将无法恢复。';
        }

        // 【修改点】用 Server Action 替换 fetch
        const burnLinkResult = await generateBurnLinkForChat(
            adminPassword,
            messageForBurnLink,
            finalLinkB // 将 B 的链接作为核心机密传递
        );
        
        if (burnLinkResult.error || !burnLinkResult.url) {
            setError(`创建聊天成功，但生成阅后即焚链接失败: ${burnLinkResult.error || 'Unknown error'}`);
            // 作为回退，仍然显示参与者A的链接
            setResult({ linkA: finalLinkA });
        } else {
            setResult({
                linkA: finalLinkA,
                burnLink: burnLinkResult.url,
            });
        }

      } else {
        // --- 传统方式：直接显示两个链接 ---
        setResult({
          linkA: finalLinkA,
          linkB: finalLinkB,
        });
      }
    });
  };

  if (result) {
    return (
      <div className="space-y-6">
        <h2 className="font-bold text-green-600 text-xl">聊天已创建！</h2>
        <p className="text-red-500">警告：这些是唯一凭证，一旦丢失链接将无法恢复聊天内容。</p>
        
        <div className="space-y-2">
          <label className="block font-semibold">你的链接 (参与者 A):</label>
          <div className="flex space-x-2">
            <input type="text" readOnly value={result.linkA} className="w-full p-2 border rounded bg-gray-50" onClick={e => e.currentTarget.select()} />
            <button onClick={() => handleCopyToClipboard(result.linkA, 'a')} className="px-4 py-2 font-bold text-white bg-blue-600 rounded-md w-32">
              {copiedLink === 'a' ? '已复制!' : '复制'}
            </button>
          </div>
        </div>

        {result.linkB && (
          <div className="space-y-2">
            <label className="block font-semibold">你朋友的链接 (参与者 B):</label>
            <div className="flex space-x-2">
                <input type="text" readOnly value={result.linkB} className="w-full p-2 border rounded bg-gray-50" onClick={e => e.currentTarget.select()} />
                <button onClick={() => handleCopyToClipboard(result.linkB!, 'b')} className="px-4 py-2 font-bold text-white bg-blue-600 rounded-md w-32">
                {copiedLink === 'b' ? '已复制!' : '复制'}
                </button>
            </div>
          </div>
        )}

        {result.burnLink && (
            <div className="space-y-2 p-4 border-l-4 border-yellow-400 bg-yellow-50">
                <label className="block font-semibold text-yellow-800">给朋友的一次性链接:</label>
                <p className='text-sm text-yellow-700'>请将下面这个**一次性**链接发给参与者B。此链接包含他们的聊天凭证，访问一次后即销毁。</p>
                 <div className="flex space-x-2">
                    <input type="text" readOnly value={result.burnLink} className="w-full p-2 border rounded bg-gray-50" onClick={e => e.currentTarget.select()} />
                    <button onClick={() => handleCopyToClipboard(result.burnLink!, 'burn')} className="px-4 py-2 font-bold text-white bg-yellow-500 rounded-md w-32 hover:bg-yellow-600">
                    {copiedLink === 'burn' ? '已复制!' : '复制'}
                    </button>
                </div>
            </div>
        )}

        <button onClick={() => setResult(null)} className="w-full px-4 py-2 mt-4 font-bold text-white bg-indigo-600 rounded-md">
            创建另一个聊天
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-semibold">管理员密码</label>
        <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full p-2 border rounded" required />
      </div>

      <div>
        <label className="flex items-center">
          <input type="checkbox" checked={useAccessPassword} onChange={(e) => setUseAccessPassword(e.target.checked)} className="mr-2" />
          需要独立访问密码
        </label>
      </div>

      {useAccessPassword && (
        <div className='pl-6'>
          <label className="block font-semibold">聊天访问密码</label>
          <input type="password" value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} className="w-full p-2 border rounded" required={useAccessPassword} />
        </div>
      )}

      {/* --- 新增的独立 Checkbox --- */}
      <div className="pt-2">
        <label className="flex items-center">
          <input type="checkbox" checked={useBurnLinkToSend} onChange={(e) => setUseBurnLinkToSend(e.target.checked)} className="mr-2" />
          使用“阅后即焚”链接发送聊天链接
        </label>
        <p className="text-xs text-gray-500 mt-1 pl-6">
          将为参与者B生成一个一次性链接来传递其聊天凭证，而不是直接显示。
        </p>
      </div>

      <div>
        <label htmlFor="inactiveHours" className="block font-semibold">失效时间 (小时)</label>
        <input type="number" id="inactiveHours" value={inactiveHours} onChange={(e) => setInactiveHours(parseInt(e.target.value, 10) || 0)} className="w-full p-2 border rounded" min="1" required />
        <p className="text-xs text-gray-500 mt-1">如果在此期间没有发送新消息，聊天将被销毁。</p>
      </div>

      <button type="submit" disabled={isPending} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md disabled:bg-indigo-300">
        {isPending ? '创建中...' : '创建聊天'}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}