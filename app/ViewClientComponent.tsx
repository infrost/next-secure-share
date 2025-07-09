// app/ViewClientComponent.tsx
'use client';

import { useState, useTransition } from 'react';
// 导入新的 Server Actions
import { destroyLinkAction, sendVerificationEmailAction } from './actions';

interface Props {
  id?: string;
  initialPassword?: string;
  message?: string;
  requires2FA?: boolean;
  isFinal?: boolean;
  burnAfterRead?: boolean;
}

export default function ViewClientComponent({ id, initialPassword, message, requires2FA, isFinal, burnAfterRead }: Props) {
  const [password] = useState(initialPassword);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  // 使用 useTransition 来管理加载状态
  const [isPending, startTransition] = useTransition();

  // 【新增】一个只处理复制逻辑的函数
  const handleCopyOnly = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setFeedback('密码已复制到剪贴板！');
    } catch {
      setFeedback('自动复制失败，请手动复制。');
    }
  };
  const handleCopyAndDestroy = async () => {
    if (!password || !id) return;
    try {
      await navigator.clipboard.writeText(password);
      setFeedback('已复制到剪贴板！正在销毁链接...');
      
      startTransition(async () => {
        const result = await destroyLinkAction(id);
        if (result.success) {
          setIsDestroyed(true);
        }
        setFeedback(result.message);
      });

    } catch {
      setFeedback('复制到剪贴板失败。');
    }
  };

  const handleSendVerificationEmail = async () => {
    if (!id) return;
    startTransition(async () => {
        setFeedback('发送中...');
        const result = await sendVerificationEmailAction(id);
        setFeedback(result.message);
    });
  };

  if (isDestroyed) {
    return <div className="text-center p-8 text-xl font-bold text-green-600">链接已成功销毁！</div>;
  }
  
  return (
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-xl text-center">
        <h1 className="text-3xl font-bold">安全信息</h1>
        {message && <p className="text-gray-600 italic">{message}</p>}
        <div className="p-6 bg-gray-100 rounded-md">
          {requires2FA && !password ? (
            <div className="space-y-4">
              <p>此信息需要通过邮件进行二次验证。</p>
              <button onClick={handleSendVerificationEmail} disabled={isPending} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md disabled:bg-indigo-300">
                {isPending ? '处理中...' : '发送验证邮件'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg font-semibold">密码:</p>
              <pre className="px-4 py-3 text-2xl font-mono text-purple-700 bg-purple-100 rounded-md break-all">{password}</pre>
              {!isFinal && (
                <>
                  <button onClick={handleCopyOnly} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    复制密码
                  </button>
                  <button onClick={handleCopyAndDestroy} disabled={isPending} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
                    {isPending ? '销毁中...' : '复制并销毁'}
                  </button>
                </>
              )}
              {burnAfterRead && (
                <>
                  <button onClick={handleCopyOnly} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    复制密码
                  </button>
                  <p className="text-sm text-gray-500">此链接被设置为阅后即焚，已被销毁。</p>
                </>
              )}
            </div>
          )}
        </div>
        {feedback && <p className="mt-4 text-sm text-gray-700">{feedback}</p>}
      </div>
  );
}