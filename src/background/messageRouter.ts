import { getCoins, setCoins } from '@/background/tokens/coinsManager';
import { setBadge } from '@/background/badge';
import { wsManager, connectWS } from '@/background/assetWsHandler';
import { getAssetList, publishAssets, initAssetStore } from '@/background/assetStore';
import type { AssetItem } from '@/types/asset';

// import { DEFAULT_STOCKS } from '@/config/stocks';
// import { getAssetType } from '@/utils/local';

// ─── 类型

type SendResponse = (response: any) => void;
type Handler = (message: any, sendResponse: SendResponse) => boolean | void;

// ─── 辅助：根据 asset_type 返回当前激活的 WsManager
// async function getActiveManager() {
//   const isStocks = (await getAssetType()) === 'stocks';
//   return { manager: isStocks ? stockWsManager : cryptoWsManager, isStocks };
// }

// ─── 各消息 Handler

async function handleGetDataStatus(_msg: any, sendResponse: SendResponse): Promise<void> {
  sendResponse({
    success: true,
    data: wsManager.getDataStatus(),
    isInCooldownMode: wsManager.isInCooldownMode()
  });
}

async function handleRefresh(_msg: any, sendResponse: SendResponse): Promise<void> {
  try {
    // const { isStocks } = await getActiveManager();
    // if (isStocks) {
    //   await connectStockWS(DEFAULT_STOCKS);
    // } else {
    //   const tokenList = await getCoins();
    //   await connectCryptoWS(tokenList);
    // }

    connectWS();
    sendResponse({ success: true, msg: 'The refresh is complete 🚀' });
  } catch {
    sendResponse({ success: false, msg: 'Refresh failed ❌' });
  }
}


function handleGetLatestPrices(_msg: any, sendResponse: SendResponse): void {
  const list = getAssetList();
  sendResponse({
    success: true,
    data: list?.length ? list : [],
    msg: list?.length ? 'success' : 'fail'
  });
}

function handleGetCoins(_msg: any, sendResponse: SendResponse): boolean {
  getCoins()
    .then(coins => sendResponse({ success: true, data: coins }))
    .catch(err => {
      console.error('[Background] GET_COINS failed:', err);
      sendResponse({ success: false, error: err.message });
    });
  return true;
}

function handleSetCoins(msg: any, sendResponse: SendResponse): boolean {
  const coins = msg.payload?.coins as string[] | undefined;
  if (!coins || !Array.isArray(coins)) {
    sendResponse({ success: false, error: 'Invalid coins data' });
    return true;
  }
  setCoins(coins)
    .then(() => sendResponse({ success: true }))
    .catch(err => {
      console.error('[Background] SET_COINS failed:', err);
      sendResponse({ success: false, error: err.message });
    });
  return true;
}

function handleReorderTokens(msg: any, sendResponse: SendResponse): void {
  const newOrder: string[] = msg.payload?.order ?? [];
  const list = getAssetList();

  if (!newOrder.length || !list?.length) {
    sendResponse({ success: false, msg: 'Invalid order' });
    return;
  }

  const reordered = newOrder.map(symbol => list.find(item => item.symbol === symbol)).filter((item): item is AssetItem => item !== undefined);

  if (reordered.length !== list.length) {
    sendResponse({ success: false, msg: 'Reorder failed: token mismatch' });
    return;
  }

  const newOrderSymbols = reordered.map(t => t.symbol);
  initAssetStore(reordered.map(t => ({ id: t.id, symbol: t.symbol, category: t.category })));

  // 回填已有价格数据
  const freshList = getAssetList()!;
  reordered.forEach((src, i) => {
    freshList[i].price = src.price;
    freshList[i].lastPrice = src.lastPrice;
    freshList[i].change = src.change;
  });

  publishAssets(freshList);

  setCoins(newOrderSymbols).catch(err => {
    console.error('[Background] REORDER_TOKENS setCoins failed:', err);
  });

  sendResponse({ success: true, msg: 'Reorder complete' });
}

function handleShowNotification(msg: any, _sendResponse: SendResponse): void {
  const { title, message: body, iconUrl } = msg.payload;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl || '/logo128.png',
    title: title || 'Crypto Tracker',
    message: body || '',
    priority: 2
  });
}

// ─── 路由表

const router = new Map<string, Handler>([
  [
    'GET_DATA_STATUS',
    (msg, res) => {
      handleGetDataStatus(msg, res);
      return true;
    }
  ],
  [
    'REFRESH',
    (msg, res) => {
      handleRefresh(msg, res);
      return true;
    }
  ],
  ['GET_LATEST_PRICES', handleGetLatestPrices],
  ['GET_COINS', handleGetCoins],
  ['SET_COINS', handleSetCoins],
  ['REORDER_TOKENS', handleReorderTokens],
  ['ALERT_TRIGGERED', () => setBadge('critical')],
  ['ALERT_CLEAR', () => setBadge('none')],
  ['SHOW_NOTIFICATION', handleShowNotification]
]);

// ─── 主入口

export function onMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: SendResponse): boolean | void {
  const handler = router.get(message.type);
  if (!handler) return;
  return handler(message, sendResponse);
}
