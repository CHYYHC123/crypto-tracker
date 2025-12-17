import { price_show, throttle } from '@/utils/index';
import { TokenItem } from '@/types/index';
import { defaultCoinList, defaultDataSource, ExchangeType } from '@/config/exchangeConfig';

import { parseWSMessage } from '@/utils/ws/parseTicker';
import type { Ticker } from '@/utils/ws/parseTicker';
import { fillSodUtc8 } from '@/utils/ws/sodUtc8';
import { wsManager } from '@/utils/ws/wsManager';

let showTokenList: TokenItem[] | null = null;

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
      const tokenList: string[] = result.coins ?? [];
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

  // lastMessageTimestamp = Date.now(); // 更新最后接收数据时间戳
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

// 设置消息处理回调
wsManager.onMessage(handleWsMessage);

// 建立 WebSocket 连接
async function connectWebSocket(tokenList: string[]) {
  const { data_source } = await chrome.storage.local.get('data_source');
  const exchange = (data_source as ExchangeType) || defaultDataSource;

  // 如果没有存储数据源，保存默认值
  if (!data_source) {
    await chrome.storage.local.set({ data_source: defaultDataSource });
  }

  await wsManager.connect(exchange, tokenList);
}

// 断开连接
function disconnectWs() {
  wsManager.disconnect();
}

// 第一次安装或更新时 - 初始默认币种
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['coins'], ({ coins }) => {
    const tokenList = coins ?? defaultCoinList;
    if (!coins) chrome.storage.local.set({ coins: tokenList });
    initShowTokenList(tokenList);
    connectWebSocket(tokenList);
  });
});

// 监听 storage 变化
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;

  const { coins, data_source } = changes;
  console.log('data_source', data_source);

  if (coins || data_source) {
    const { coins: latestCoins = [] } = await chrome.storage.local.get({ coins: [] });
    console.log('latestCoins', latestCoins);
    initShowTokenList(latestCoins);
    await connectWebSocket(latestCoins);
  }
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

    // 已关闭状态，需要重连
    chrome.storage.local.get(['coins'], ({ coins }) => {
      connectWebSocket(coins ?? []);
    });
  }
});

/**
 * 监听消息
 * REFRESH 手动刷新
 * GET_LATEST_PRICES Popup获取最新数据
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'REFRESH') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['coins']);
        const tokenList: string[] = result.coins ?? [];
        await connectWebSocket(tokenList);
        sendResponse({ success: true, msg: 'The refresh is complete 🚀' });
      } catch (error) {
        sendResponse({ success: false, msg: 'Refresh failed ❌' });
      }
    })();

    return true; // ✅ 告诉 Chrome sendResponse 会异步调用
  } else if (message.type === 'GET_LATEST_PRICES') {
    const data = showTokenList?.length ? showTokenList : [];
    const msg = showTokenList?.length ? 'success' : 'fail';
    sendResponse({ success: true, data, msg });
  }
});
