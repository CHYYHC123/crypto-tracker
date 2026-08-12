import { useEffect, useState, useRef, useCallback } from 'react';
import { showPriceUp, showPriceDown } from '@/components/CustomToaster/index';
import type { AssetItem as BaseAssetItem, } from '@/types/asset';
import type { PriceAlert } from '@/types/index';
import { useQueue } from './useQueue';
import { getPriceAlerts } from '@/utils/local';

export type AlertMessage = {
  id: string; // 唯一 ID
  symbol: string; // 币种
  text: string; // 文案
  timestamp: number; // 推送时间
};

// Chrome 消息类型定义
type ChromeMessage = { type: 'PRICE_ALERTS_UPDATED' } | { type: string; [key: string]: unknown };

export function usePriceAlertManager(latestTokens: BaseAssetItem[]) {
  // 使用 useQueue 管理队列，无需手动维护状态
  const { queue: alertQueue, addBatch, removeBatch, filter } = useQueue<AlertMessage>([]);

  const [alertsMap, setAlertsMap] = useState<Record<string, PriceAlert[]>>({});
  // 记录正在处理的消息 ID，防止并发处理同一条消息（解决 StrictMode 双重执行问题）
  const processingMsgIdsRef = useRef<Set<string>>(new Set());

  const lastPushTimeBySymbolRef = useRef<Record<string, number>>({});

  // 初始化读取 popup 本地预警配置
  const loadAlerts = useCallback(async () => {
    try {
      const priceAlerts = (await getPriceAlerts()) ?? [];
      const map: Record<string, PriceAlert[]> = {};
      const newAlertIds = new Set<string>();

      priceAlerts.forEach(alert => {
        if (!alert?.symbol || typeof alert.targetPrice !== 'number') {
          console.warn('[usePriceAlertManager] Invalid alert data:', alert);
          return;
        }

        const symbolKey = alert.symbol.toUpperCase();
        if (!map[symbolKey]) map[symbolKey] = [];
        map[symbolKey].push(alert);

        const alertId = `${symbolKey}-${alert.targetPrice}-${alert.direction}-${alert.createdAt}`;
        newAlertIds.add(alertId);
      });

      setAlertsMap(map);

      triggeredAlertsRef.current.forEach((_, id) => {
        if (!newAlertIds.has(id)) triggeredAlertsRef.current.delete(id);
      });
    } catch (error) {
      console.error('[usePriceAlertManager] Failed to load alerts:', error);
    }
  }, []);

  // 监听 PRICE_ALERTS_UPDATED 预警配置
  useEffect(() => {
    function handleMessage(msg: ChromeMessage) {
      if (msg.type === 'PRICE_ALERTS_UPDATED') loadAlerts();
    }

    loadAlerts();
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [loadAlerts]);

  // 记录已触发的预警状态：Map<alertId, { lastTriggerPrice: number, lastTriggerTime: number }>
  // 用于检测价格是否回落/回升，允许再次触发
  const triggeredAlertsRef = useRef<Map<string, { lastTriggerPrice: number; lastTriggerTime: number }>>(new Map());

  // 价格更新 -> 检查并推送消息到队列
  useEffect(() => {
    if (!latestTokens.length || Object.keys(alertsMap).length === 0) {
      return;
    }

    const now = Date.now();
    const newAlerts: AlertMessage[] = [];

    latestTokens.forEach((token: BaseAssetItem) => {
      if (!token?.price || !token?.symbol) return;

      const symbol = token.symbol.toUpperCase();
      const alerts = alertsMap[symbol];
      if (!alerts) return;

      // 👉 核心：symbol 级 20s throttle
      const lastPushTime = lastPushTimeBySymbolRef.current[symbol] || 0;
      if (now - lastPushTime < 20_000) return;

      // 过滤出触发的预警
      const validTriggeredAlerts = alerts.filter(alert => {
        if (!alert.enabled || !token.price) {
          return false;
        }

        // 使用 symbol + targetPrice + direction + createdAt 作为唯一标识
        const alertId = `${symbol}-${alert.targetPrice}-${alert.direction}-${alert.createdAt}`;
        const triggeredState = triggeredAlertsRef.current.get(alertId);

        // 检查价格是否触发预警条件
        let isTriggered = false;
        if (alert.direction === 'above') {
          isTriggered = token.price >= alert.targetPrice;
        } else if (alert.direction === 'below') {
          isTriggered = token.price <= alert.targetPrice;
        }

        if (!isTriggered) {
          // 价格未触发，但如果之前触发过，检查是否回落/回升
          if (triggeredState) {
            if (alert.direction === 'above' && token.price < triggeredState.lastTriggerPrice) {
              // 价格回落，清除标记，允许再次触发
              triggeredAlertsRef.current.delete(alertId);
            } else if (alert.direction === 'below' && token.price > triggeredState.lastTriggerPrice) {
              // 价格回升，清除标记，允许再次触发
              triggeredAlertsRef.current.delete(alertId);
            }
          }
          return false;
        }

        // 价格已触发，检查是否在冷却期内（20秒内不重复触发）
        if (triggeredState) {
          const timeSinceLastTrigger = now - triggeredState.lastTriggerTime;
          if (timeSinceLastTrigger < 20_000) {
            // 在冷却期内，不触发
            return false;
          }
        }

        return true;
      });

      if (!validTriggeredAlerts.length) return;

      // 选择最早创建的预警作为代表
      const representativeAlert = validTriggeredAlerts.sort((a, b) => a.createdAt - b.createdAt)[0];

      // 记录触发状态（价格和时间戳），用于检测回落/回升和冷却期
      const alertId = `${symbol}-${representativeAlert.targetPrice}-${representativeAlert.direction}-${representativeAlert.createdAt}`;
      triggeredAlertsRef.current.set(alertId, {
        lastTriggerPrice: token.price!,
        lastTriggerTime: now
      });

      const text = representativeAlert.direction === 'above' ? `${symbol} crossed $${representativeAlert.targetPrice}` : `${symbol} below $${representativeAlert.targetPrice}`;

      // 生成唯一 ID：使用 symbol + timestamp + 随机数，避免同一毫秒内重复
      const uniqueId = `${symbol}-${now}-${Math.random().toString(36).substr(2, 9)}`;

      newAlerts.push({
        id: uniqueId,
        symbol,
        text,
        timestamp: now
      });

      // 更新 throttle 时间戳（副作用移到 useEffect 中）
      lastPushTimeBySymbolRef.current[symbol] = now;
    });

    // 批量添加到队列（使用 useQueue 的 addBatch）
    if (newAlerts.length > 0) addBatch(newAlerts);
  }, [latestTokens, alertsMap, addBatch]);

  // 定时触发 toast（优化：支持批量处理，最多每次处理3条）
  useEffect(() => {
    const interval = setInterval(() => {
      // 找到所有未被处理的消息（最多3条）
      const pendingMsgs = alertQueue.filter(msg => !processingMsgIdsRef.current.has(msg.id)).slice(0, 3);

      if (pendingMsgs.length === 0) return;

      // 原子操作：标记为正在处理并显示 toast
      pendingMsgs.forEach(nextMsg => {
        // 立即标记为正在处理，防止并发处理（解决 StrictMode 双重执行导致的重复触发）
        processingMsgIdsRef.current.add(nextMsg.id);

        // 显示 toast
        try {
          if (nextMsg.text.includes('crossed')) {
            showPriceUp(nextMsg.text, 5000);
          } else {
            showPriceDown(nextMsg.text, 5000);
          }
        } catch (error) {
          console.error('[usePriceAlertManager] Failed to show toast:', error);
        }

        // 从处理集合中移除
        processingMsgIdsRef.current.delete(nextMsg.id);
      });

      // 批量移除已处理的消息（使用 useQueue 的 removeBatch）
      const processedIds = new Set(pendingMsgs.map(msg => msg.id));
      removeBatch(processedIds, msg => msg.id);
    }, 20_000);

    return () => clearInterval(interval);
  }, [alertQueue, removeBatch]);

  // 定期清理过期的未触发消息和无效引用，避免内存泄漏
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // 使用 useQueue 的 filter 方法清理过期消息
      // 在 filter 回调中同步清理 processingMsgIdsRef
      filter(msg => {
        const isValid = msg.timestamp > oneHourAgo;
        if (!isValid) {
          // 同步清理 processingMsgIdsRef
          processingMsgIdsRef.current.delete(msg.id);
        }
        return isValid;
      });

      // 清理 lastPushTimeBySymbolRef 中不存在的 symbol
      const validSymbols = new Set(Object.keys(alertsMap));
      Object.keys(lastPushTimeBySymbolRef.current).forEach(symbol => {
        if (!validSymbols.has(symbol)) {
          delete lastPushTimeBySymbolRef.current[symbol];
        }
      });

      // 清理 triggeredAlertIdsRef 中过期的 ID（超过1小时）
      // 注意：这里需要根据实际需求调整，如果预警被删除，对应的 ID 也应该清理
      // 但由于我们无法直接知道哪些预警被删除了，所以保留这个清理逻辑
      // 可以考虑在 loadAlerts 时同步清理
    }, 5 * 60 * 1000); // 每 5 分钟清理一次

    return () => clearInterval(cleanupInterval);
  }, [alertsMap, alertQueue, filter]);

  // 手动清除某个币种未触发消息（使用 useQueue 的 filter）
  const clearCoinAlerts = useCallback(
    (symbol: string) => {
      filter(msg => msg.symbol !== symbol.toUpperCase());
    },
    [filter]
  );

  return {
    alertQueue,
    clearCoinAlerts
  };
}
