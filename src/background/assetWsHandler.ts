import { wsManager, DataStatus } from '@/utils/ws/wsManager';
import { parseWSMessage } from '@/background/tokens/parseTicker';
import { applyAssetUpdate, throttledPublishAssets, initAssetStore, triggerSelfHeal, getAssetList } from '@/background/assetStore';

import { getAssetType, getDataSource } from '@/utils/local';
import { getCoins } from '@/background/tokens/coinsManager';
import { DEFAULT_STOCKS } from '@/config/stocks';

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
        initAssetStore(coins.map(s => ({ id: s.toLowerCase(), symbol: s.toUpperCase(), category: 'crypto' })));
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
 */
async function connectCryptoWS(): Promise<void> {
  const exchange = await getDataSource();
  const tokenList = await getCoins();
  initAssetStore(tokenList.map(s => ({ id: s.toLowerCase(), symbol: s.toUpperCase(), category: 'crypto' })));
  await wsManager.connect(exchange, tokenList);
}

/**
 * 建立 Stock WebSocket 连接，初始化 Store
 */
async function connectStockWS(): Promise<void> {
  const symbolList = DEFAULT_STOCKS;
  initAssetStore(symbolList.map(s => ({ id: s.toLowerCase(), symbol: s.toUpperCase(), category: 'stock' })));
  await wsManager.connect('BNStock', []);
}

export function disconnectWS(): void {
  wsManager.disconnect();
}

export { wsManager };
export { DataStatus };
