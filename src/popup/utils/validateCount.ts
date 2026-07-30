import type { TokenItem } from '@/types/index';
import { verifyToken } from '@/utils/decryption';
const MAX_COUNT = 5;

// 校验最大关注币种数量15个
export async function validateCount(cyrptoList: TokenItem[]) {
  const { token_string } = await chrome.storage.local.get('token_string');
  const tokenString = token_string as string;

  if (tokenString) {
    const isVerified = await verifyToken(tokenString);
    if (isVerified) return true; // 有token且验证成功 → 无限制
  }

  // 没有token或验证失败 → 检查数量限制
  return cyrptoList.length < MAX_COUNT;
}
