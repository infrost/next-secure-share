// app/ViewClientComponent.tsx
'use client';

import { useState } from 'react';

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
  // 它只应在用户明确执行销毁操作后才变为 true。
  // 对于阅后即焚链接，它永远不会变为 true，因为没有销毁按钮。
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleCopyAndDestroy = async () => {
    if (!password || !id) return;
    try {
      await navigator.clipboard.writeText(password);
      setFeedback('已复制到剪贴板！正在销毁链接...');
      
      await fetch('/api/destroy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      setIsDestroyed(true);
      setFeedback('链接已销毁！');
    } catch {
      setFeedback('复制或销毁失败。请手动复制。');
    }
  };

  const handleSendVerificationEmail = async () => {
    setIsLoading(true);
    setFeedback('');
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '发送失败');
      setFeedback(`验证邮件已发送到您的邮箱，请查收。（如未收到请检查垃圾邮件）`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback(`邮件发送失败: ${err.message}`);
      } else {
        setFeedback('邮件发送失败: 未知错误');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isDestroyed) {
    return <div className="text-center p-8 text-xl font-bold text-green-600">链接已成功销毁！</div>;
  }
  
  return (
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-xl text-center">
        <h1 className="text-3xl font-bold">安全信息</h1>
        {message && <p className="text-gray-600 italic">&quot;{message}&quot;</p>}
        <div className="p-6 bg-gray-100 rounded-md">
          {requires2FA && !password ? (
            <div className="space-y-4">
              <p>此信息需要通过邮件进行二次验证。</p>
              <button onClick={handleSendVerificationEmail} disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md disabled:bg-indigo-300">
                {isLoading ? '发送中...' : '发送验证邮件'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg font-semibold">密码:</p>
              <pre className="px-4 py-3 text-2xl font-mono text-purple-700 bg-purple-100 rounded-md break-all">{password}</pre>
              {!isFinal && (
                <button onClick={handleCopyAndDestroy} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700">
                  复制并销毁
                </button>
              )}
              {burnAfterRead && (
                <p className="text-sm text-gray-500">此链接被设置为阅后即焚，已被销毁。</p>
              )}
            </div>
          )}
        </div>
        {feedback && <p className="mt-4 text-sm text-gray-700">{feedback}</p>}
      </div>
  );
}