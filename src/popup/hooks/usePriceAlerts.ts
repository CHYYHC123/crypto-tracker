import { useState, useEffect } from 'react';
import type { PriceAlert } from '@/types/index';
import type { AssetTypes } from '@/types/asset';

// 单个资产价格预警
export function usePriceAlerts(mode: AssetTypes = 'crypto') {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const storageKey = mode === 'stocks' ? 'stocks_price_alerts' : 'price_alerts';

    const loadPriceAlerts = () => {
      chrome.storage.local.get(storageKey, res => {
        const alerts = (res[storageKey] as PriceAlert[]) || [];
        setPriceAlerts(alerts);
      });
    };
    loadPriceAlerts();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes[storageKey]) loadPriceAlerts();
    };

    const handleMessage = (msg: any) => {
      if (msg.type === 'PRICE_ALERTS_UPDATED') loadPriceAlerts();
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [mode]);

  return { priceAlerts };
}
