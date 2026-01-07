import { useState, useEffect, useRef } from 'react';
import { DataStatus } from '@/types/index';

/**
 * 监听网络数据状态的 Hook
 * - 监听 background 发送的 DATA_STATUS_CHANGE 消息
 * - 初始化时主动获取当前状态，避免错过初始状态
 * - 对于 popup，定期轮询状态（因为 popup 收不到 tabs.sendMessage 的消息）
 */
export function useDataStatus() {
  const [status, setStatus] = useState<DataStatus>(DataStatus.OFFLINE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg?.type === 'DATA_STATUS_CHANGE') {
        const nextStatus = msg.data as DataStatus;

        // 防御式校验（很重要）
        if (Object.values(DataStatus).includes(nextStatus)) {
          setStatus(nextStatus);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handler);

    // 初始化时主动获取当前状态（避免错过初始状态）
    const fetchStatus = () => {
      chrome.runtime.sendMessage({ type: 'GET_DATA_STATUS' }, response => {
        if (response?.success && response?.data) {
          const currentStatus = response.data as DataStatus;
          if (Object.values(DataStatus).includes(currentStatus)) {
            setStatus(currentStatus);
          }
        }
      });
    };

    fetchStatus();

    // 检测是否在 popup 环境中
    // popup 的 URL 通常是 chrome-extension://... 且路径包含 popup
    const isPopup = typeof window !== 'undefined' && window.location?.protocol === 'chrome-extension:' && window.location?.pathname?.includes('popup');

    // 如果是 popup 环境，定期轮询状态（每 2 秒）
    // 因为 popup 收不到 background 通过 chrome.tabs.sendMessage 发送的消息
    if (isPopup) {
      intervalRef.current = setInterval(fetchStatus, 2000);
    }

    return () => {
      chrome.runtime.onMessage.removeListener(handler);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return status;
}
