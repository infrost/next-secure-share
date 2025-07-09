// app/send/page.tsx
'use client';

import { useFormState } from 'react-dom';
import { generateSecureLink, GenerateActionResult } from './actions'; // 导入新的 Server Action
import { useEffect, useState } from 'react';
import Link from 'next/link';

const initialState: GenerateActionResult = {};

// 一个小的子组件来处理提交按钮的禁用状态
function SubmitButton() {
  // useFormStatus 必须在 <form> 组件内部使用
  // 但因为我们用了 useFormState，其 isPending 状态可以从 useTransition 获得，或者直接在父组件中管理
  // 这里为了简单，我们用一个外部 state
  return (
    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md disabled:bg-blue-300">
      生成密码链接
    </button>
  );
}


export default function SendPage() {
  const [enable2FA, setEnable2FA] = useState(false);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  
  // 使用 useFormState hook
  const [state, formAction] = useFormState(generateSecureLink, initialState);
  const [result, setResult] = useState<GenerateActionResult | null>(null);
  
  // 方便地重置表单
  const [formKey, setFormKey] = useState(Date.now());

  useEffect(() => {
    // 当 state 中有 url (成功) 或 error (失败) 时，更新 result
    if (state.url || state.error) {
      setResult(state);
    }
  }, [state]); // 这个 effect 会在每次表单提交后运行

  const handleReset = () => {
    setResult(null); // 将 result 置空，UI 会自动切换回表单视图
    setFormKey(Date.now()); // 同时更新 key 来确保表单内部状态被完全重置
  };


  return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          {!result?.url ? (
            <>
              <div className="flex items-center justify-between">
                {/* 左侧：标题 */}
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-800">生成安全密码</h1>
                </div>
                {/* 右侧：Chat 按钮 */}
                <Link 
                  href="/chat" 
                  className="px-4 py-2 font-semibold text-cyan-600 border-2 border-cyan-500 rounded-lg hover:bg-cyan-50 transition-colors"
                >
                  聊天室
                </Link>
              </div>
              <form key={formKey} action={formAction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">管理员密码</label>
                  <input name="adminPassword" type="password" required className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="flex items-center">
                    <input name="enable2FA" type="checkbox" checked={enable2FA} onChange={() => setEnable2FA(!enable2FA)} value={String(enable2FA)} className="mr-2" />
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
                <div>
                  <label className="flex items-center">
                    <input name="burnAfterRead" type="checkbox" checked={burnAfterRead} onChange={() => setBurnAfterRead(!burnAfterRead)} value={String(burnAfterRead)} className="mr-2" />
                    强制阅后即焚
                  </label>
                </div>
                <SubmitButton />
                {result?.error && (
                  <div className="text-red-600">
                    <p>错误: {result.error}</p>
                  </div>
                )}
              </form>
            </>
          ) : (

             <div className="mt-6 p-4 border rounded-md text-center">
                <h2 className="text-xl font-bold text-green-600 mb-4">生成成功!</h2>
                {result.password && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">系统生成密码:</p>
                    <pre className="p-2 mt-1 font-mono bg-gray-100 rounded break-all">{result.password}</pre>
                  </div>
                )}
                {result.url && (
                  <>
                    <p className="text-sm font-medium mb-2">您的安全链接:</p>
                    <div>
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="p-2 mt-1 block text-blue-600 break-all bg-green-100 rounded-md">{result.url}</a>
                    </div>
                  </>

                )}
                 <button onClick={handleReset} className="mt-6 w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md">
                    创建另一个
                </button>
            </div>
          )}
        </div>
  );
}