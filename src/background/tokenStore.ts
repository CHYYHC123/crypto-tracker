import { throttle } from '@/utils/index';
import { TokenItem } from '@/types/index';
import type { Ticker } from '@/utils/ws/parseTicker';
import { getCoins } from '@/background/coinsManager';

// ─── 状态

let showTokenList: TokenItem[] | null = null;
let tokenMap: Map<string, TokenItem> | null = null;
// 最后收到 WS 数据的时间戳，用于假死检测
let lastUpdateTime: number | null = null;
// 防止并发触发多次异步初始化
let isInitializing = false;

// ─── getter（外部只读）

export function getShowTokenList(): TokenItem[] | null {
  return showTokenList;
}

export function getLastUpdateTime(): number | null {
  return lastUpdateTime;
}

// ─── 初始化

/**
 * 根据币种列表初始化 showTokenList 与 tokenMap
 */
export function initTokenStore(tokenList: string[]): void {
  showTokenList = tokenList.map(token => ({
    id: token.toLowerCase(),
    symbol: token.toUpperCase(),
    price: 0,
    change: 0,
    icon: token.charAt(0).toUpperCase(),
    lastPrice: 0
  }));

  // 使用 "SYMBOL-USDT" 作为 key，匹配 WS 消息格式
  tokenMap = new Map(showTokenList.map(t => [`${t.symbol}-USDT`, t]));
}

// ─── 价格更新

/**
 * 根据 ticker 更新 showTokenList 中对应币种的价格
 * 返回更新后的完整列表（价格无变化时返回 null）
 */
export function applyTickerUpdate(tokenData: Ticker): TokenItem[] | null {
  if (!tokenData?.symbol || !tokenData?.last) return null;

  // 未初始化时触发一次异步自愈初始化
  if (!showTokenList || !Array.isArray(showTokenList) || !tokenMap) {
    if (!isInitializing) {
      isInitializing = true;
      getCoins()
        .then(initTokenStore)
        .catch(err => console.error('[TokenStore] 自愈初始化失败:', err))
        .finally(() => (isInitializing = false));
    }
    return null;
  }

  const curPrice = Number(tokenData.last);
  if (isNaN(curPrice) || curPrice <= 0) return null;

  // O(1) 查找
  const cryptoToUpdate = tokenMap.get(tokenData.symbol);
  if (!cryptoToUpdate) return null;
  // console.log('cryptoToUpdate', cryptoToUpdate);

  const lastChangePercent = cryptoToUpdate.change;
  const curChangePercent = tokenData.changePercent;
  const lastPrice = cryptoToUpdate.price;

  let shouldUpdate = false;

  if (lastPrice == null || lastPrice <= 0 || lastChangePercent == null || curChangePercent == null || isNaN(curChangePercent)) {
    // 首次入库或数据缺失时，价格有变化就更新
    shouldUpdate = curPrice !== lastPrice;
  } else {
    // 涨跌幅变化 >= 0.01% 才触发更新
    shouldUpdate = Math.abs(curChangePercent - lastChangePercent) >= 0.01;
  }

  const now = Date.now();

  if (!shouldUpdate) {
    // 价格没变化，但仍更新时间戳用于假死检测
    lastUpdateTime = now;
    return null;
  }

  cryptoToUpdate.lastPrice = lastPrice ?? 0;
  cryptoToUpdate.price = curPrice;

  // if (openToday && !isNaN(openToday) && openToday > 0) {
  //   cryptoToUpdate.change = Number((((curPrice - openToday) / openToday) * 100).toFixed(2));
  // } else {
  //   cryptoToUpdate.change = null;
  // }
  cryptoToUpdate.change = Number(tokenData.changePercent.toFixed(2));

  lastUpdateTime = now;
  return showTokenList;
}

//发布
function _publish(tokenList: TokenItem[]): void {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0 || chrome.runtime.lastError) return;
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_PRICE', data: tokenList }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[sendMessage失败]', chrome.runtime.lastError.message);
        }
      });
    });
  });
}

export const publishMessage = _publish;
export const throttledPublish = throttle(_publish, 500);
