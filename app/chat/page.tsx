// app/chat/page.tsx
import CreateChatClient from './CreateChatClient';

export default function CreateChatPage() {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
      <h1 className="text-2xl font-bold text-center">创建一个新的安全聊天</h1>
      <p className="text-center text-gray-600">
        创建一个端到端加密的聊天室<br />链接将使用唯一的加密密钥生成
      </p>
      <CreateChatClient />
    </div>
  );
}