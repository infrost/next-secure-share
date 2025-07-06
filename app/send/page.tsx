// app/send/page.tsx
'use client';

import { useState, FormEvent } from 'react';

export default function SendPage() {
  const [enable2FA, setEnable2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [error, setError] = useState('');
    
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setGeneratedUrl('');
    setGeneratedPassword('');

    const formData = new FormData(event.currentTarget);
    const data = {
      adminPassword: formData.get('adminPassword'),
      enable2FA: enable2FA,
      email: formData.get('email'),
      expiry: formData.get('expiry'),
      message: formData.get('message'),
      customPassword: formData.get('customPassword'),
    };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to generate link.');
      setGeneratedUrl(result.url);
      if (result.password) { // 检查响应中是否有密码
        setGeneratedPassword(result.password);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('发生未知错误');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center">生成安全密码</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">管理员密码</label>
              <input name="adminPassword" type="password" required className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="flex items-center">
                <input type="checkbox" checked={enable2FA} onChange={() => setEnable2FA(!enable2FA)} className="mr-2" />
                启用二次验证 (2FA)
              </label>
            </div>
            {enable2FA && (
              <div>
                <label className="block text-sm font-medium">邮箱地址</label>
                <input name="email" type="email" required={enable2FA} className="w-full px-3 py-2 border rounded-md" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium">失效时间 (小时, 默认72)</label>
              <input name="expiry" type="number" placeholder="72" className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium">附加消息 (可缺省)</label>
              <input name="message" type="text" className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium">自定义密码 (可缺省)</label>
              <input name="customPassword" type="text" className="w-full px-3 py-2 border rounded-md" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md disabled:bg-blue-300">
              {isLoading ? '生成中...' : '生成密码链接'}
            </button>
          </form>
          {/* 新增的显示区域 */}
          {(generatedUrl || error) && (
            <div className="mt-6 p-4 border rounded-md">
              {generatedPassword && (
                <div className="mb-4">
                  <p className="text-sm font-medium">系统生成密码:</p>
                  <pre className="p-2 mt-1 text-center font-mono bg-gray-100 rounded">{generatedPassword}</pre>
                </div>
              )}
              {generatedUrl && (
                <div>
                  <p className="text-sm font-medium mb-2">生成成功! 链接:</p>
                  <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className="p-2 mt-1 block text-center text-blue-600 break-all bg-green-100 rounded-md">{generatedUrl}</a>
                </div>
              )}
              {error && (
                <div className="text-red-600">
                  <p>错误: {error}</p>
                </div>
              )}
            </div>
          )}
        </div>
  );
}