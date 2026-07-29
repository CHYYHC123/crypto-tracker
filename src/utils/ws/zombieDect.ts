import { wsManager } from '@/background/wsHandler';
import { getLastUpdateTime } from '@/background/tokenStore';

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 分钟

/**
 * 检测 WS 是否处于假死状态，用于 alarm 触发时判断是否需要重连
 * 返回 true 表示需要重连
 */
export function isWsZombie(): boolean {
  // 第二层：WS 状态显示连接，但业务数据长时间没更新 → 假死
  if (wsManager.isConnected() || wsManager.isConnecting()) {
    const lastUpdate = getLastUpdateTime();
    // lastUpdate 为 null：WS 刚连上还没推过数据，属正常窗口期，不误判
    if (lastUpdate !== null && Date.now() - lastUpdate > STALE_THRESHOLD_MS) {
      return true;
    }
    return false; // 真正健康
  }

  // 第三层：WS 状态本身就是断开的（兜底）
  return true;
}
