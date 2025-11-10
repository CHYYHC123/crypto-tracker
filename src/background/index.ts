import { price_show, throttle } from '@/utils/index';

const OKXWebSoceketUrl = 'wss://wspri.okx.com:8443/ws/v5/ipublic';

let defaultToken: string[] = ['BTC', 'ETH', 'BNB', 'SOL'];
interface TokenItem {
  id: string;
  symbol: string;
  price: number | null;
  change: number | null;
  icon: string;
  lastPrice: number | 0;
}
let showTokenList: TokenItem[] | null = null;

// 第一次安装或更新时 - 初始默认币种
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['coins'], items => {
    if (!items.coins) {
      chrome.storage.local.set({
        coins: ['BTC', 'ETH', 'BNB', 'SOL']
      });
      getTokenPrice();
    } else {
      defaultToken = items.coins;
      getTokenPrice();
    }
  });
});

// 监听 storage 变化
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.refreshSeconds) {
  }
});

/**
 * 监听消息
 * REFRESH 手动刷新
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH') {
    (async () => {
      try {
        await getTokenPrice(); // 如果 getTokenPrice 返回 Promise
        sendResponse({ success: true, msg: 'The refresh is complete 🚀' });
      } catch (error) {
        sendResponse({ success: false, msg: 'Refresh failed ❌' });
      }
    })();
    return true; // ✅ 告诉 Chrome sendResponse 会异步调用
  }
});

// 处理初次发送WebSocket订阅数据
function handleOKXSubscribe(tokenList: string[]) {
  const tokenInstId = tokenList?.map(item => {
    return {
      channel: 'tickers',
      instId: `${item}-USDT`
    };
  });
  const subscribeMessage = {
    op: 'subscribe',
    args: tokenInstId
  };
  return subscribeMessage;
}

// 发送数据
function publishMessage(tokenList: TokenItem[]) {
  // 向当前标签页发送消息
  console.log('tokenList', tokenList);
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length === 0 || chrome.runtime.lastError) return;
    tabs.forEach(tab => {
      if (!tab.id) return; // ✅ 防止 undefined
      chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_PRICE', data: tokenList }, response => {
        if (chrome.runtime.lastError) return; // 防止报错
      });
    });
  });
}
const throttledPublishMessage = throttle(publishMessage, 500);

// 获取币种实时价格
let eventSource: WebSocket | null = null;
function getTokenPrice() {
  disconnectWebSocket();
  eventSource = new WebSocket(OKXWebSoceketUrl);
  if (!eventSource) return;
  eventSource.onopen = () => {
    if (!defaultToken?.length) return new Error('Token list cannot be null !!');
    const subscribeMessage = handleOKXSubscribe(defaultToken);
    eventSource!.send(JSON.stringify(subscribeMessage));
  };
  eventSource.onmessage = message => {
    try {
      const data = JSON.parse(message.data); // 解析消息
      if (!data?.data) return;

      const newTokenList = updateTokenList(data.data[0]);

      // console.log('newTokenList', newTokenList);
      if (!newTokenList || !Array.isArray(newTokenList)) return;
      throttledPublishMessage(newTokenList);
    } catch (err) {
      console.error('消息解析失败:', err);
    }
  };
  eventSource.onclose = () => {
    console.log('webWocket 关闭了');
  };
  eventSource.onerror = error => {
    console.error('WebSocket 发生错误:', error);
  };
}

// 断开websocket
function disconnectWebSocket() {
  if (!eventSource) return;
  eventSource.close();
  eventSource = null;
}

// 初始币种展示数据
function initShowTokenList() {
  if (!defaultToken.length) return new Error('Token list cannot be null!');
  if (showTokenList) showTokenList = null;
  return (showTokenList = defaultToken.map(token => ({
    id: token?.toLowerCase(),
    symbol: token?.toUpperCase(),
    price: 0,
    change: 0,
    icon: token?.charAt(0).toUpperCase(),
    lastPrice: 0
  })));
}

// 更新价格
interface TokenDataType {
  instId: string;
  last: string;
  sodUtc8: string;
}
function updateTokenList(tokenData: TokenDataType) {
  if (!tokenData?.instId || !tokenData?.last) return;
  if (!showTokenList || !Array.isArray(showTokenList)) initShowTokenList();

  // console.log('tokenData', tokenData);
  const coin = tokenData?.instId; // 币种 e.g. "BTC-USDT"
  const curPrice = Number(tokenData.last); // 当前价格
  const openToday = Number(tokenData.sodUtc8); // 北京时间开盘价

  if (!showTokenList?.length) return;
  const cryptoToUpdate = showTokenList.find(item => coin === `${item.symbol}-USDT`);
  if (!cryptoToUpdate) return;

  // 保存上一次价格
  const lastPrice = cryptoToUpdate?.price || 0;

  // console.log('curPrice', curPrice);
  // console.log('lastPrice', lastPrice);
  // 使用 price_show 格式化价格用于判断是否变化
  const formattedCurPrice = price_show(curPrice);
  const formattedLastPrice = lastPrice !== null ? price_show(lastPrice) : null;
  // console.log('formattedCurPrice', formattedCurPrice);
  // console.log('formattedLastPrice', formattedLastPrice);

  // 如果价格没有变化，直接返回，避免多次发送和渲染
  if (formattedLastPrice !== null && formattedCurPrice === formattedLastPrice) return;

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

  return showTokenList;
}
