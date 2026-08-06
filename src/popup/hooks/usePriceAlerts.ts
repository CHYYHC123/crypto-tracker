import { useState, useEffect } from 'react';
import type { PriceAlert } from '@/types/index';

export function usePriceAlerts() {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  useEffect(() => {
    const loadPriceAlerts = () => {
      chrome.storage.local.get('price_alerts', res => {
        const alerts = (res.price_alerts as PriceAlert[]) || [];
        setPriceAlerts(alerts);
      });
    };
    loadPriceAlerts();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.price_alerts) loadPriceAlerts();
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
  }, []);

  return { priceAlerts };
}
