import { connectWS } from '@/background/assetWsHandler';

import { getAssetType } from '@/utils/local';

// ─── 工具函数

function isValueChanged(change: chrome.storage.StorageChange | undefined, deep = false): boolean {
  if (!change) return false;
  return deep ? JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue) : change.oldValue !== change.newValue;
}

/**
 * 判断两个列表（string[] 或 CoinRecord[]）是否仅顺序不同、内容相同
 * coins 字段已升级为 CoinRecord[]，通过提取 symbol 来比较
 */
function isOnlyOrderChanged(oldList: any[] | undefined, newList: any[] | undefined): boolean {
  if (!oldList || !newList) return false;
  if (oldList.length !== newList.length) return false;

  // 兼容 string[] 和 CoinRecord[]：统一提取 symbol
  const toSymbol = (item: any): string => (typeof item === 'string' ? item : item.symbol);

  const oldSymbols = oldList.map(toSymbol);
  const newSymbols = newList.map(toSymbol);

  const oldSet = new Set(oldSymbols);
  for (const sym of newSymbols) {
    if (!oldSet.has(sym)) return false;
  }

  return JSON.stringify(oldSymbols) !== JSON.stringify(newSymbols);
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

// 职责 3：coins / data_source / stocks_list 变化 → 按资产类型决定是否重连
async function handleAssetListChange(changes: Record<string, chrome.storage.StorageChange>): Promise<void> {
  const coinsChanged = isValueChanged(changes.coins, true);
  const dataSourceChanged = isValueChanged(changes.data_source);
  const stocksListChanged = isValueChanged(changes.stocks_list, true);

  if (!coinsChanged && !dataSourceChanged && !stocksListChanged) return;

  const assetType = await getAssetType();

  // 股票模式：stocks_list 变化
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
    const old = changes.coins?.oldValue as any[] | undefined;
    const next = changes.coins?.newValue as any[] | undefined;
    if (isOnlyOrderChanged(old, next)) return;
  }

  await connectWS();

  if (dataSourceChanged) {
    chrome.runtime.sendMessage({ type: 'DATA_SOURCE_SWITCHED' }).catch(() => {});
  }
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
