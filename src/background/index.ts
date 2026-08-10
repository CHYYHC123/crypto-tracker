/**
 * @fileoverview [Background SW 核心入口]
 * 职责：负责 Extension 后台生命周期监听、WebSockets 保活机制及事件分发协调。
 *
 *【事件-行为映射矩阵 (Event Map)】
 * - onInstalled : 读取 asset_type → 初始化对应 WS → 注册保活 Alarm (周期: 1min)
 * - onAlarm     : 监听 `ws-keep-alive` -> 触发 Zombie 僵尸连接检测 -> 异常则自动重连
 * - onIdle      : [locked] 静默断线 | [active] 触发网络恢复检测/重连
 * - onChanged   : 委托给 storageHandler 处理（含 asset_type 切换逻辑）
 * - onMessage   : 委托给 messageRouter 处理
 *
 * @note [MV3 关键约束]
 * 1. Background 为 Service Worker 机制，随时可能被浏览器销毁。
 * 2. 禁止在此文件定义持久化内存变量，所有持久状态需依赖 chrome.storage 或 storageHandler。
 */

import { getCoins } from '@/background/tokens/coinsManager';
import { initGlobalAlerts } from '@/background/globalAlertsManager';
import { initTokenStore } from '@/background/tokenStore';
import { setupWsCallbacks, connectWebSocket, disconnectWs, wsManager } from '@/background/wsHandler';

import { onStorageChanged } from '@/background/storageHandler';
import { onMessage } from '@/background/messageRouter';
import { isWsZombie } from '@/utils/ws/zombieDect';

import { DEFAULT_STOCKS } from '@/config/stocks';
import { setupStockWsCallbacks, connectStockWS, stockWsManager } from '@/background/stocks/stockWsHandler';

import { getAssetType } from '@/background/assetTypeManager';

// 顶层注册两套 WS 回调：仅注册消息/状态 handler，不建立连接，互不干扰
setupWsCallbacks();
setupStockWsCallbacks();

// 第一次安装或更新时：根据 asset_type 初始化对应 WS 并建立连接
chrome.runtime.onInstalled.addListener(async () => {
  const assetType = await getAssetType();
  console.log('assetType', assetType);

  if (assetType === 'stocks') {
    connectStockWS(DEFAULT_STOCKS);
  } else {
    const tokenList = await getCoins();
    initTokenStore(tokenList);
    connectWebSocket(tokenList);
    initGlobalAlerts();
  }

  // 注册保活 alarm，每分钟触发一次唤醒 SW，防止 WS 静默断连
  chrome.alarms.create('ws-keep-alive', { periodInMinutes: 1 });
});

// 监听 storage 变化（asset_type / coins / data_source / price_alerts）
chrome.storage.onChanged.addListener(onStorageChanged);

// 监听系统空闲状态变化
chrome.idle.onStateChanged.addListener(async newState => {
  const assetType = await getAssetType();
  const isStocks = assetType === 'stocks';

  if (newState === 'locked') {
    isStocks ? stockWsManager.disconnect() : disconnectWs();
    return;
  }

  if (newState !== 'active') return;

  const manager = isStocks ? stockWsManager : wsManager;
  if (manager.isConnected() || manager.isConnecting()) {
    console.log(`${isStocks ? 'Stock ' : ''}WS already alive, skip reconnect (idle → active)`);
    return;
  }
  manager.onNetworkRestore();
});

// alarm 触发时检测 WS 状态，断线则重新初始化并重连
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'ws-keep-alive') return;
  if (!isWsZombie()) return;

  const assetType = await getAssetType();

  if (assetType === 'stocks') {
    connectStockWS(DEFAULT_STOCKS);
    return;
  }

  const tokenList = await getCoins();
  initTokenStore(tokenList);
  connectWebSocket(tokenList);
});

// 监听来自 Popup / Content 的消息
chrome.runtime.onMessage.addListener(onMessage);
