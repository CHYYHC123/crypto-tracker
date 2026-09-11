import { useEffect, useRef } from 'react';
import { showPriceUp, showPriceDown } from '@/components/CustomToaster/index';
import type { AssetItem } from '@/types/asset';
import { useCurrentAssetType } from './useCurrentAssetType';
import { useAlertConfig } from './useAlertConfig';

type AlertState = { lastTriggerTime: number };

export function usePriceAlertManager(latestTokens: AssetItem[]) {
  const assetType = useCurrentAssetType();
  const alertsMap = useAlertConfig(assetType);
  const stateRef = useRef<Map<string, AlertState>>(new Map());

  // 资产类型切换时清空触发状态，防止旧类型状态污染新类型
  const prevAssetTypeRef = useRef(assetType);
  useEffect(() => {
    if (prevAssetTypeRef.current !== assetType) {
      stateRef.current.clear();
      prevAssetTypeRef.current = assetType;
    }
  }, [assetType]);

  // 价格更新 → 检查触发条件 → 直接 showToast
  useEffect(() => {
    const relevantTokens = latestTokens.filter(t => t.category === assetType);
    if (!relevantTokens.length || !Object.keys(alertsMap).length) return;
    const now = Date.now();

    for (const token of relevantTokens) {
      if (!token.price || !token.symbol) continue;
      const symbol = token.symbol.toUpperCase();
      const alerts = alertsMap[symbol];
      if (!alerts) continue;

      for (const alert of alerts) {
        if (!alert.enabled) continue;

        const alertId = `${symbol}-${alert.targetPrice}-${alert.direction}-${alert.createdAt}`;
        const isInZone =
          alert.direction === 'above'
            ? token.price >= alert.targetPrice
            : token.price <= alert.targetPrice;

        if (!isInZone) {
          stateRef.current.delete(alertId);
          continue;
        }

        const state = stateRef.current.get(alertId);
        if (state && now - state.lastTriggerTime < 20_000) continue;

        stateRef.current.set(alertId, { lastTriggerTime: now });
        const text =
          alert.direction === 'above'
            ? `${symbol} crossed $${alert.targetPrice}`
            : `${symbol} below $${alert.targetPrice}`;
        alert.direction === 'above' ? showPriceUp(text, 5000) : showPriceDown(text, 5000);
      }
    }
  }, [latestTokens, alertsMap, assetType]);

  // alertsMap 更新时（alert 被删除），同步清理对应的 stateRef
  useEffect(() => {
    const validIds = new Set(
      Object.entries(alertsMap).flatMap(([symbol, alerts]) =>
        alerts.map(a => `${symbol}-${a.targetPrice}-${a.direction}-${a.createdAt}`)
      )
    );
    stateRef.current.forEach((_, id) => {
      if (!validIds.has(id)) stateRef.current.delete(id);
    });
  }, [alertsMap]);
}
