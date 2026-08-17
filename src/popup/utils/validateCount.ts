import type { AssetItem } from '@/types/asset';
import { verifyToken } from '@/utils/decryption';
import { getTokenString } from '@/utils/local';

const MAX_COUNT = 10; // 最大数量限制

export async function validateCount(cyrptoList: AssetItem[]) {
  const tokenString = await getTokenString();

  if (tokenString) {
    const isVerified = await verifyToken(tokenString);
    if (isVerified) return true; // 有token且验证成功 → 无限制
  }

  // 没有token或验证失败 → 检查数量限制
  return cyrptoList.length < MAX_COUNT;
}
