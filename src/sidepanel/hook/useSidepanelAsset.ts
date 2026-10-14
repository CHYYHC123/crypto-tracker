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
 * 有 openAssetSidePanel 携带参数 → 用该币种；
 * 无参数 → 取当前资产类型列表第一项；列表为空回退 BTC。
 */
export async function resolveSidepanelAsset(): Promise<SidepanelAssetPayload> {
  const carried = await getSidepanelAsset();
  if (carried?.symbol) return carried;

  const assetType = await getAssetType();
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

    resolveSidepanelAsset().then(next => {
      if (!cancelled) setAsset(next);
    });

    const onMessage = (message: { type?: string; payload?: unknown }) => {
      if (message?.type === 'SIDEPANEL_ASSET' && isPayload(message.payload)) {
        setAsset(message.payload);
      }
    };

    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes.sidepanel_asset) return;
      const next = changes.sidepanel_asset.newValue;
      if (isPayload(next)) setAsset(next);
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
