import { price_show, throttle } from '@/utils/index';
import { TokenItem } from '@/types/index';
import { defaultCoinList, ExchangeConfigMap, ExchangeType } from '@/config/exchangeConfig';

import { parseWSMessage } from '@/utils/ws/parseTicker';
import type { Ticker } from '@/utils/ws/parseTicker';
import { fillSodUtc8, prefetchOpenPrices } from '@/utils/ws/sodUtc8';

let showTokenList: TokenItem[] | null = null;
let ws: WebSocket | null = null;

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

// 建立 WebSocket
async function connectWebSocket(tokenList: string[]) {
  disconnectWs();
  const { data_source } = await chrome.storage.local.get('data_source');
  if (!data_source) return;

  const config = ExchangeConfigMap[data_source as ExchangeType];
  if (!config) return;

  // 预取开盘价（Gate 和 BN 需要从 REST API 获取）
  try {
    await prefetchOpenPrices(data_source as ExchangeType, tokenList);
  } catch (err) {
    console.log('[connectWebSocket] 预取开盘价失败:', err);
  }

  ws = new WebSocket(config.wsUrl);
  ws.onopen = () => {
    if (!tokenList?.length) return new Error('Token list cannot be null !!');
    const msg = config.buildSubscribeMessage(tokenList);
    ws?.send(JSON.stringify(msg));
  };

  ws.onmessage = message => {
    try {
      const data = JSON.parse(message.data); // 解析消息

      let ticker = parseWSMessage(data);
      if (!ticker) return;
      ticker = fillSodUtc8(ticker);

      const newTokenList = updateTokenList(ticker);
      if (!Array.isArray(newTokenList)) return;

      throttledPublishMessage(newTokenList);
    } catch (err) {
      console.error('WS message parse error', err);
    }
  };
  ws.onclose = error => {
    ws = null;
    // scheduleReconnect(tokenList);
    console.log('WS onclose occurred:', error);
  };
  ws.onerror = error => {
    console.log('WS error occurred:', error);
  };
}

// 断开连接
function disconnectWs() {
  try {
    if (!ws) return; // 如果没有 ws，直接退出

    const state = ws.readyState;

    // 只有 CONNECTING(0) 或 OPEN(1) 的 WebSocket 才能关闭
    if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
      const oldWS = ws;
      ws = null; // 优先置空，避免并发重复 close

      // 等 close 完成后再 log
      oldWS.onclose = () => console.log('WebSocket closed safely');

      oldWS.close();
      return;
    }

    // 如果已在 CLOSING(2) 或 CLOSED(3)，直接置空即可
    if (state === WebSocket.CLOSING || state === WebSocket.CLOSED) {
      ws = null;
    }
  } catch (err) {
    console.log('WS disconnect error:', err);
    ws = null;
  }
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
    await initShowTokenList(latestCoins);
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
    // 如果 ws 已存在并且是 CONNECTING(0) 或 OPEN(1)，说明正在工作，不重连
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      console.log('WS already alive, skip reconnect (idle → active)');
      return;
    }

    // 已关闭状态(CLOSING / CLOSED) 或 ws = null，才需要重连
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
        await connectWebSocket(tokenList); // 如果 connectWebSocket 返回 Promise
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
