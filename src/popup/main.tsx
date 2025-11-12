import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PopupContent from './PopupContent';
import '@/assets/css/tailwindcss.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupContent />
  </StrictMode>
);
