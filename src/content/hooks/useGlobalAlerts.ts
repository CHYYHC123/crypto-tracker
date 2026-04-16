import { useEffect, useMemo, useRef } from 'react';
import { TokenItem } from '@/types/index';
import { throttle } from '@/utils/index';
import { initGlobalAlertsCache, getEffectiveThresholds, recordTrigger } from '@/background/globalAlertsManager';

const COOLDOWN = 15 * 60 * 1000;

/**
 * useGlobalAlerts 全局预警 Hook
 * 职责：token.change 与 effectiveBull/effectiveBear 比较、冷却期管理、触发通知
 * settings 加载 / triggerCount 读写衰减 均由 globalAlertsManager 管理
 */
export function useGlobalAlerts(tokens: TokenItem[]) {
  // 记录已触发预警的币种和时间，防止短时间内重复触发
  const triggeredRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // initGlobalAlertsCache();
  }, []);

  const throttledCheck = useMemo(
    () =>
      throttle((currentTokens: TokenItem[]) => {
        if (!currentTokens.length) return;

        const { enabled, effectiveBull, effectiveBear } = getEffectiveThresholds();

        if (!enabled || (effectiveBull === null && effectiveBear === null)) return;

        const now = Date.now();
        const upTokens: string[] = [];
        const downTokens: string[] = [];

        currentTokens.forEach(token => {
          if (token.change === null || !token.symbol) return;

          const symbol = token.symbol.toUpperCase();
          if (now - (triggeredRef.current.get(symbol) || 0) < COOLDOWN) return;

          if (effectiveBull !== null && token.change >= effectiveBull) {
            upTokens.push(symbol);
            triggeredRef.current.set(symbol, now);
          } else if (effectiveBear !== null && token.change <= -effectiveBear) {
            downTokens.push(symbol);
            triggeredRef.current.set(symbol, now);
          }
        });

        if (upTokens.length > 0 || downTokens.length > 0) {
          const messages: string[] = [];
          if (upTokens.length > 0) messages.push(`🚀 Up(>${effectiveBull}%): ${upTokens.join(', ')}`);
          if (downTokens.length > 0) messages.push(`🔻 Down(<-${effectiveBear}%): ${downTokens.join(', ')}`);

          chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: 'Global Price Monitor',
              message: messages.join('\n'),
              iconUrl: chrome.runtime.getURL('/logo128.png')
            }
          });

          recordTrigger(upTokens.length > 0, downTokens.length > 0, now);
        }

        // 定期清理 triggeredRef，防止内存泄漏
        if (triggeredRef.current.size > 100) {
          for (const [symbol, time] of triggeredRef.current.entries()) {
            if (now - time > COOLDOWN) triggeredRef.current.delete(symbol);
          }
        }
      }, 3000),
    []
  );

  useEffect(() => {
    throttledCheck(tokens);
  }, [tokens, throttledCheck]);
}
