// lib/types.ts
export interface StoredData {
  passwordCipher: string; // 加密后的密码
  messageCipher?: string; // 加密后的附加消息
  requires2FA: boolean;
  email?: string;
}