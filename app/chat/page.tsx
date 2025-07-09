// app/chat/page.tsx
import CreateChatClient from './CreateChatClient';
import Link from 'next/link';

export default function CreateChatPage() {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
      <div className="flex items-center justify-between">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">创建一个安全聊天</h1>
        </div>
        {/* 右侧：Chat 按钮 */}
        <Link 
          href="/send" 
          className="px-4 py-2 font-semibold text-cyan-600 border-2 border-cyan-500 rounded-lg hover:bg-cyan-50 transition-colors"
        >
          密码发送
        </Link>
      </div>
      <p className="text-center text-gray-600">
        创建一个端到端加密的聊天室<br />链接将使用唯一的加密密钥生成
      </p>
      <CreateChatClient />
    </div>
  );
}