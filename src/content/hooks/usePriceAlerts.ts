import { useState, useEffect } from 'react';
import { PriceAlert } from '@/types/index';

/**
 * 单个币种价格预警
 * @returns {PriceAlert[]} priceAlerts - The list of price alerts
 */
export function usePriceAlerts() {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const loadPriceAlerts = () => {
      chrome.storage.local.get('price_alerts', (res) => {
        const alerts = (res.price_alerts as PriceAlert[]) || [];
        setPriceAlerts(alerts);
      });
    };

    loadPriceAlerts();

    // 监听 storage 变化
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.price_alerts) {
        loadPriceAlerts();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // 监听消息通知
    const handleMessage = (msg: any) => {
      if (msg.type === 'PRICE_ALERTS_UPDATED') loadPriceAlerts();
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  return priceAlerts;
}
