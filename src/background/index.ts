import { price_show, throttle } from '@/utils/index';
import { TokenItem } from '@/types/index';
import { defaultCoinList, defaultDataSource, ExchangeType } from '@/config/exchangeConfig';

import { parseWSMessage } from '@/utils/ws/parseTicker';
import type { Ticker } from '@/utils/ws/parseTicker';
import { fillSodUtc8 } from '@/utils/ws/sodUtc8';
import { wsManager, DataStatus } from '@/utils/ws/wsManager';

let showTokenList: TokenItem[] | null = null;
// 记录 showTokenList 最后更新的时间戳（用于检测 WebSocket 假死）
// let lastTokenListUpdateTime: number = Date.now();
let lastTokenListUpdateTime: number | null = null;

// 节流 发送数据
function publishMessage(tokenList: TokenItem[]) {
  // 向当前标签页发送消息
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0 || chrome.runtime.lastError) return;
    tabs.forEach(tab => {
      if (!tab.id) return; // ✅ 防止 undefined
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_PRICE', data: tokenList }, _response => {
        if (chrome.runtime.lastError) return; // 防止报错
      });
    });
  });
}
const throttledPublishMessage = throttle(publishMessage, 500);

// 初始币种展示数据
function initShowTokenList(tokenList: string[]) {
  showTokenList = tokenList.map(token => ({
    id: token.toLowerCase(),
    symbol: token.toUpperCase(),
    price: 0,
    change: 0,
    icon: token.charAt(0).toUpperCase(),
    lastPrice: 0
  }));
}

//  更新 token 列表价格
function updateTokenList(tokenData: Ticker): TokenItem[] | null {
  if (!tokenData?.symbol || !tokenData?.last) return null;
  if (!showTokenList || !Array.isArray(showTokenList)) {
    (async () => {
      const result = await chrome.storage.local.get(['coins']);
      const tokenList: string[] = (result.coins as string[]) ?? [];
      initShowTokenList(tokenList);
    })();

    return null;
  }

  const coin = tokenData?.symbol; // 币种 e.g. "BTC-USDT"
  const curPrice = Number(tokenData.last); // 当前价格
  const openToday = Number(tokenData.sodUtc8); // 北京时间开盘价

  if (!showTokenList?.length) return null;
  const cryptoToUpdate = showTokenList.find(item => coin === `${item.symbol}-USDT`);
  if (!cryptoToUpdate) return null;

  // 保存上一次价格
  const lastPrice = cryptoToUpdate?.price || 0;

  // 使用 price_show 格式化价格用于判断是否变化
  const formattedCurPrice = price_show(curPrice);
  const formattedLastPrice = lastPrice !== null ? price_show(lastPrice) : null;

  // 如果价格没有变化，直接返回，避免多次发送和渲染
  if (formattedLastPrice !== null && formattedCurPrice === formattedLastPrice) return null;

  // 更新当前价格
  cryptoToUpdate.price = curPrice;
  cryptoToUpdate.lastPrice = lastPrice;

  // 使用 sodUtc8 计算今日涨跌幅
  let change = null;
  if (openToday && openToday > 0) {
    change = ((curPrice - openToday) / openToday) * 100;
  }
  // 保留两位小数
  cryptoToUpdate.change = change !== null ? Number(change.toFixed(2)) : null;

  // 更新最后接收数据时间戳（用于检测 WebSocket 假死）
  lastTokenListUpdateTime = Date.now();
  return showTokenList;
}

// 处理 WebSocket 消息
function handleWsMessage(data: any) {
  try {
    let ticker = parseWSMessage(data);
    if (!ticker) return;
    ticker = fillSodUtc8(ticker);

    const newTokenList = updateTokenList(ticker);
    if (!Array.isArray(newTokenList)) return;

    throttledPublishMessage(newTokenList);
  } catch (err) {
    console.error('WS message parse error', err);
  }
}

// 广播网络状态到所有标签页
function broadcastDataStatus(status: DataStatus) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'DATA_STATUS_CHANGE', data: status }, () => {
        if (chrome.runtime.lastError) return; // 静默处理错误
      });
    });
  });
}

// 设置消息处理回调
wsManager.onMessage(handleWsMessage);

// 设置状态变化回调
wsManager.onStatusChange(status => {
  console.log('[Background] 数据状态变化:', status);
  broadcastDataStatus(status);
});

