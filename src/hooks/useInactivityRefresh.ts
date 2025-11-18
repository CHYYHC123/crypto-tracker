import { useEffect, useRef } from 'react';

function throttle<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
}

interface Options {
  /** 返回最新渲染的数据（数组或任何对象） */
  getData: () => any;
  /** 触发刷新动作（例如通知 background） */
  onRefresh: () => void;
  /** 判断数据是否停滞的间隔（毫秒） */
  timeout?: number;
  /** 鼠标检测节流（毫秒） */
  throttleDelay?: number;
}

// 通过当前标签页用户鼠标是否活动，来判断数据是否正常接收
export function useInactivityRefresh({
  getData,
  onRefresh,
  timeout = 6000, // 数据 6秒没更新 → 认为卡住
  throttleDelay = 1200 // 鼠标移动最多 1.2 秒检查一次
}: Options) {
  const lastDataRef = useRef<any>(null);
  const lastUpdateTimeRef = useRef(Date.now());

  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  const getDataRef = useRef(getData);
  getDataRef.current = getData;

  // 每次数据变化时调用
  const updateData = () => {
    const currentData = getDataRef.current();
    if (JSON.stringify(currentData) !== JSON.stringify(lastDataRef.current)) {
      lastDataRef.current = currentData;
      lastUpdateTimeRef.current = Date.now();
    }
  };

  useEffect(() => {
    const handler = throttle(() => {
      updateData();

      const now = Date.now();
      if (now - lastUpdateTimeRef.current >= timeout) {
        // 数据超时无更新 -> 执行刷新
        refreshRef.current();
      }
    }, throttleDelay);

    window.addEventListener('mousemove', handler);

    return () => {
      window.removeEventListener('mousemove', handler);
    };
  }, [timeout, throttleDelay]);
}
