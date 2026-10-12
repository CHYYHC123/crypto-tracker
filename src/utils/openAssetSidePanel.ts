import type { AssetItem, SidepanelAssetPayload } from '@/types/asset';
import { setSidepanelAsset } from '@/utils/local';

export type { SidepanelAssetPayload };

export interface OpenAssetSidePanelOptions {
  /** content 无 sidePanel API，经 background 打开 */
  viaBackground?: boolean;
}

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
 * viaBackground：content 同步发消息，由 background 写 storage 并 open。
 */
export async function openAssetSidePanel(
  coin: Pick<AssetItem, 'id' | 'symbol' | 'category'>,
  options?: OpenAssetSidePanelOptions
): Promise<void> {
  const payload = toSidepanelAssetPayload(coin);

  if (options?.viaBackground) {
    chrome.runtime.sendMessage({ type: 'OPEN_ASSET_SIDEPANEL', payload }).catch(() => {});
    return;
  }

  await setSidepanelAsset(payload);

  const win = await chrome.windows.getCurrent();
  if (win.id != null) {
    await chrome.sidePanel.open({ windowId: win.id });
  }

  // 侧边栏已打开时靠消息即时切换；未打开时靠 storage 首屏读取
  chrome.runtime.sendMessage({ type: 'SIDEPANEL_ASSET', payload }).catch(() => {});
}
