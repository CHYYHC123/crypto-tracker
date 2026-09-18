import '@/i18n';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTheme } from '@/utils/theme';
import { getTheme } from '@/utils/local';
import '@/assets/css/tailwindcss.css';

// popup 关闭即销毁，无需保留取消监听函数
initTheme(document.documentElement, getTheme);

createRoot(document.getElementById('crypto_tracker_root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
