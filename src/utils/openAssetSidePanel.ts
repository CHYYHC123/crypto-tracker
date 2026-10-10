import type { AssetItem, SidepanelAssetPayload } from '@/types/asset';
import { setSidepanelAsset } from '@/utils/local';

export type { SidepanelAssetPayload };

/** 从 AssetItem 抽出侧边栏所需标识（id / symbol 均可区分代币） */
export function toSidepanelAssetPayload(coin: Pick<AssetItem, 'id' | 'symbol' | 'category'>): SidepanelAssetPayload {
  return {
    id: coin.id,
    symbol: coin.symbol,
    category: coin.category
  };
}

/**
 * 打开侧边栏并携带资产参数。
 * 须在用户手势（如点击）回调里调用，否则 chrome.sidePanel.open 会失败。
 */
export async function openAssetSidePanel(coin: Pick<AssetItem, 'id' | 'symbol' | 'category'>): Promise<void> {
  const payload = toSidepanelAssetPayload(coin);

  await setSidepanelAsset(payload);

  const win = await chrome.windows.getCurrent();
  if (win.id != null) {
    await chrome.sidePanel.open({ windowId: win.id });
  }

  // 侧边栏已打开时靠消息即时切换；未打开时靠 storage 首屏读取
  chrome.runtime.sendMessage({ type: 'SIDEPANEL_ASSET', payload }).catch(() => {});
}
