import { useEffect, useState } from 'react';
import type { SidepanelAssetPayload } from '@/types/asset';
import { getAssetType, getCoinsFromStorage, getSidepanelAsset, getStocksList, clearSidepanelAsset } from '@/utils/local';

const FALLBACK: SidepanelAssetPayload = { id: 'btc', symbol: 'BTC', category: 'crypto' };

function isPayload(v: unknown): v is SidepanelAssetPayload {
  if (!v || typeof v !== 'object') return false;
  const o = v as SidepanelAssetPayload;
  return typeof o.id === 'string' && typeof o.symbol === 'string' && (o.category === 'crypto' || o.category === 'stocks');
}

/**
 * 有 openAssetSidePanel 携带参数，且类别与当前资产类型一致 → 用该标的；
 * 类别不一致（例如从加密货币切到股票后残留的 HYPE）或无参数 → 取当前列表第一项；
 * 列表为空回退 BTC。
 */
export async function resolveSidepanelAsset(): Promise<SidepanelAssetPayload> {
  const [carried, assetType] = await Promise.all([getSidepanelAsset(), getAssetType()]);
  if (carried?.symbol && carried.category === assetType) return carried;

  if (assetType === 'stocks') {
    const list = await getStocksList();
    const symbol = list?.[0];
    if (symbol) return { id: symbol.toLowerCase(), symbol, category: 'stocks' };
  } else {
    const list = await getCoinsFromStorage();
    const symbol = list?.[0]?.symbol;
    if (symbol) return { id: symbol.toLowerCase(), symbol, category: 'crypto' };
  }

  return FALLBACK;
}

/**
 * 侧边栏当前资产：首屏 resolve；运行时 SIDEPANEL_ASSET / storage 变化时替换；
 * 关闭页时清除 storage，下次无参打开走「列表第一项」。
 * null 表示尚未从 storage 读完，避免用 FALLBACK(BTC) 触发错误的首次请求。
 */
export function useSidepanelAsset(): SidepanelAssetPayload | null {
  const [asset, setAsset] = useState<SidepanelAssetPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 后到的打开参数 / storage 写入使更早的 resolve 失效，避免旧标的盖回新标的
    let seq = 0;

    const apply = (next: SidepanelAssetPayload, token: number) => {
      if (cancelled || token !== seq) return;
      setAsset(next);
    };

    const load = () => {
      const token = ++seq;
      resolveSidepanelAsset().then(next => apply(next, token));
    };

    load();

    const onMessage = (message: { type?: string; payload?: unknown }) => {
      if (message?.type === 'SIDEPANEL_ASSET' && isPayload(message.payload)) {
        const token = ++seq;
        apply(message.payload, token);
      }
    };

    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;

      if (changes.sidepanel_asset) {
        const next = changes.sidepanel_asset.newValue;
        if (isPayload(next)) {
          const token = ++seq;
          apply(next, token);
          return;
        }
        // 切换资产类型时会清掉残留标的，按当前列表重新解析
        load();
        return;
      }

      if (changes.asset_type) load();
    };

    const onPageHide = () => {
      void clearSidepanelAsset();
    };

    chrome.runtime.onMessage.addListener(onMessage);
    chrome.storage.onChanged.addListener(onStorage);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.storage.onChanged.removeListener(onStorage);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, []);

  return asset;
}
