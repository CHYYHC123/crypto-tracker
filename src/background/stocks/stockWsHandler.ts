import { WsManager, DataStatus } from '@/utils/ws/wsManager';
import { parseStockMessage } from '@/background/stocks/parseStockTicker';
import { initStockStore, applyStockUpdate, throttledPublishStocks } from '@/background/stocks/stockStore';

// 股票专用独立实例，不影响加密货币 wsManager 单例
export const stockWsManager = new WsManager();

/**
 * WS 收到数据时的回调
 */
function handleStockWsMsg(data: any): void {
  try {
    // console.log('[StockWS] 收到数据:', data);
    const items = parseStockMessage(data);
    if (!items) return;

    const updated = applyStockUpdate(items);
    if (!updated) return;

    throttledPublishStocks(updated);
  } catch (err) {
    console.error('[StockWS] message parse error', err);
  }
}

/**
 * 广播股票数据状态变更到所有标签页
 */
function broadcastStockDataStatus(status: DataStatus): void {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id) return;
      console.log('[StockWS] 数据状态变化:', status);
      chrome.tabs.sendMessage(tab.id, { type: 'STOCK_DATA_STATUS_CHANGE', data: status }, () => {
        chrome.runtime.lastError; // 静默消费
      });
    });
  });
}

/**
 * 注册 stockWsManager 的消息回调与状态变化回调
 */
export function setupStockWsCallbacks(): void {
  stockWsManager.onMessage(handleStockWsMsg);

  stockWsManager.onStatusChange(status => {
    console.log('[StockWS] 数据状态变化:', status);
    broadcastStockDataStatus(status);
  });
}

/**
 * 建立股票 WebSocket 连接
 * @param symbolList 需要追踪的股票代码列表，用于初始化 stockStore
 */
export async function connectStockWS(symbolList: string[]): Promise<void> {
  initStockStore(symbolList);
  // BNStock 订阅消息固定为全局 price 流，不传 tokenList
  await stockWsManager.connect('BNStock', []);
}

/**
 * 断开股票 WebSocket 连接
 */
export function disconnectStockWs(): void {
  stockWsManager.disconnect();
}

export { initStockStore, DataStatus };
