// 5 秒内无 tokens 变化 → 自动触发 refresh

import { useEffect, useRef } from 'react';
export function useInactivityRefresh<T>(data: T, refreshFn: () => void, delay: number = 5000) {
  const lastUpdateRef = useRef(Date.now());
  const lastRefreshRef = useRef(0);
  // 监听数据变化
  useEffect(() => {
    // 数据变化时更新“最后更新时间”
    lastUpdateRef.current = Date.now();
  }, [data]);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = now - lastUpdateRef.current;
      // 若超过 delay 毫秒无变化 → 刷新
      if (diff >= delay) {
        // 防止频繁触发（例如被 freeze 后恢复）
        if (now - lastRefreshRef.current > delay) {
          lastRefreshRef.current = now;
          refreshFn();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [delay, refreshFn]);
}
