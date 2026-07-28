import { wsManager, DataStatus } from '@/utils/ws/wsManager';
import { parseWSMessage } from '@/utils/ws/parseTicker';
import { fillSodUtc8 } from '@/utils/ws/sodUtc8';
import { defaultDataSource, ExchangeListMap, ExchangeType } from '@/config/exchangeConfig';
import { applyTickerUpdate, throttledPublish, initTokenStore } from '@/background/tokenStore';

// ─── WS 消息处理

/**
 * WS 收到数据时的回调
 * 原 handleWsMessage
 */
export function handleWsMessage(data: any): void {
  try {
    let ticker = parseWSMessage(data);
    if (!ticker) return;
    ticker = fillSodUtc8(ticker);

    const updated = applyTickerUpdate(ticker);
    if (!Array.isArray(updated)) return;

    throttledPublish(updated);
  } catch (err) {
    console.error('[WS] message parse error', err);
  }
}

// ─── 广播数据状态

/**
 * 广播网络/数据状态变更到所有标签页
 * 原 broadcastDataStatus
 */
export function broadcastDataStatus(status: DataStatus): void {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'DATA_STATUS_CHANGE', data: status }, () => {
        chrome.runtime.lastError; // 静默消费
      });
    });
  });
}

// ─── WS 连接管理

/**
 * 建立 WebSocket 连接，自动读取并校验 data_source
 * 原 connectWebSocket
 */
export async function connectWebSocket(tokenList: string[]): Promise<void> {
  const { data_source } = await chrome.storage.local.get('data_source');
  let exchange = (data_source as ExchangeType) || defaultDataSource;

  if (!data_source) {
    await chrome.storage.local.set({ data_source: defaultDataSource });
  }

  // 若当前交易所被禁用，回退到默认数据源并持久化
  if (ExchangeListMap[exchange]?.disabled) {
    exchange = defaultDataSource;
    await chrome.storage.local.set({ data_source: exchange });
  }

  await wsManager.connect(exchange, tokenList);
}

/**
 * 断开 WebSocket 连接
 * 原 disconnectWs
 */
export function disconnectWs(): void {
  wsManager.disconnect();
}

// ─── 初始化回调（在 index.ts 顶部调用一次）

/**
 * 注册 wsManager 的消息回调与状态变化回调
 * 原 index.ts 第 163-169 行的模块级副作用
 */
export function setupWsCallbacks(): void {
  wsManager.onMessage(handleWsMessage);

  wsManager.onStatusChange(status => {
    console.log('[Background] 数据状态变化:', status);
    broadcastDataStatus(status);
  });
}

// ─── 重导出 wsManager（供 messageRouter 使用）

export { wsManager, DataStatus };
export { initTokenStore };
