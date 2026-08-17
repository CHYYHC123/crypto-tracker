/**
 * @fileoverview [Storage 默认值初始化]
 * 职责：在 extension 首次安装/更新时，统一检查并写入所有缺失的默认值。
 *
 * 扩展方式：新增默认 key 只需在 APP_DEFAULTS 添加一行。
 */

import type { AssetTypes } from '@/types/index';
import { defaultCoinList, defaultDataSource, defaultGlobalAlert } from '@/config/exchangeConfig';
import { DEFAULT_TRIGGER } from '@/background/globalAlertsManager';

const APP_DEFAULTS = {
  data_source: defaultDataSource,
  asset_type: 'crypto' as AssetTypes,
  coins: defaultCoinList,
  global_alerts: defaultGlobalAlert,
  global_alerts_trigger: DEFAULT_TRIGGER
};

export async function initDefaultStorage(): Promise<void> {
  const keys = Object.keys(APP_DEFAULTS);
  const existing = await chrome.storage.local.get(keys);

  const toSet: Record<string, unknown> = {};
  for (const key of keys) {
    const val = existing[key];
    if (val === undefined || val === null) {
      toSet[key] = APP_DEFAULTS[key as keyof typeof APP_DEFAULTS];
    }
  }

  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
    console.log('[initDefaultStorage] 写入缺失的默认值:', Object.keys(toSet));
  }
}
