import type { AssetTypes } from '@/types/index';

import { getCoins } from '@/background/tokens/coinsManager';
import { initTokenStore } from '@/background/tokenStore';
import { connectWebSocket, disconnectWs } from '@/background/wsHandler';

import { DEFAULT_STOCKS } from '@/config/stocks';
import { connectStockWS, stockWsManager } from '@/background/stocks/stockWsHandler';

import { getAssetType } from '@/background/assetTypeManager';

// ─── 工具函数

/**
 * 判断 storage 变化是否为有效变化（值真正改变）
 * 原 isValueChanged
 */
function isValueChanged(
  change: chrome.storage.StorageChange | undefined,
  deep = false,
): boolean {
  if (!change) return false;
  return deep
    ? JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue)
    : change.oldValue !== change.newValue;
}

/**
 * 判断两个币种数组是否只是顺序不同（元素完全相同但排列不同）
 * 原 isOnlyOrderChanged
 */
function isOnlyOrderChanged(
  oldCoins: string[] | undefined,
  newCoins: string[] | undefined,
): boolean {
  if (!oldCoins || !newCoins) return false;
  if (oldCoins.length !== newCoins.length) return false;

  const oldSet = new Set(oldCoins);
  for (const coin of newCoins) {
    if (!oldSet.has(coin)) return false;
  }

  // 元素相同但顺序不同
  return JSON.stringify(oldCoins) !== JSON.stringify(newCoins);
}

// ─── 职责 1：price_alerts 变化 → 广播给所有 content script
function handleAlertsChange(): void {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'PRICE_ALERTS_UPDATED' }).catch(() => {
        // 忽略无法发送消息的标签页（例如 chrome:// 页面）
      });
    });
  });
}

// ─── 职责 2：asset_type 变化 → 断开旧 WS，启动新 WS
async function handleAssetTypeChange(
  change: chrome.storage.StorageChange,
): Promise<void> {
  const newType = change.newValue as AssetTypes;

  if (newType === 'stocks') {
    disconnectWs();
    await connectStockWS(DEFAULT_STOCKS);
  } else {
    stockWsManager.disconnect();
    const tokenList = await getCoins();
    initTokenStore(tokenList);
    await connectWebSocket(tokenList);
  }
}

// ─── 职责 3：coins / data_source 变化 → 重建 tokenStore 并按需重连（仅 crypto 模式）
async function handleCoinsOrSourceChange(
  changes: Record<string, chrome.storage.StorageChange>,
): Promise<void> {
  const coinsChanged = isValueChanged(changes.coins, true);
  const dataSourceChanged = isValueChanged(changes.data_source);

  if (!coinsChanged && !dataSourceChanged) return;

  // coins / data_source 为 crypto 专属，stocks 模式下不处理
  const assetType = await getAssetType();
  if (assetType === 'stocks') return;

  const latestCoins = await getCoins();
  initTokenStore(latestCoins);

  // 仅顺序变化 → 不触发 WS 重连，只更新内存顺序
  if (coinsChanged && !dataSourceChanged) {
    const oldCoins = changes.coins?.oldValue as string[] | undefined;
    const newCoins = changes.coins?.newValue as string[] | undefined;

    if (isOnlyOrderChanged(oldCoins, newCoins)) {
      console.log('[Storage] order-only change, skip WS reconnect');
      return;
    }
  }

  await connectWebSocket(latestCoins);
}

// ─── 主入口（注册到 chrome.storage.onChanged）

/**
 * storage.onChanged 统一入口
 * 在 index.ts 中：chrome.storage.onChanged.addListener(onStorageChanged)
 */
export async function onStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  area: string,
): Promise<void> {
  if (area !== 'local') return;

  if (changes.price_alerts) {
    handleAlertsChange();
  }

  // asset_type 切换优先处理，切换完成后不再处理 coins/data_source
  if (changes.asset_type && isValueChanged(changes.asset_type)) {
    await handleAssetTypeChange(changes.asset_type);
    return;
  }

  await handleCoinsOrSourceChange(changes);
}
