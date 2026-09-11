import { useState, useEffect, useCallback } from 'react';
import type { AssetTypes } from '@/types/index';
import type { PriceAlert } from '@/types/index';
import { getPriceAlerts, getStocksPriceAlerts } from '@/utils/local';

type ChromeMessage = { type: string; [key: string]: unknown };

/**
 * 按资产类型加载对应的预警配置。
 * assetType 变化时自动重新加载，只加载当前类型的 alert（crypto 或 stocks）。
 */
export function useAlertConfig(assetType: AssetTypes): Record<string, PriceAlert[]> {
  const [alertsMap, setAlertsMap] = useState<Record<string, PriceAlert[]>>({});

  const load = useCallback(async () => {
    const raw = assetType === 'stocks' ? await getStocksPriceAlerts() : await getPriceAlerts();

    const map: Record<string, PriceAlert[]> = {};
    (raw ?? []).forEach(alert => {
      if (!alert?.symbol || typeof alert.targetPrice !== 'number') return;
      const key = alert.symbol.toUpperCase();
      (map[key] ??= []).push(alert);
    });
    setAlertsMap(map);
  }, [assetType]);

  useEffect(() => {
    load();
    const handler = (msg: ChromeMessage) => {
      if (msg.type === 'PRICE_ALERTS_UPDATED') load();
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [load]);

  return alertsMap;
}
