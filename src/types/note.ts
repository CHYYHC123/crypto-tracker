import type { AssetTypes } from '@/types/asset';

/** IndexedDB 中单条资产笔记 */
export interface AssetNote {
  key: string; // "crypto:LINK"
  category: AssetTypes;
  symbol: string; // "LINK"
  content: string;
  updatedAt: number;
}

/** 笔记主键：区分 crypto / stocks 同名 ticker，不区分交易所 */
export function buildNoteKey(category: AssetTypes, symbol: string): string {
  return `${category}:${symbol.toUpperCase()}`;
}
