import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import type { AssetItem } from '@/types/asset';
import type { Direction } from '@/types';

import { getPriceAlerts, setPriceAlerts, getStocksPriceAlerts, setStocksPriceAlerts } from '@/utils/local';

// 初始价格预警表单
export function useAlertForm(open: boolean, token: AssetItem | null, onClose: () => void) {
  const [price, setPrice] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [direction, setDirection] = useState<Direction>('above');

  const isStock = token?.category === 'stocks';
  const getter = isStock ? getStocksPriceAlerts : getPriceAlerts;
  const setter = isStock ? setStocksPriceAlerts : setPriceAlerts;

  useEffect(() => {
    if (!open || !token) return;
    const loadAlert = async () => {
      const alerts = (await getter()) ?? [];
      const current = alerts.find(item => item.symbol.toUpperCase() === token.symbol.toUpperCase());

      setPrice(current?.targetPrice ?? token.price ?? 0);
      setDirection(current?.direction ?? 'above');
      setEnabled(current?.enabled ?? true);
    };
    loadAlert();
  }, [open, token]);

  // 保存逻辑
  const handleSave = async () => {
    if (!token) return;

    try {
      const oldAlerts = (await getter()) ?? [];
      const targetSymbol = token.symbol.toUpperCase();
      const now = Date.now();
      let exists = false;

      // 单次遍历完成查找与更新
      const updatedAlerts = oldAlerts.map(item => {
        if (item.symbol.toUpperCase() === targetSymbol) {
          exists = true;
          return {
            ...item,
            targetPrice: price,
            direction,
            enabled,
            updatedAt: now
          };
        }
        return item;
      });

      // 若未命中，延迟创建并追加新对象
      if (!exists) {
        updatedAlerts.push({
          symbol: token.symbol,
          targetPrice: price,
          direction,
          enabled,
          createdAt: now,
          updatedAt: now
        });
      }

      await setter(updatedAlerts);
      toast.success(`Price alert set for ${token.symbol}`);
      onClose();
    } catch {
      toast.error('Failed to save price alert');
    }
  };

  return { price, setPrice, direction, setDirection, enabled, setEnabled, handleSave };
}
