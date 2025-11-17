import { price_show, throttle } from '@/utils/index';
import { TokenItem } from '@/types/index';

const OKXWebSoceketUrl = 'wss://wspri.okx.com:8443/ws/v5/ipublic';
let showTokenList: TokenItem[] | null = null;
let ws: WebSocket | null = null;
let lastMessageTimestamp = Date.now();
let reconnectAttempts = 0;

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
interface TokenDataType {
  instId: string;
  last: string;
  sodUtc8: string;
}
function updateTokenList(tokenData: TokenDataType): TokenItem[] | null {
  if (!tokenData?.instId || !tokenData?.last) return null;
  if (!showTokenList || !Array.isArray(showTokenList)) {
    (async () => {
      const result = await chrome.storage.local.get(['coins']);
      const tokenList: string[] = result.coins ?? [];
      initShowTokenList(tokenList);
    })();

    return null;
  }

  const coin = tokenData?.instId; // 币种 e.g. "BTC-USDT"
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

  lastMessageTimestamp = Date.now(); // 更新最后接收数据时间戳
  return showTokenList;
}

// 建立 WebSocket
function connectWebSocket(tokenList: string[]) {
  if (ws) {
    ws.close();
    ws = null;
  }
  ws = new WebSocket(OKXWebSoceketUrl);
  ws.onopen = () => {
    if (!tokenList?.length) return new Error('Token list cannot be null !!');
    // console.log('tokenList', tokenList);
    reconnectAttempts = 0;
    // const subscribeMessage = handleOKXSubscribe(tokenList);
    const subscribeMessage = {
      op: 'subscribe',
      args: tokenList.map(symbol => ({ channel: 'tickers', instId: `${symbol}-USDT` }))
    };
    ws?.send(JSON.stringify(subscribeMessage));
  };

  ws.onmessage = message => {
    try {
      const data = JSON.parse(message.data); // 解析消息
      if (!data?.data) return;
      const newTokenList = updateTokenList(data.data[0]);
      if (!newTokenList || !Array.isArray(newTokenList)) return;
      throttledPublishMessage(newTokenList);
    } catch (err) {
      console.error('WS message parse error', err);
    }
  };
  ws.onclose = () => {
    ws = null;
    scheduleReconnect(tokenList);
  };
  ws.onerror = error => {
    console.log('WS error occurred:', error);
  };
}

// 自动重连
function scheduleReconnect(tokenList: string[]) {
  reconnectAttempts++;
  const backoff = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
  setTimeout(() => connectWebSocket(tokenList), backoff);
}

// 5 秒无消息自动刷新
chrome.alarms.create('check_ws', { periodInMinutes: 0.1 }); // ~6秒
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'check_ws') return;
  const now = Date.now();
  if (now - lastMessageTimestamp >= 5000) {
    const result = await chrome.storage.local.get(['coins']);
    const tokenList: string[] = result.coins ?? [];
    await connectWebSocket(tokenList);
  }
});

// 第一次安装或更新时 - 初始默认币种
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['coins'], ({ coins }) => {
    const tokenList = coins ?? ['BTC', 'ETH', 'BNB', 'SOL'];
    if (!coins) chrome.storage.local.set({ coins: tokenList });
    initShowTokenList(tokenList);
    connectWebSocket(tokenList);
  });
});

// 监听 storage 变化
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.coins) {
    await initShowTokenList(changes.coins?.newValue);
    await connectWebSocket(changes.coins?.newValue);
  }
});

// 监听页面页面打开
chrome.idle.onStateChanged.addListener(newState => {
  if (newState === 'locked') ws?.close();
  else if (newState === 'active') {
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
