import { useEffect } from 'react';

/**
 * 页面可见性恢复时向 background 发送 REFRESH，触发 WS 重连/数据同步。
 * 组件挂载后延迟 3s 也会发送一次，确保首次加载数据。
 */
export function useContentResync(): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) chrome.runtime.sendMessage({ type: 'REFRESH' });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const timer = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'REFRESH' });
    }, 3000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timer);
    };
  }, []);
}
