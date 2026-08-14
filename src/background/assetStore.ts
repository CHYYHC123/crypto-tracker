import { throttle } from '@/utils/index';
import type { AssetItem } from '@/types/asset';

let assetList: AssetItem[] | null = null;
let assetMap: Map<string, AssetItem> | null = null;
let lastUpdateTime: number | null = null;
let isInitializing = false;

// ─── Getters
export function getAssetList(): AssetItem[] | null {
  return assetList;
}

export function getAssetLastUpdateTime(): number | null {
  return lastUpdateTime;
}

/**
 * 根据资产列表初始化 Store
 * items 可以是仅含 symbol/category 的最小结构，price 等字段默认 0
 */
export function initAssetStore(items: Pick<AssetItem, 'id' | 'symbol' | 'category'>[]): void {
  console.log('items', items);

  assetList = items.map(item => ({
    id: item.id,
    symbol: item.symbol,
    category: item.category,
    price: 0,
    change: 0,
    lastPrice: 0
  }));

  assetMap = new Map(assetList.map(a => [a.symbol.toUpperCase(), a]));
}

/**
 * 将 WS 推送的 AssetItem[] 更新到 Store
 * - Crypto：每次推送单条（changePercent 变化 >= 0.01% 才更新）
 * - Stocks：每次推送多条（price 或 marketPhase 变化才更新）
 * 返回更新后的完整列表；无任何变化时返回 null
 */
export function applyAssetUpdate(items: AssetItem[]): AssetItem[] | null {
  if (!assetList || !assetMap) return null;

  const now = Date.now();
  let hasUpdate = false;

  for (const incoming of items) {
    const existing = assetMap.get(incoming.symbol.toUpperCase());
    if (!existing) continue;

    const priceChanged = incoming.price !== existing.price;
    const changeChanged = Math.abs((incoming.change ?? 0) - (existing.change ?? 0)) >= 0.01;
    const phaseChanged = incoming.marketPhase !== undefined && incoming.marketPhase !== existing.marketPhase;

    lastUpdateTime = now;

    if (!priceChanged && !changeChanged && !phaseChanged) continue;

    existing.lastPrice = existing.price;
    existing.price = incoming.price;
    existing.change = incoming.change;

    if (incoming.marketPhase !== undefined) existing.marketPhase = incoming.marketPhase;
    if (incoming.prevClose !== undefined) existing.prevClose = incoming.prevClose;

    hasUpdate = true;
  }

  return hasUpdate ? assetList : null;
}

/**
 * 自愈初始化（WS 数据到达但 Store 未初始化时触发）
 * 仅用于 Crypto 链路的 SW 重启场景，传入异步 init 函数
 */
export function triggerSelfHeal(asyncInit: () => Promise<void>): void {
  if (isInitializing) return;
  isInitializing = true;
  asyncInit()
    .catch(err => console.error('[AssetStore] 自愈初始化失败:', err))
    .finally(() => (isInitializing = false));
}

function _publish(list: AssetItem[]): void {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0 || chrome.runtime.lastError) return;
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_ASSET_PRICE', data: list }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[AssetStore] sendMessage 失败:', chrome.runtime.lastError.message);
        }
      });
    });
  });
}

export const throttledPublishAssets = throttle(_publish, 500);
export const publishAssets = _publish;
