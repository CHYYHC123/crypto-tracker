import { useState, useEffect } from 'react';
import { PriceAlert } from '@/types/index';

/**
 * 加载全部资产（crypto + stocks）的价格预警
 * @returns {PriceAlert[]} priceAlerts - 合并后的预警列表
 */
export function usePriceAlerts() {
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    const loadPriceAlerts = () => {
      chrome.storage.local.get(['price_alerts', 'stocks_price_alerts'], res => {
        const cryptoAlerts = (res.price_alerts as PriceAlert[]) || [];
        const stocksAlerts = (res.stocks_price_alerts as PriceAlert[]) || [];
        setPriceAlerts([...cryptoAlerts, ...stocksAlerts]);
      });
    };

    loadPriceAlerts();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && (changes.price_alerts || changes.stocks_price_alerts)) {
        loadPriceAlerts();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

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
