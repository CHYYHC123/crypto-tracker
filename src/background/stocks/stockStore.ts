import { throttle } from '@/utils/index';
import type { StockItem } from '@/background/stocks/parseStockTicker';

let stockList: StockItem[] | null = null;
let stockMap: Map<string, StockItem> | null = null;
let lastUpdateTime: number | null = null;

export function getStockList(): StockItem[] | null {
  return stockList;
}

export function getStockLastUpdateTime(): number | null {
  return lastUpdateTime;
}

/**
 * 根据 symbol 列表初始化 stockList 与 stockMap
 */
export function initStockStore(symbolList: string[]): void {
  stockList = symbolList.map(s => ({
    id: s.toLowerCase(),
    symbol: s.toUpperCase(),
    price: 0,
    prevClose: 0,
    change: 0,
    marketPhase: '',
    lastPrice: 0
  }));

  stockMap = new Map(stockList.map(item => [item.symbol, item]));
}

/**
 * 将 WS 推送的 StockItem 数组更新到 stockList
 * 返回更新后的完整列表；无任何变化时返回 null
 */
export function applyStockUpdate(items: StockItem[]): StockItem[] | null {
  if (!stockList || !stockMap) return null;

  let hasUpdate = false;
  const now = Date.now();

  for (const item of items) {
    const existing = stockMap.get(item.symbol);
    if (!existing) continue;

    const priceChanged = item.price !== existing.price;
    const phaseChanged = item.marketPhase !== existing.marketPhase;

    lastUpdateTime = now;

    if (!priceChanged && !phaseChanged) continue;

    existing.lastPrice = existing.price;
    existing.price = item.price;
    existing.prevClose = item.prevClose;
    existing.change = item.change;
    existing.marketPhase = item.marketPhase;
    hasUpdate = true;
  }

  return hasUpdate ? stockList : null;
}

function _publishStocks(stockItems: StockItem[]): void {
  // console.log('stockItems', stockItems);
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0 || chrome.runtime.lastError) return;
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_STOCK_PRICE', data: stockItems }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[StockStore] sendMessage 失败:', chrome.runtime.lastError.message);
        }
      });
    });
  });
}

export const throttledPublishStocks = throttle(_publishStocks, 500);
