import { wsManager, DataStatus } from '@/utils/ws/wsManager';
import { parseWSMessage } from '@/background/tokens/parseTicker';
import { applyAssetUpdate, throttledPublishAssets, publishAssets, initAssetStore, triggerSelfHeal, getAssetList } from '@/background/assetStore';

import { getAssetType, getDataSource } from '@/utils/local';
import { getCoins } from '@/background/tokens/coinsManager';
import { getStocks } from '@/background/stocks/stocksManager';
import { getBatchPrice } from '@/background/stocks/batchPrice';
import { getCryptoBatchPrice } from '@/background/tokens/cryptoBatchPrice';
import type { AssetItem } from '@/types/asset';

// 广播 WS 链接状态
function broadcastWSStatus(status: DataStatus): void {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'ASSET_STATUS_CHANGE', data: status }, () => {
        chrome.runtime.lastError; // 静默消费
      });
    });
  });
}

function handleMessage(data: any): void {
  try {
    const items = parseWSMessage(data);
    if (!items) return;

    if (!getAssetList()) {
      triggerSelfHeal(async () => {
        const coins = await getCoins();
        initAssetStore(coins.map(s => ({ id: s.toLowerCase(), symbol: s.toUpperCase(), category: 'crypto' as const })));
      });
      return;
    }

    const updated = applyAssetUpdate(items);
    if (updated) throttledPublishAssets(updated);
  } catch (error) {
    console.error('[WS] message parse error', error);
  }
}

// WS 回调
export function setupWSCallbacks(): void {
  wsManager.onMessage(handleMessage);
  wsManager.onStatusChange(status => {
    console.log('[CryptoWS] 数据状态变化:', status);
    broadcastWSStatus(status);
  });
}

// WS 链接
export async function connectWS(): Promise<void> {
  const assetType = await getAssetType();
  if (assetType === 'crypto') {
    await connectCryptoWS();
  } else {
    await connectStockWS();
  }
}

/**
 * 建立 Crypto WebSocket 连接
 * 连接前先批量拉取快照价格，避免 WS 数据到来前 UI 显示全 0
 */
async function connectCryptoWS(): Promise<void> {
  const exchange = await getDataSource();
  const tokenList = await getCoins();
  initAssetStore(tokenList.map(s => ({ id: s.toLowerCase(), symbol: s.toUpperCase(), category: 'crypto' as const })));

  try {
    const snapshots = await getCryptoBatchPrice(exchange, tokenList);
    if (snapshots.length) {
      const updated = applyAssetUpdate(snapshots);
      if (updated) publishAssets(updated);
    }
  } catch (err) {
    console.warn('[CryptoWS] 快照预填充失败，跳过:', err);
  }

  await wsManager.connect(exchange, tokenList);
}

/**
 * 建立 Stock WebSocket 连接，初始化 Store
 * 连接前先批量拉取快照价格，避免 WS 数据到来前 UI 显示全 0
 */
async function connectStockWS(): Promise<void> {
  const symbolList = await getStocks();
  const symbolSet = new Set(symbolList.map(s => s.toUpperCase()));

  // 1. 先用空价格初始化 Store
  initAssetStore(symbolList.map(s => ({ id: s.toLowerCase(), symbol: s.toUpperCase(), category: 'stocks' as const })));

  // 2. 批量拉取快照价格，预填充 Store
  try {
    const rawList = await getBatchPrice(symbolSet);
    if (!rawList.length) return;

    const items: AssetItem[] = rawList.map(d => {
      const symbol = d.ac.replace(/^EQ_/, '').toUpperCase();
      const price = parseFloat(d.c) || 0;
      const prevClose = parseFloat(d.pc) || 0;
      const change = prevClose > 0 ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;
      return {
        id: symbol.toLowerCase(),
        symbol,
        category: 'stocks' as const,
        price,
        change,
        lastPrice: 0,
        prevClose,
        marketPhase: d.mp
      };
    });

    const updated = applyAssetUpdate(items);
    if (updated) publishAssets(updated);
  } catch (err) {
    console.warn('[StockWS] 批量快照价格拉取失败，跳过预填充:', err);
  }

  // 3. 建立 WS 连接，后续实时推送覆盖快照数据
  await wsManager.connect('BNStock', []);
}

export function disconnectWS(): void {
  wsManager.disconnect();
}

export { wsManager };
export { DataStatus };
