import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@/assets/css/tailwindcss.css';
createRoot(document.getElementById('crypto_tracker_root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
