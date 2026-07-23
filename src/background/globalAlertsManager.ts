// 全局预警管理 —— settings 和 trigger 的缓存、读写、衰减、阈值计算

import { GlobalAlerts, GlobalAlertsTrigger } from '@/types/index';
import { defaultGlobalAlert } from '@/config/exchangeConfig';

// ─── storage keys

const SETTINGS_KEY = 'global_alerts';
const TRIGGER_KEY = 'global_alerts_trigger';

// ─── 常量

const DECAY_INTERVAL = 8 * 60 * 60 * 1000;   // 8 小时减一次
const RESET_INTERVAL = 24 * 60 * 60 * 1000;  // 24 小时未触发归零

export const DEFAULT_TRIGGER: GlobalAlertsTrigger = {
  upCount: 0,
  downCount: 0,
  lastTriggerAt: 0,
  lastDecayAt: 0
};

// ─── 模块级缓存 

let _settings: GlobalAlerts = { ...defaultGlobalAlert };
let _trigger: GlobalAlertsTrigger = { ...DEFAULT_TRIGGER };
let _listenerRegistered = false;

// ─── 内部 IO

/** 从 storage 读取 global_alerts，不存在时写入默认值并返回默认值 */
export function loadGlobalAlerts(): Promise<GlobalAlerts> {
  return new Promise(resolve => {
    chrome.storage.local.get(SETTINGS_KEY, res => {
      if (chrome.runtime.lastError) {
        console.error('[globalAlertsManager] loadGlobalAlerts error:', chrome.runtime.lastError);
        resolve({ ...defaultGlobalAlert, enabled: false });
        return;
      }
      const data = res[SETTINGS_KEY] as GlobalAlerts | undefined;
      if (data) {
        resolve({ bull: data.bull || '', bear: data.bear || '', step: data.step || '', enabled: !!data.enabled });
      } else {
        chrome.storage.local.set({ [SETTINGS_KEY]: defaultGlobalAlert });
        resolve({ ...defaultGlobalAlert });
      }
    });
  });
}

/** 将 global_alerts 写入 storage */
export function saveGlobalAlerts(settings: GlobalAlerts): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('[globalAlertsManager] saveGlobalAlerts error:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

/** 从 storage 读取 triggerCount，不存在时返回默认值 */
export function loadTriggerCount(): Promise<GlobalAlertsTrigger> {
  return new Promise(resolve => {
    chrome.storage.local.get(TRIGGER_KEY, res => {
      if (chrome.runtime.lastError) {
        console.error('[globalAlertsManager] loadTriggerCount error:', chrome.runtime.lastError);
        resolve({ ...DEFAULT_TRIGGER });
        return;
      }
      const data = res[TRIGGER_KEY] as GlobalAlertsTrigger | undefined;
      resolve(data ? { ...DEFAULT_TRIGGER, ...data } : { ...DEFAULT_TRIGGER });
    });
  });
}

/** 将 triggerCount 写入 storage */
export function saveTriggerCount(trigger: GlobalAlertsTrigger): void {
  chrome.storage.local.set({ [TRIGGER_KEY]: trigger }, () => {
    if (chrome.runtime.lastError) {
      console.error('[globalAlertsManager] saveTriggerCount error:', chrome.runtime.lastError);
    }
  });
}

// ─── 初始化 

/**
 * 安装 / 更新时初始化：
 * - global_alerts 不存在时写入 defaultGlobalAlert
 * - global_alerts_trigger 不存在时写入 DEFAULT_TRIGGER
 * 在 background onInstalled 中调用
 */
export function initGlobalAlertsOnInstall(): void {
  chrome.storage.local.get([SETTINGS_KEY, TRIGGER_KEY], res => {
    if (chrome.runtime.lastError) {
      console.error('[globalAlertsManager] initGlobalAlertsOnInstall error:', chrome.runtime.lastError);
      return;
    }
    const toSet: Record<string, unknown> = {};
    if (!res[SETTINGS_KEY]) toSet[SETTINGS_KEY] = { ...defaultGlobalAlert };
    if (!res[TRIGGER_KEY]) toSet[TRIGGER_KEY] = { ...DEFAULT_TRIGGER };
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });
}

/**
 * 加载 settings 和 trigger 缓存，并注册 storage 监听器（只注册一次）
 * 在 content script mount 时调用一次
 */
export async function initGlobalAlertsCache(): Promise<void> {
  [_settings, _trigger] = await Promise.all([
    loadGlobalAlerts(),
    loadTriggerCount(),
  ]);

  if (_listenerRegistered) return;
  _listenerRegistered = true;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes[SETTINGS_KEY]) {
      const newVal = changes[SETTINGS_KEY].newValue as GlobalAlerts | undefined;
      _settings = newVal
        ? { bull: newVal.bull || '', bear: newVal.bear || '', step: newVal.step || '', enabled: !!newVal.enabled }
        : { ...defaultGlobalAlert, enabled: false };
    }

    if (changes[TRIGGER_KEY]) {
      const newVal = changes[TRIGGER_KEY].newValue as GlobalAlertsTrigger | undefined;
      _trigger = newVal ? { ...DEFAULT_TRIGGER, ...newVal } : { ...DEFAULT_TRIGGER };
    }
  });
}

// ─── 纯函数

/**
 * 计算衰减后的新 triggerCount（纯函数，不含 IO）
 * 规则：
 *  · 24h 未触发 → upCount = downCount = 0（优先）
 *  · 8h  未衰减 → upCount/downCount 各 -1，不能为负
 *  · 两个条件都不满足 → 返回 null（调用方跳过写入）
 */
export function calcDecay(trigger: GlobalAlertsTrigger, now: number): GlobalAlertsTrigger | null {
  const { upCount, downCount, lastTriggerAt, lastDecayAt } = trigger;

  if (lastTriggerAt > 0 && now - lastTriggerAt >= RESET_INTERVAL) {
    return { upCount: 0, downCount: 0, lastTriggerAt, lastDecayAt: now };
  }

  if (now - lastDecayAt >= DECAY_INTERVAL) {
    return { upCount: Math.max(0, upCount - 1), downCount: Math.max(0, downCount - 1), lastTriggerAt, lastDecayAt: now };
  }

  return null;
}

// ─── 对外接口

/**
 * 计算当前有效阈值（含衰减检查副作用）
 * 返回 enabled、effectiveBull、effectiveBear，供 hook 直接做比较
 */
export function getEffectiveThresholds(): {
  enabled: boolean;
  effectiveBull: number | null;
  effectiveBear: number | null;
} {
  const now = Date.now();

  const decayed = calcDecay(_trigger, now);
  if (decayed) {
    _trigger = decayed;
    saveTriggerCount(decayed);
  }

  const step = Number(_settings.step) || 0;
  const bullBase = _settings.bull ? Number(_settings.bull) : null;
  const bearBase = _settings.bear ? Number(_settings.bear) : null;

  return {
    enabled: _settings.enabled,
    effectiveBull: bullBase !== null ? bullBase + step * _trigger.upCount : null,
    effectiveBear: bearBase !== null ? bearBase + step * _trigger.downCount : null,
  };
}

/**
 * 触发通知后更新计数并写入 storage
 */
export function recordTrigger(upFired: boolean, downFired: boolean, now: number): void {
  _trigger = {
    ..._trigger,
    lastTriggerAt: now,
    upCount: upFired ? _trigger.upCount + 1 : _trigger.upCount,
    downCount: downFired ? _trigger.downCount + 1 : _trigger.downCount,
  };
  saveTriggerCount(_trigger);
}