// 建立 WebSocket 连接
async function connectWebSocket(tokenList: string[]) {
  const { data_source } = await chrome.storage.local.get('data_source');
  const exchange = (data_source as ExchangeType) || defaultDataSource;

  // 如果没有存储数据源，保存默认值
  if (!data_source) {
    await chrome.storage.local.set({ data_source: defaultDataSource });
  }

  // 连接前重置时间戳，避免误判（连接成功后如果正常，会很快收到数据并更新时间戳）
  lastTokenListUpdateTime = Date.now();

  await wsManager.connect(exchange, tokenList);
}

// 断开连接
function disconnectWs() {
  wsManager.disconnect();
}

// 第一次安装或更新时 - 初始默认币种
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['coins'], ({ coins }) => {
    const tokenList = (coins ?? defaultCoinList) as string[];
    if (!coins) chrome.storage.local.set({ coins: tokenList });
    initShowTokenList(tokenList);
    connectWebSocket(tokenList);
  });
});

// 判断 storage 变化是否为有效变化（值真正改变）
function isValueChanged(change: chrome.storage.StorageChange | undefined, deep = false): boolean {
  if (!change) return false;
  if (deep) {
    return JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue);
  }
  return change.oldValue !== change.newValue;
}

// 获取有效的币种列表，为空时回退到默认值
async function getValidCoinList(): Promise<string[]> {
  const { coins }: { coins: string[] } = await chrome.storage.local.get('coins');

  if (coins?.length) return coins;

  // coins 为空，恢复默认值
  await chrome.storage.local.set({ coins: defaultCoinList });
  return defaultCoinList;
}

// 判断两个币种数组是否只是顺序不同（包含相同的币种）
function isOnlyOrderChanged(oldCoins: string[] | undefined, newCoins: string[] | undefined): boolean {
  if (!oldCoins || !newCoins) return false;
  if (oldCoins.length !== newCoins.length) return false;

  // 检查是否包含相同的币种（忽略顺序）
  const oldSet = new Set(oldCoins);
  const newSet = new Set(newCoins);

  if (oldSet.size !== newSet.size) return false;

  // 检查所有币种是否都相同
  for (const coin of oldSet) {
    if (!newSet.has(coin)) return false;
  }

  // 如果币种相同但顺序不同，返回 true
  return JSON.stringify(oldCoins) !== JSON.stringify(newCoins);
}

/**
 * 处理 REFRESH 类型消息
 */
async function handleRefresh(sendResponse: (param: any) => void) {
  try {
    const result = await chrome.storage.local.get(['coins']);
    const tokenList = (result.coins as string[]) ?? [];
    await connectWebSocket(tokenList);
    sendResponse({ success: true, msg: 'The refresh is complete 🚀' });
  } catch (error) {
    sendResponse({ success: false, msg: 'Refresh failed ❌' });
  }
}

/**
 * 处理 CONTENT_RESYNC 类型消息, 防止 WebSocket 处于假死状态
 */
async function handleContentResync(sendResponse: (param: any) => void) {
  const status = wsManager.getDataStatus();
  const now = Date.now();
  const STALE_THRESHOLD = 10_000; // 10s 阈值

  // 检测 WebSocket 假死：如果 1 分钟内 showTokenList 没有变化，且 WebSocket 显示连接
  const isTokenListStale = lastTokenListUpdateTime !== null && now - lastTokenListUpdateTime > STALE_THRESHOLD;
  if (isTokenListStale) {
    // 使用 wsManager 的假死检测方法（会自动更新状态为 OFFLINE 并强制重连）
    const isStale = wsManager.detectAndHandleStaleConnection(STALE_THRESHOLD);

    if (isStale) {
      // 触发重连
      await handleRefresh(sendResponse);
      return;
    }
  }

  // WS 正常 or 勉强可用 → 直接推送当前快照
  if ([DataStatus.LIVE, DataStatus.DEGRADED].includes(status) && showTokenList && showTokenList.length > 0) {
    publishMessage(showTokenList);
    return;
  }

  // 已经处于断线状态 → 其他情况当做断线处理
  console.log('[Background] CONTENT_RESYNC detected OFFLINE, trigger REFRESH');
  await handleRefresh(sendResponse);
  return;
}

