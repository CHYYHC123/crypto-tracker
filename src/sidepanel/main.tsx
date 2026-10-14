import '@/i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTheme } from '@/utils/theme';
import { getTheme } from '@/utils/local';
import '@/assets/css/tailwindcss.css';

// popup 关闭即销毁，无需保留取消监听函数
initTheme(document.documentElement, getTheme);

/** popup 切换资产类型 / 数据源前会先发此消息关闭侧栏 */
chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message?.type === 'CLOSE_SIDEPANEL') window.close();
});

createRoot(document.getElementById('ct_sidepanel_root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
