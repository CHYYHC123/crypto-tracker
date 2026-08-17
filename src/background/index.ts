/**
 * @fileoverview [Background SW 核心入口]
 * 职责：负责 Extension 后台生命周期监听、WebSockets 保活机制及事件分发协调。
 */

import { onStorageChanged } from '@/background/storageHandler';
import { onMessage } from '@/background/messageRouter';
import { isWsZombie } from '@/utils/ws/zombieDect';

import { connectWS, setupWSCallbacks, disconnectWS, wsManager } from '@/background/assetWsHandler';
import { initDefaultStorage } from '@/background/initDefaultStorage';

// 初始WS回调
setupWSCallbacks();

// 确保 alarm 存在，不存在则创建（用于锁屏后恢复时重建）
function ensureAlarm() {
  chrome.alarms.get('ws-keep-alive', existing => {
    if (!existing) {
      chrome.alarms.create('ws-keep-alive', { periodInMinutes: 1 });
    }
  });
}

// 第一次安装或更新时：初始化默认数据并建立连接
chrome.runtime.onInstalled.addListener(async () => {
  await initDefaultStorage();
  await connectWS();

  // 注册保活 alarm，每分钟触发一次唤醒 SW，防止 WS 静默断连
  ensureAlarm();
});

// 监听 storage 变化
chrome.storage.onChanged.addListener(onStorageChanged);

// 监听系统空闲状态变化
chrome.idle.onStateChanged.addListener(async newState => {
  if (newState === 'locked') {
    // 锁屏：销毁 alarm 避免在锁屏期间触发无效重连，然后断开 WS
    chrome.alarms.clear('ws-keep-alive');
    disconnectWS();
    return;
  }

  if (newState === 'active') {
    // 解锁：重建 alarm（可能已被锁屏时清除）
    ensureAlarm();

    if (wsManager.isConnected() || wsManager.isConnecting()) {
      console.log('WS already alive, skip reconnect (idle → active)');
      return;
    }

    await connectWS();
  }
});

// alarm 触发时检测 WS 状态，断线则重新初始化并重连
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== 'ws-keep-alive') return;

  // 锁屏期间跳过重连（防止 alarm 在 clear 前最后一次触发时重建连接）
  const idleState = await chrome.idle.queryState(15);
  if (idleState === 'locked') return;

  if (!isWsZombie()) return;

  // 如果假死 重启连接
  await connectWS();
});

// 监听来自 Popup / Content 的消息
chrome.runtime.onMessage.addListener(onMessage);
