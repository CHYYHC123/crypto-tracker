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

/** 通知侧栏 window.close；未打开时忽略错误。切换资产类型/数据源前先调用。 */
export function closeSidePanel(): Promise<void> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'CLOSE_SIDEPANEL' }, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
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

  console.log('payload', payload);

  if (options?.viaBackground) {
    // 同步发消息，让 background 在用户手势链路内立刻 sidePanel.open
    chrome.runtime.sendMessage({ type: 'OPEN_ASSET_SIDEPANEL', payload }).catch(() => {});
    return;
  }

  // 用回调拿 windowId，避免先 await 其它 Promise 导致手势丢失
  chrome.windows.getCurrent(win => {
    if (win.id == null) return;
    void chrome.sidePanel
      .open({ windowId: win.id })
      .then(() => setSidepanelAsset(payload))
      .then(() => {
        chrome.runtime.sendMessage({ type: 'SIDEPANEL_ASSET', payload }).catch(() => {});
      })
      .catch(err => {
        console.error('[openAssetSidePanel] failed:', err);
      });
  });
}
