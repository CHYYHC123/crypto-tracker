/**
 * @fileoverview [Background SW 核心入口]
 * 职责：负责 Extension 后台生命周期监听、WebSockets 保活机制及事件分发协调。
 */

import { initGlobalAlerts } from '@/background/globalAlertsManager';
import { onStorageChanged } from '@/background/storageHandler';
import { onMessage } from '@/background/messageRouter';
import { isWsZombie } from '@/utils/ws/zombieDect';

import { connectWS, setupWSCallbacks, disconnectWS } from '@/background/assetWsHandler';

// 注册 WS 回调 - 内部区分 AssetType 类型
setupWSCallbacks();

// 第一次安装或更新时 触发
chrome.runtime.onInstalled.addListener(async () => {
  await connectWS();
  // 全局预警
  initGlobalAlerts();
  chrome.alarms.create('ws-keep-alive', { periodInMinutes: 1 });
});

// 监听 storage 变化
chrome.storage.onChanged.addListener(onStorageChanged);

// 监听系统空闲状态变化
chrome.idle.onStateChanged.addListener(async newState => {
  // 这里可能存在 Bug 会不会断开后重新连接
  if (newState === 'locked') {
    disconnectWS();
    return;
  }

  if (newState !== 'active') return;

  // if (manager.isConnected() || manager.isConnecting()) {
  //   console.log(`[${isStocks ? 'Stock' : 'Crypto'}WS] already alive, skip reconnect (idle → active)`);
  //   return;
  // }

  // manager.onNetworkRestore();
});

// alarm 触发时检测 WS 状态，断线则重新初始化并重连
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'ws-keep-alive') return;
  if (!(await isWsZombie())) return;

  // 如果假死 重启连接
  await connectWS();

  // const assetType = await getAssetType();

  // if (assetType === 'stocks') {
  //   await connectStockWS(DEFAULT_STOCKS);
  // } else {
  //   const tokenList = await getCoins();
  //   await connectCryptoWS(tokenList);
  // }
});

// 监听来自 Popup / Content 的消息
chrome.runtime.onMessage.addListener(onMessage);
