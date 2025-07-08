// app/chat/[id]/ChatClient.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { getChatHistory, postMessage, destroyChat } from '../actions';
import { encryptMessage, decryptMessage } from '@/lib/chat-crypto';
import type { EncryptedMessage } from '@/lib/types';

interface ChatClientProps {
  chatId: string;
  myIdentity: 'A' | 'B';
  requiredAccessPassword?: string;
}

export default function ChatClient({ chatId, myIdentity, requiredAccessPassword }: ChatClientProps) {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!requiredAccessPassword);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 从 URL hash 获取加密密钥
  useEffect(() => {
    const key = window.location.hash.substring(1);
    if (key) {
      setAccessKey(key);
    } else {
      setError('未在URL中找到加密密钥。聊天无法访问。Encryption key not found in URL. The chat is inaccessible.');
    }
  }, []);

  // 2. 解密消息
  useEffect(() => {
    if (!accessKey || messages.length === 0) return;

    const decryptAll = async () => {
      const newDecryptedContent: Record<string, string> = {};
      for (const msg of messages) {
        // 如果已经解密过，则跳过
        if (decryptedContent[msg.timestamp]) continue;
        try {
          const plainText = await decryptMessage(accessKey, msg.content);
          newDecryptedContent[msg.timestamp] = plainText;
        } catch {
          newDecryptedContent[msg.timestamp] = '无法解密消息。Failed to decrypt message.';
        }
      }
      setDecryptedContent(prev => ({ ...prev, ...newDecryptedContent }));
    };

    decryptAll();
  }, [messages, accessKey, decryptedContent]);

  // 3. 获取历史消息 (轮询)
  /* 服务器压力有点大，暂时注释掉
  useEffect(() => {
    if (!isAuthenticated || !accessKey) return;
    
    const fetchHistory = async () => {
      const result = await getChatHistory(chatId);
      if (result.messages) {
        setMessages(result.messages);
      } else if (result.error) {
        setError(result.error);
        // 如果聊天不存在，停止轮询
        if (result.error.includes('not found')) {
            clearInterval(intervalId);
        }
      }
    };

    fetchHistory(); // 立即获取一次
    const intervalId = setInterval(fetchHistory, 5000); // 每5秒轮询一次

    return () => clearInterval(intervalId);
  }, [isAuthenticated, accessKey, chatId]);
  */

  // 创建一个可重用的 fetchHistory 函数
    const fetchHistory = async () => {
        if (!isAuthenticated || !accessKey) return;
        setIsFetching(true); // <--- 设置为 true
        setError('');
        
        try {
        const result = await getChatHistory(chatId);
        if (result.messages) {
            setMessages(result.messages);
        } else if (result.error) {
            setError(result.error);
        }
        } catch (e) {
        console.error('Fetch history error:', e);
        setError('An unexpected error occurred while fetching history.');
        } finally {
        setIsFetching(false); // <--- 无论成功或失败，都设置为 false
        }
    };

    // 在页面加载时获取一次历史记录
    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, accessKey, chatId]);

    // 4. 滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, decryptedContent]);

  const handleAuth = () => {
    if (passwordInput === requiredAccessPassword) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('密码错误');
    }
  };

    // 【修改点 3】: 更新 handleSendMessage 函数
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !accessKey || isSending) return;

        setIsSending(true); // <--- 设置为 true
        setError('');

        try {
        const encryptedContent = await encryptMessage(accessKey, newMessage);
        const message: EncryptedMessage = {
            sender: myIdentity,
            timestamp: Date.now(),
            content: encryptedContent,
        };
        
        const result = await postMessage(chatId, message);
        if (result.success) {
            setNewMessage('');
            // 乐观更新：立即将新消息添加到 state，无需等待下一次 fetch
            setMessages(prev => [...prev, message]); 
        } else {
            setError(result.error || '消息发送失败');
        }
        } catch (e) {
        console.error('Send message error:', e);
        setError('Encryption failed.');
        } finally {
        setIsSending(false); // <--- 无论成功或失败，都设置为 false
        }
    };


    // 【修改点 4】: 更新 handleDestroyChat 函数
    const handleDestroyChat = async () => {
        if (confirm('Are you sure you want to permanently destroy this entire chat? This cannot be undone.')) {
        setIsDestroying(true); // <--- 设置为 true
        setError('');
        try {
            const result = await destroyChat(chatId);
            if (!result.success) {
            setError(result.error || '销毁失败，请重试');
            } else {
            setIsDestroyed(true);
            } // <--- 设置为 true，表示聊天已被销毁
        } catch (e) {
            console.error('Destroy chat error:', e);
            setError('An unexpected error occurred while destroying chat.');
            setIsDestroying(false); // 只有在销毁失败时才设置回 false
        }
        }
    }

    // 辅助函数：格式化时间戳
    const formatTimestamp = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };



  if (!accessKey) {
    return <div className="text-center p-8 text-red-500 text-xl">{error}</div>;
  }
  
  if (isDestroyed) {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl h-[80vh] bg-white rounded-lg shadow-xl text-center p-8">
        <h1 className="text-2xl font-bold text-green-600">聊天已销毁</h1>
        <p className="mt-2 text-gray-700">此聊天会话已被永久删除。</p>
      </div>
    );
  }


  if (error.includes('not found')) {
      return <div className="text-center p-8 text-xl font-bold text-red-600">This chat has been destroyed or has expired.</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-sm p-8 space-y-4 bg-white rounded-lg shadow-xl">
        <h2 className="text-xl font-bold text-center">Access Required</h2>
        <p className="text-center text-gray-500">This chat is protected by an access password.</p>
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          placeholder="Enter access password"
          className="w-full p-2 border rounded"
        />
        <button onClick={handleAuth} className="w-full px-4 py-2 font-bold text-white bg-indigo-600 rounded-md">
          Unlock
        </button>
        {authError && <p className="text-red-500 text-center">{authError}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-2xl h-[80vh] bg-white rounded-lg shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
            <h1 className="text-xl font-bold">安全聊天</h1>
            <div className="flex items-center space-x-2">
            {/* 新增的刷新按钮 */}
            <button onClick={fetchHistory} disabled={isFetching} className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-green-300">
                {isFetching ? '刷新中...' : '刷新'}
            </button>
            <button onClick={handleDestroyChat} disabled={isDestroying} className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-red-300">
                {isDestroying ? '销毁中...' : '销毁聊天'}
            </button>
            </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((msg) => (
                <div key={msg.timestamp} className={`flex ${msg.sender === myIdentity ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${msg.sender === myIdentity ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                        {decryptedContent[msg.timestamp] || 'Decrypting...'}
                    </div>
                    {/* 【修改点】: 添加时间戳显示 */}
                    <div className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(msg.timestamp)}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t">
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 p-2 border rounded"
                    disabled={isSending}
                />
                <button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()} className="px-4 py-2 font-bold text-white bg-indigo-600 rounded-md disabled:bg-indigo-300">
                    {isSending ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    </div>
  );
}