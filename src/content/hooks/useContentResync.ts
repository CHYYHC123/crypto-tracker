import { useEffect } from 'react';

/**
 * 组件挂载后延迟 3s 发送 REFRESH，确保 content script 首次加载时能拿到数据。
 * visibilitychange 已由 background onFocusChanged 统一处理，此处不再重复。
 */
export function useContentResync(): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'REFRESH' });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
}
