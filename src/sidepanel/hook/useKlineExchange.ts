import { useEffect, useState } from 'react';
import { defaultDataSource, Exchange, type ExchangeType } from '@/config/exchangeConfig';
import { getAssetType, getDataSource } from '@/utils/local';
import type { AssetTypes } from '@/types/index';

function resolveExchange(assetType: AssetTypes, dataSource: ExchangeType): ExchangeType {
  return assetType === 'stocks' ? Exchange.BNStock : dataSource;
}

/**
 * 侧边栏 K 线所用交易所：
 * - stocks → BNStock
 * - crypto → local data_source
 * 监听 asset_type / data_source 变化。
 * null 表示尚未从 storage 读完，避免用 defaultDataSource 触发错误的首次请求。
 */
export function useKlineExchange(): ExchangeType | null {
  const [exchange, setExchange] = useState<ExchangeType | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAssetType(), getDataSource()]).then(([assetType, dataSource]) => {
      if (!cancelled) setExchange(resolveExchange(assetType, dataSource));
    });

    const onStorage = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;
      if (!changes.asset_type && !changes.data_source) return;

      void (async () => {
        const assetType = changes.asset_type
          ? ((changes.asset_type.newValue as AssetTypes | undefined) ?? 'crypto')
          : await getAssetType();
        const dataSource = changes.data_source
          ? ((changes.data_source.newValue as ExchangeType | undefined) ?? defaultDataSource)
          : await getDataSource();
        if (!cancelled) setExchange(resolveExchange(assetType, dataSource));
      })();
    };

    chrome.storage.onChanged.addListener(onStorage);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onStorage);
    };
  }, []);

  return exchange;
}
