// lib/types.ts
export interface StoredData {
  passwordCipher: string; // 加密后的密码
  messageCipher?: string; // 加密后的附加消息
  requires2FA: boolean;
  email?: string;
  burnAfterRead?: boolean;
}

// 新增 Chat 相关类型
export interface EncryptedMessage {
  sender: 'A' | 'B';
  timestamp: number;
  content: string; // 这是加密后的消息内容
}

export interface ChatData {
  // 用于实现访问密码功能。这是用服务端密钥加密后的访问密码。
  accessPasswordCipher?: string; 
  messages: EncryptedMessage[];
  inactiveHours: number;
}