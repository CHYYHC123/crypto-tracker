import { getCoins, setCoins } from '@/background/coinsManager';
import { setBadge } from '@/background/badge';
import { wsManager, DataStatus } from '@/background/wsHandler';
import { getShowTokenList, getLastUpdateTime, publishMessage, initTokenStore } from '@/background/tokenStore';
import { connectWebSocket } from '@/background/wsHandler';
import { TokenItem } from '@/types/index';

// ─── 类型

type SendResponse = (response: any) => void;
// 同步 handler 返回 void；需要异步 sendResponse 的 handler 返回 true
type Handler = (message: any, sendResponse: SendResponse) => boolean | void;

// ─── 各消息 Handler

function handleGetDataStatus(_msg: any, sendResponse: SendResponse): void {
  sendResponse({
    success: true,
    data: wsManager.getDataStatus(),
    isInCooldownMode: wsManager.isInCooldownMode(),
  });
}

/**
 * 处理 REFRESH 手动刷新
 * 原 handleRefresh
 */
async function handleRefresh(_msg: any, sendResponse: SendResponse): Promise<void> {
  try {
    const tokenList = await getCoins();
    await connectWebSocket(tokenList);
    sendResponse({ success: true, msg: 'The refresh is complete 🚀' });
  } catch {
    sendResponse({ success: false, msg: 'Refresh failed ❌' });
  }
}

/**
 * 处理 CONTENT_RESYNC：content script 页面可见时同步数据，防止 WS 假死
 * 原 handleContentResync
 */
async function handleContentResync(_msg: any, sendResponse: SendResponse): Promise<void> {
  const status = wsManager.getDataStatus();
  const now = Date.now();
  const STALE_THRESHOLD = 10_000; // 10s 无数据则视为假死

  const lastUpdate = getLastUpdateTime();
  const isTokenListStale = lastUpdate !== null && now - lastUpdate > STALE_THRESHOLD;

  if (isTokenListStale) {
    const isStale = wsManager.detectAndHandleStaleConnection(STALE_THRESHOLD);
    if (isStale) {
      await handleRefresh(_msg, sendResponse);
      return;
    }
  }

  // WS 正常或可用 → 直接推送当前快照
  const list = getShowTokenList();
  if ([DataStatus.LIVE, DataStatus.DEGRADED].includes(status) && list && list.length > 0) {
    publishMessage(list);
    return;
  }

  // 断线状态 → 触发重连
  console.log('[Background] CONTENT_RESYNC detected OFFLINE, trigger REFRESH');
  await handleRefresh(_msg, sendResponse);
}

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
 * 重新排序 showTokenList（不触发 WS 重连）
 * 原 REORDER_TOKENS handler
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
  ['GET_DATA_STATUS',   handleGetDataStatus],
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
