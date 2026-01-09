import { useState, useEffect } from 'react';

/**
 * 检测是否为移动端的 Hook
 * - 监听窗口大小变化
 * - 当窗口宽度 < 500px 时判定为移动端
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 500);
    };

    handleResize(); // 初始化执行一次
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

