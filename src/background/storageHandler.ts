import { connectWS } from '@/background/assetWsHandler';

import { getAssetType } from '@/utils/local';

// ─── 工具函数

function isValueChanged(change: chrome.storage.StorageChange | undefined, deep = false): boolean {
  if (!change) return false;
  return deep ? JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue) : change.oldValue !== change.newValue;
}

function isOnlyOrderChanged(oldList: string[] | undefined, newList: string[] | undefined): boolean {
  if (!oldList || !newList) return false;
  if (oldList.length !== newList.length) return false;

  const oldSet = new Set(oldList);
  for (const item of newList) {
    if (!oldSet.has(item)) return false;
  }

  return JSON.stringify(oldList) !== JSON.stringify(newList);
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
async function handleAssetTypeChange(_change: chrome.storage.StorageChange): Promise<void> {
  await connectWS();
  // 连接完成后通知 popup 刷新数据并结束 loading
  chrome.runtime.sendMessage({ type: 'ASSET_TYPE_SWITCHED' }).catch(() => {});
}

// ─── 职责 3：coins / data_source / stocks_list 变化 → 按资产类型决定是否重连
async function handleAssetListChange(changes: Record<string, chrome.storage.StorageChange>): Promise<void> {
  const coinsChanged = isValueChanged(changes.coins, true);
  const dataSourceChanged = isValueChanged(changes.data_source);
  const stocksListChanged = isValueChanged(changes.stocks_list, true);

  if (!coinsChanged && !dataSourceChanged && !stocksListChanged) return;

  const assetType = await getAssetType();

  if (assetType === 'stocks') {
    if (!stocksListChanged) return;
    const old = changes.stocks_list?.oldValue as string[] | undefined;
    const next = changes.stocks_list?.newValue as string[] | undefined;
    if (isOnlyOrderChanged(old, next)) return;
    await connectWS();
    return;
  }

  // crypto 模式：coins 或 data_source 变化
  if (!coinsChanged && !dataSourceChanged) return;

  if (coinsChanged && !dataSourceChanged) {
    const old = changes.coins?.oldValue as string[] | undefined;
    const next = changes.coins?.newValue as string[] | undefined;
    if (isOnlyOrderChanged(old, next)) return;
  }

  await connectWS();
}

// ─── 主入口

export async function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, area: string): Promise<void> {
  if (area !== 'local') return;

  if (changes.price_alerts || changes.stocks_price_alerts) {
    handleAlertsChange();
  }

  if (changes.asset_type && isValueChanged(changes.asset_type)) {
    await handleAssetTypeChange(changes.asset_type);
    return;
  }

  await handleAssetListChange(changes);
}
