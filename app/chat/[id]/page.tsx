// app/chat/[id]/page.tsx
import { decrypt } from '@/lib/crypto'; // 服务端解密
import { getChatAccessData } from '../actions';
import ChatClient from './ChatClient';

interface ChatPageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const chatId = params.id;
  const participant = searchParams.p === 'A' || searchParams.p === 'B' ? searchParams.p : undefined;

  if (!participant) {
    return <div className="text-center p-8 text-red-500">Invalid participant ID. The URL must contain `?p=A` or `?p=B`.</div>;
  }

  // 获取加密的访问密码
  const { accessPasswordCipher, error } = await getChatAccessData(chatId);
  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }
  
  // 在服务端解密访问密码
  const accessPassword = accessPasswordCipher ? decrypt(accessPasswordCipher) : undefined;
  
  return (
    <ChatClient
      chatId={chatId}
      myIdentity={participant}
      requiredAccessPassword={accessPassword}
    />
  );
}