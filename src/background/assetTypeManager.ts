import type { AssetTypes } from '@/types/index';

/**
 * 读取 storage.local 中保存的 asset_type，若未设置则默认返回 'crypto'
 * 作为唯一的 asset_type 读取入口，供 index.ts 和 storageHandler.ts 使用
 */
export async function getAssetType(): Promise<AssetTypes> {
  const { asset_type } = await chrome.storage.local.get('asset_type');
  return asset_type === 'stocks' ? 'stocks' : 'crypto';
}
