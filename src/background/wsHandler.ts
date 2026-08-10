import { wsManager, DataStatus } from '@/utils/ws/wsManager';
import { parseWSMessage } from '@/utils/ws/parseTicker';
import { defaultDataSource, ExchangeListMap, ExchangeType, SelectableExchangeType } from '@/config/exchangeConfig';
import { applyTickerUpdate, throttledPublish, initTokenStore } from '@/background/tokenStore';

/**
 * WS 收到数据时的回调
 * 原 handleWsMessage
 */
export function handleWsMessage(data: any): void {
  try {
    let ticker = parseWSMessage(data);
    if (!ticker) return;

    const updated = applyTickerUpdate(ticker);
    if (!Array.isArray(updated)) return;

    throttledPublish(updated);
  } catch (err) {
    console.error('[WS] message parse error', err);
  }
}

/**
 * 广播网络/数据状态变更到所有标签页
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

/**
 * 建立 WebSocket 连接，自动读取并校验 data_source
 */
export async function connectWebSocket(tokenList: string[]): Promise<void> {
  const { data_source } = await chrome.storage.local.get('data_source');
  let exchange = (data_source as ExchangeType) || defaultDataSource;

  if (!data_source) {
    await chrome.storage.local.set({ data_source: defaultDataSource });
  }

  // 若当前交易所被禁用，回退到默认数据源并持久化
  if (ExchangeListMap[exchange as SelectableExchangeType]?.disabled) {
    exchange = defaultDataSource;
    await chrome.storage.local.set({ data_source: exchange });
  }

  await wsManager.connect(exchange, tokenList);
}

/**
 * 断开 WebSocket 连接
 */
export function disconnectWs(): void {
  wsManager.disconnect();
}

/**
 * 注册 wsManager 的消息回调与状态变化回调
 */
export function setupWsCallbacks(): void {
  wsManager.onMessage(handleWsMessage);

  wsManager.onStatusChange(status => {
    console.log('[Background] 数据状态变化:', status);
    broadcastDataStatus(status);
  });
}

export { wsManager, DataStatus };
export { initTokenStore };
