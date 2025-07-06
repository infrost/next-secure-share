// lib/crypto.ts
import CryptoJS from 'crypto-js';

const secretKey = process.env.ENCRYPTION_SEED;

if (!secretKey || secretKey.length !== 32) {
  throw new Error('ENCRYPTION_SEED is not defined or is not 32 characters long in .env.local');
}

// 加密函数
export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, secretKey!).toString();
}

// 解密函数
export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey!);
  return bytes.toString(CryptoJS.enc.Utf8);
}