// 监听 storage 变化
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;

  // 如果 price_alerts 变化了，通知所有标签页的 content script
  if (changes.price_alerts) {
    chrome.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'PRICE_ALERTS_UPDATED' }).catch(() => {
            // 忽略无法发送消息的标签页（例如 chrome:// 页面）
          });
        }
      });
    });
    return;
  }

  const coinsChanged = isValueChanged(changes.coins, true);
  const dataSourceChanged = isValueChanged(changes.data_source);

  if (!coinsChanged && !dataSourceChanged) return;

  // 如果只是币种顺序变化（币种相同但顺序不同），只更新顺序，不触发 WebSocket 重连
  if (coinsChanged && !dataSourceChanged) {
    const oldCoins = changes.coins?.oldValue as string[] | undefined;
    const newCoins = changes.coins?.newValue as string[] | undefined;

    if (isOnlyOrderChanged(oldCoins, newCoins)) {
      console.log('Storage changed: only order changed, skip WebSocket reconnect');
      const latestCoins = await getValidCoinList();
      initShowTokenList(latestCoins);
      // 不调用 connectWebSocket，只更新内存中的顺序
      return;
    }
  }

  console.log('Storage changed:', { coinsChanged, dataSourceChanged });

  const latestCoins = await getValidCoinList();
  initShowTokenList(latestCoins);
  await connectWebSocket(latestCoins);
});

// 监听页面页面打开
chrome.idle.onStateChanged.addListener(newState => {
  if (newState === 'locked') {
    disconnectWs();
    return;
  }

  if (newState === 'active') {
    // 如果 ws 已存在并且是 CONNECTING 或 OPEN，说明正在工作，不重连
    if (wsManager.isConnected() || wsManager.isConnecting()) {
      console.log('WS already alive, skip reconnect (idle → active)');
      return;
    }

    // 触发网络恢复重连（会自动退出冷却模式）
    wsManager.onNetworkRestore();
  }
});

/**
 * 监听消息
 * REFRESH 手动刷新
 * GET_LATEST_PRICES Popup获取最新数据
 * REORDER_TOKENS 重新排序币种（不触发 WebSocket 重连）
 * GET_DATA_STATUS 获取当前数据状态
 * CONTENT_RESYNC Content 页面可见时请求同步数据
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 获取当前数据状态
  if (message.type === 'GET_DATA_STATUS') {
    sendResponse({
      success: true,
      data: wsManager.getDataStatus(),
      isInCooldownMode: wsManager.isInCooldownMode()
    });
    return;
  }

  // Content 页面可见时，主动推送当前数据
  if (message.type === 'CONTENT_RESYNC') {
    handleContentResync(sendResponse);
    return true; // ✅ 告诉 Chrome sendResponse 会异步调用
  }

  // 触发手动刷新
  if (message.type === 'REFRESH') {
    handleRefresh(sendResponse);
    return true; // ✅ 告诉 Chrome sendResponse 会异步调用
  } else if (message.type === 'GET_LATEST_PRICES') {
    const data = showTokenList?.length ? showTokenList : [];
    const msg = showTokenList?.length ? 'success' : 'fail';
    sendResponse({ success: true, data, msg });
    return true;
  } else if (message.type === 'REORDER_TOKENS') {
    // 重新排序 showTokenList（不触发 WebSocket 重连）
    const newOrder: string[] = message.payload?.order ?? [];
    if (newOrder.length > 0 && showTokenList?.length) {
      // 根据新顺序重新排列 showTokenList
      const reorderedList = newOrder.map(symbol => showTokenList!.find(item => item.symbol === symbol)).filter((item): item is TokenItem => item !== undefined);

      // 只有当所有币种都找到时才更新
      if (reorderedList.length === showTokenList.length) {
        showTokenList = reorderedList;
        // 立即推送更新后的顺序到前端
        publishMessage(showTokenList);

        // 持久化保存顺序到 storage（保持大写格式，因为 storage 中存储的是大写）
        const newCoinsOrder = newOrder.map(symbol => symbol.toUpperCase());
        chrome.storage.local.set({ coins: newCoinsOrder });

        sendResponse({ success: true, msg: 'Reorder complete' });
      } else {
        sendResponse({ success: false, msg: 'Reorder failed: token mismatch' });
      }
    } else {
      sendResponse({ success: false, msg: 'Invalid order' });
    }
  }
});
