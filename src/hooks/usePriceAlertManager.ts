import { useEffect, useState, useRef, useCallback } from 'react';
import { showPriceUp, showPriceDown } from '@/components/CustomToaster/index';
import type { TokenItem as BaseTokenItem, PriceAlert } from '@/types/index';

export type AlertMessage = {
  id: string; // 唯一 ID
  symbol: string; // 币种
  text: string; // 文案
  timestamp: number; // 推送时间
  triggered?: boolean; // 是否已触发 toast
};

// 扩展 TokenItem，加 alert 信息
export type TokenItemWithAlert = BaseTokenItem & {
  alert?: {
    above?: number;
    below?: number;
  };
};

export function usePriceAlertManager(latestTokens: BaseTokenItem[]) {
  const [alertQueue, setAlertQueue] = useState<AlertMessage[]>([]);
  const [alertsMap, setAlertsMap] = useState<Record<string, PriceAlert[]>>({});
  // 使用 alertKey (symbol-targetPrice-direction) 作为 key，支持同一币种多个预警独立防抖
  const lastPushTimeRef = useRef<Record<string, number>>({});
  // 记录已触发的预警，避免重复触发
  const triggeredAlertsRef = useRef<Set<string>>(new Set());
  // 记录正在处理的消息 ID，防止并发处理同一条消息（解决 StrictMode 双重执行问题）
  const processingMsgIdsRef = useRef<Set<string>>(new Set());

  // 初始化读取 popup 本地预警配置
  const loadAlerts = useCallback(() => {
    chrome.storage.local.get('price_alerts', res => {
      const priceAlerts = (res.price_alerts as PriceAlert[]) || [];
      console.log('priceAlerts', priceAlerts);
      const map: Record<string, PriceAlert[]> = {};
      priceAlerts?.forEach(alert => {
        if (!map[alert.symbol]) map[alert.symbol] = [];
        map[alert.symbol].push(alert);
      });
      setAlertsMap(map);
      // 重置已触发记录，因为配置可能已改变
      triggeredAlertsRef.current.clear();
    });
  }, []);

  // 监听 popup 修改预警配置
  useEffect(() => {
    function handleMessage(msg: any) {
      if (msg.type === 'PRICE_ALERTS_UPDATED') loadAlerts();
    }
    loadAlerts();
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [loadAlerts]);

  // 价格更新 -> 推送消息到队列
  useEffect(() => {
    // 修复：检查对象是否为空，空对象 {} 是 truthy，需要检查 keys 长度
    if (!latestTokens.length || Object.keys(alertsMap).length === 0) return;

    // 遍历 token
    latestTokens?.forEach((token: BaseTokenItem) => {
      // 获取预警币种
      const alerts = alertsMap[token.symbol];
      console.log('alerts', alerts);

      if (!alerts || !token.price) return;

      const now = Date.now();

      alerts?.forEach(alert => {
        if (!alert.enabled || !token?.price) return;

        const crossedAbove = alert.direction === 'above' && token?.price >= alert.targetPrice;
        const crossedBelow = alert.direction === 'below' && token?.price <= alert.targetPrice;

        if (crossedAbove || crossedBelow) {
          // 使用 alertKey 来唯一标识每个预警（symbol-targetPrice-direction）
          const alertKey = `${token.symbol}-${alert.targetPrice}-${alert.direction}`;

          // 检查是否已经触发过（避免重复触发）
          if (triggeredAlertsRef.current.has(alertKey)) return;

          // 检查防抖：同一预警 60 秒内只触发一次
          const lastPush = lastPushTimeRef.current[alertKey] || 0;
          const diff = now - lastPush;

          if (diff > 60_000) {
            setAlertQueue(prev => [
              ...prev,
              {
                id: `${token.symbol}-${alert.targetPrice}-${alert.direction}-${now}`,
                symbol: token.symbol,
                text: crossedAbove ? `${token.symbol} crossed $${alert.targetPrice}` : `${token.symbol} below $${alert.targetPrice}`,
                timestamp: now
              }
            ]);
            lastPushTimeRef.current[alertKey] = now;
            // 标记为已触发，避免重复添加
            triggeredAlertsRef.current.add(alertKey);
          }
        } else {
          // 价格不再满足条件时，重置触发状态，允许下次触发
          const alertKey = `${token.symbol}-${alert.targetPrice}-${alert.direction}`;
          triggeredAlertsRef.current.delete(alertKey);
        }
      });
    });
  }, [latestTokens, alertsMap]);

  // 定时触发 toast
  useEffect(() => {
    const interval = setInterval(() => {
      setAlertQueue(prevQueue => {
        // 找到第一个未被处理的消息
        const nextMsg = prevQueue.find(msg => !processingMsgIdsRef.current.has(msg.id));

        if (nextMsg) {
          // 立即标记为正在处理，防止并发处理（解决 StrictMode 双重执行导致的重复触发）
          processingMsgIdsRef.current.add(nextMsg.id);

          // 显示 toast
          if (nextMsg.text.includes('crossed')) {
            showPriceUp(nextMsg.text, 5000);
          } else {
            showPriceDown(nextMsg.text, 5000);
          }

          // 从处理集合中移除
          processingMsgIdsRef.current.delete(nextMsg.id);

          // 立即从队列中移除已触发的消息，而不是保留它
          return prevQueue.filter(msg => msg.id !== nextMsg.id);
        }
        return prevQueue;
      });
    }, 20_000);
    return () => clearInterval(interval);
  }, []);

  // 定期清理过期的未触发消息，避免内存泄漏
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setAlertQueue(prev => {
        // 只保留最近 1 小时内的未触发消息（已触发的消息会在触发时立即移除）
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        const filtered = prev.filter(msg => msg.timestamp > oneHourAgo);

        // 同步清理 processingMsgIdsRef，移除已删除消息的 ID
        const remainingIds = new Set(filtered.map(msg => msg.id));
        processingMsgIdsRef.current.forEach(id => {
          if (!remainingIds.has(id)) {
            processingMsgIdsRef.current.delete(id);
          }
        });

        return filtered;
      });
    }, 5 * 60 * 1000); // 每 5 分钟清理一次

    return () => clearInterval(cleanupInterval);
  }, []);

  // 手动清除某个币种未触发消息
  const clearCoinAlerts = useCallback((symbol: string) => {
    setAlertQueue(prev => prev.filter(msg => msg.symbol !== symbol));
  }, []);

  return {
    alertQueue,
    clearCoinAlerts
  };
}
