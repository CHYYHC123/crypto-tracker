import type { AssetTypes } from '@/types/index';

import { getCoins } from '@/background/tokens/coinsManager';
import { DEFAULT_STOCKS } from '@/config/stocks';
// import { connectCryptoWS, connectStockWS, cryptoWsManager, stockWsManager } from '@/background/assetWsHandler';
import { wsManager, connectWS } from '@/background/assetWsHandler';

import { getAssetType } from '@/utils/local';

// ─── 工具函数

function isValueChanged(change: chrome.storage.StorageChange | undefined, deep = false): boolean {
  if (!change) return false;
  return deep ? JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue) : change.oldValue !== change.newValue;
}

function isOnlyOrderChanged(oldCoins: string[] | undefined, newCoins: string[] | undefined): boolean {
  if (!oldCoins || !newCoins) return false;
  if (oldCoins.length !== newCoins.length) return false;

  const oldSet = new Set(oldCoins);
  for (const coin of newCoins) {
    if (!oldSet.has(coin)) return false;
  }

  return JSON.stringify(oldCoins) !== JSON.stringify(newCoins);
}

// ─── 职责 1：price_alerts 变化 → 广播给所有 content script
function handleAlertsChange(): void {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'PRICE_ALERTS_UPDATED' }).catch(() => {});
    });
  });
}

// ─── 职责 2：asset_type 变化 → 断开旧 WS，启动新 WS
async function handleAssetTypeChange(change: chrome.storage.StorageChange): Promise<void> {
  // const newType = change.newValue as AssetTypes;
  await connectWS();

  // if (newType === 'stocks') {
  //   cryptoWsManager.disconnect();
  //   await connectStockWS(DEFAULT_STOCKS);
  // } else {
  //   stockWsManager.disconnect();
  //   const tokenList = await getCoins();
  //   await connectCryptoWS(tokenList);
  // }
}

// ─── 职责 3：coins / data_source 变化 → 重建 Store 并按需重连（仅 crypto 模式）
async function handleCoinsOrSourceChange(changes: Record<string, chrome.storage.StorageChange>): Promise<void> {
  const coinsChanged = isValueChanged(changes.coins, true);
  const dataSourceChanged = isValueChanged(changes.data_source);

  if (!coinsChanged && !dataSourceChanged) return;

  const assetType = await getAssetType();
  if (assetType === 'stocks') return;

  const latestCoins = await getCoins();

  if (coinsChanged && !dataSourceChanged) {
    const oldCoins = changes.coins?.oldValue as string[] | undefined;
    const newCoins = changes.coins?.newValue as string[] | undefined;

    if (isOnlyOrderChanged(oldCoins, newCoins)) {
      console.log('[Storage] order-only change, skip WS reconnect');
      return;
    }
  }

  await connectWS();
}

// ─── 主入口

export async function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, area: string): Promise<void> {
  if (area !== 'local') return;

  if (changes.price_alerts) {
    handleAlertsChange();
  }

  if (changes.asset_type && isValueChanged(changes.asset_type)) {
    await handleAssetTypeChange(changes.asset_type);
    return;
  }

  await handleCoinsOrSourceChange(changes);
}
