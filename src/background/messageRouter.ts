import { setCoins } from '@/background/tokens/coinsManager';
import { setStocks } from '@/background/stocks/stocksManager';
import { setBadge } from '@/background/badge';
import { wsManager, connectWS } from '@/background/assetWsHandler';
import { getAssetList, publishAssets, initAssetStore } from '@/background/assetStore';
import type { AssetItem } from '@/types/asset';

// ─── 类型

type SendResponse = (response: any) => void;
type Handler = (message: any, sendResponse: SendResponse) => boolean | void;

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

  initAssetStore(reordered.map(t => ({ id: t.id, symbol: t.symbol, category: t.category })));

  // 回填已有价格数据
  const freshList = getAssetList()!;
  reordered.forEach((src, i) => {
    freshList[i].price = src.price;
    freshList[i].lastPrice = src.lastPrice;
    freshList[i].change = src.change;
  });

  publishAssets(freshList);

  // 按 category 分组持久化，避免 coins / stocks_list 数据互相污染
  const cryptoSymbols = reordered.filter(t => t.category === 'crypto').map(t => t.symbol);
  const stockSymbols = reordered.filter(t => t.category === 'stocks').map(t => t.symbol);

  if (cryptoSymbols.length) {
    setCoins(cryptoSymbols).catch(err => {
      console.error('[Background] REORDER_TOKENS setCoins failed:', err);
    });
  }
  if (stockSymbols.length) {
    setStocks(stockSymbols).catch(err => {
      console.error('[Background] REORDER_TOKENS setStocks failed:', err);
    });
  }

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
