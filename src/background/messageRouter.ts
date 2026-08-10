import { getCoins, setCoins } from '@/background/tokens/coinsManager';
import { setBadge } from '@/background/badge';
import { wsManager, DataStatus } from '@/background/wsHandler';
import { getShowTokenList, getLastUpdateTime, publishMessage, initTokenStore } from '@/background/tokenStore';
import { connectWebSocket } from '@/background/wsHandler';
import { TokenItem } from '@/types/index';

import { DEFAULT_STOCKS } from '@/config/stocks';
import { connectStockWS, stockWsManager } from '@/background/stocks/stockWsHandler';
import { getStockList, getStockLastUpdateTime, throttledPublishStocks } from '@/background/stocks/stockStore';

import { getAssetType } from '@/background/assetTypeManager';

// ─── 类型

type SendResponse = (response: any) => void;
// 同步 handler 返回 void；需要异步 sendResponse 的 handler 返回 true
type Handler = (message: any, sendResponse: SendResponse) => boolean | void;

// ─── 各消息 Handler

/**
 * 获取当前 WS 数据状态，根据 asset_type 选择对应的 WS 管理器
 */
async function handleGetDataStatus(_msg: any, sendResponse: SendResponse): Promise<void> {
  const isStocks = (await getAssetType()) === 'stocks';
  const manager = isStocks ? stockWsManager : wsManager;
  sendResponse({
    success: true,
    data: manager.getDataStatus(),
    isInCooldownMode: manager.isInCooldownMode(),
  });
}

/**
 * 处理 REFRESH 手动刷新，根据 asset_type 重连对应 WS
 */
async function handleRefresh(_msg: any, sendResponse: SendResponse): Promise<void> {
  try {
    const isStocks = (await getAssetType()) === 'stocks';
    if (isStocks) {
      await connectStockWS(DEFAULT_STOCKS);
    } else {
      const tokenList = await getCoins();
      await connectWebSocket(tokenList);
    }
    sendResponse({ success: true, msg: 'The refresh is complete 🚀' });
  } catch {
    sendResponse({ success: false, msg: 'Refresh failed ❌' });
  }
}

/**
 * 自动刷新 → content 从不可见到可见时主动查询 WS 是否正常，根据 asset_type 选对应链路
 */
async function handleContentResync(_msg: any, sendResponse: SendResponse): Promise<void> {
  const isStocks = (await getAssetType()) === 'stocks';
  const STALE_THRESHOLD = 10_000; // 10s 无数据则视为假死
  const now = Date.now();

  if (isStocks) {
    const manager = stockWsManager;
    const status = manager.getDataStatus();
    const lastUpdate = getStockLastUpdateTime();
    const isStale = lastUpdate !== null && now - lastUpdate > STALE_THRESHOLD;

    if (isStale && manager.detectAndHandleStaleConnection(STALE_THRESHOLD)) {
      await handleRefresh(_msg, sendResponse);
      return;
    }

    const list = getStockList();
    if ([DataStatus.LIVE, DataStatus.DEGRADED].includes(status) && list && list.length > 0) {
      throttledPublishStocks(list);
      return;
    }

    console.log('[Background] CONTENT_RESYNC (stocks) detected OFFLINE, trigger REFRESH');
    await handleRefresh(_msg, sendResponse);
    return;
  }

  // ── crypto 链路
  const status = wsManager.getDataStatus();
  const lastUpdate = getLastUpdateTime();
  const isStale = lastUpdate !== null && now - lastUpdate > STALE_THRESHOLD;

  if (isStale && wsManager.detectAndHandleStaleConnection(STALE_THRESHOLD)) {
    await handleRefresh(_msg, sendResponse);
    return;
  }

  const list = getShowTokenList();
  if ([DataStatus.LIVE, DataStatus.DEGRADED].includes(status) && list && list.length > 0) {
    publishMessage(list);
    return;
  }

  console.log('[Background] CONTENT_RESYNC detected OFFLINE, trigger REFRESH');
  await handleRefresh(_msg, sendResponse);
}

/**
 * 获取最新价格 → 15s 倒计时（popup，crypto 专属）
 */
function handleGetLatestPrices(_msg: any, sendResponse: SendResponse): void {
  const list = getShowTokenList();
  sendResponse({
    success: true,
    data: list?.length ? list : [],
    msg: list?.length ? 'success' : 'fail',
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

/**
 * 重新排序 showTokenList（不触发 WS 重连，crypto 专属）
 */
function handleReorderTokens(msg: any, sendResponse: SendResponse): void {
  const newOrder: string[] = msg.payload?.order ?? [];
  const list = getShowTokenList();

  if (!newOrder.length || !list?.length) {
    sendResponse({ success: false, msg: 'Invalid order' });
    return;
  }

  const reordered = newOrder
    .map(symbol => list.find(item => item.symbol === symbol))
    .filter((item): item is TokenItem => item !== undefined);

  if (reordered.length !== list.length) {
    sendResponse({ success: false, msg: 'Reorder failed: token mismatch' });
    return;
  }

  // 用新顺序重新初始化 store（保留已有价格数据）
  const newOrderSymbols = reordered.map(t => t.symbol);
  initTokenStore(newOrderSymbols);

  // 将已有价格数据回填进新的 tokenStore
  const freshList = getShowTokenList()!;
  reordered.forEach((src, i) => {
    freshList[i].price = src.price;
    freshList[i].lastPrice = src.lastPrice;
    freshList[i].change = src.change;
  });

  publishMessage(freshList);

  // 持久化顺序（防抖写入）
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
    priority: 2,
  });
}

// ─── 路由表

const router = new Map<string, Handler>([
  ['GET_DATA_STATUS',   (msg, res) => { handleGetDataStatus(msg, res); return true; }],
  ['CONTENT_RESYNC',    (msg, res) => { handleContentResync(msg, res); return true; }],
  ['REFRESH',           (msg, res) => { handleRefresh(msg, res); return true; }],
  ['GET_LATEST_PRICES', handleGetLatestPrices],
  ['GET_COINS',         handleGetCoins],
  ['SET_COINS',         handleSetCoins],
  ['REORDER_TOKENS',    handleReorderTokens],
  ['ALERT_TRIGGERED',   () => setBadge('critical')],
  ['ALERT_CLEAR',       () => setBadge('none')],
  ['SHOW_NOTIFICATION', handleShowNotification],
]);

// ─── 主入口（注册到 chrome.runtime.onMessage）

/**
 * runtime.onMessage 统一路由
 * 在 index.ts 中：chrome.runtime.onMessage.addListener(onMessage)
 */
export function onMessage(
  message: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse,
): boolean | void {
  const handler = router.get(message.type);
  if (!handler) return;
  return handler(message, sendResponse);
}
