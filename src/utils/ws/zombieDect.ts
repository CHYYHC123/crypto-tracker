// import { cryptoWsManager, stockWsManager } from '@/background/assetWsHandler';
import { getAssetLastUpdateTime } from '@/background/assetStore';
// import { getAssetType } from '@/utils/local';

import { wsManager } from '@/utils/ws/wsManager';

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 分钟

/**
 * 检测当前激活的 WS 是否处于假死状态，用于 alarm 触发时判断是否需要重连
 * 返回 true 表示需要重连
 */
export async function isWsZombie(): Promise<boolean> {
  // const assetType = await getAssetType();
  // const manager = assetType === 'stocks' ? stockWsManager : cryptoWsManager;

  if (wsManager.isConnected() || wsManager.isConnecting()) {
    const lastUpdate = getAssetLastUpdateTime();
    if (lastUpdate !== null && Date.now() - lastUpdate > STALE_THRESHOLD_MS) {
      return true;
    }
    return false;
  }

  return true;
}
