import { getCoins } from '@/background/coinsManager';
import { initGlobalAlertsOnInstall } from '@/background/globalAlertsManager';
import { initTokenStore } from '@/background/tokenStore';
import { setupWsCallbacks, connectWebSocket, disconnectWs, wsManager } from '@/background/wsHandler';
import { onStorageChanged } from '@/background/storageHandler';
import { onMessage } from '@/background/messageRouter';

// 注册 WS 消息回调和状态变化回调
setupWsCallbacks();

// 第一次安装或更新时：初始化默认币种并建立连接
chrome.runtime.onInstalled.addListener(async () => {
  const tokenList = await getCoins();
  initTokenStore(tokenList);
  connectWebSocket(tokenList);
  initGlobalAlertsOnInstall();

  // 注册保活 alarm，每分钟触发一次唤醒 SW，防止 WS 静默断连
  chrome.alarms.create('ws-keep-alive', { periodInMinutes: 1 });
});

// 监听 storage 变化（coins / data_source / price_alerts）
chrome.storage.onChanged.addListener(onStorageChanged);

// 监听系统空闲状态变化
chrome.idle.onStateChanged.addListener(newState => {
  if (newState === 'locked') {
    disconnectWs();
    return;
  }

  if (newState === 'active') {
    if (wsManager.isConnected() || wsManager.isConnecting()) {
      console.log('WS already alive, skip reconnect (idle → active)');
      return;
    }
    wsManager.onNetworkRestore();
  }
});

// alarm 触发时检测 WS 状态，断线则重新初始化并重连
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'ws-keep-alive') return;
  if (wsManager.isConnected() || wsManager.isConnecting()) return;

  const tokenList = await getCoins();
  initTokenStore(tokenList);
  connectWebSocket(tokenList);
});

// 监听来自 Popup / Content 的消息
chrome.runtime.onMessage.addListener(onMessage);
