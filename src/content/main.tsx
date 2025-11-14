import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './views/App.tsx';
import tailwindStyles from '@/assets/css/tailwindcss.css?inline';

const container = document.createElement('div');
container.id = 'shadow-content-container';
document.body.appendChild(container);

const shadowRoot = container.attachShadow({ mode: 'open' });
// 创建重置样式
const resetStyles = `
  :host {
    font-size: 16px !important;
    all: initial;
  }
`;
// 注入重置样式
const resetStyleEl = document.createElement('style');
resetStyleEl.textContent = resetStyles;
shadowRoot.appendChild(resetStyleEl);

// 注入 tailwind 样式
const styleEl = document.createElement('style');
styleEl.textContent = tailwindStyles;
shadowRoot.appendChild(styleEl);

// 挂载一个 div 给 React Root
const mountNode = document.createElement('div');
mountNode.style.fontSize = '16px';
mountNode.style.all = 'initial';
shadowRoot.appendChild(mountNode);

createRoot(mountNode).render(
  <StrictMode>
    <App />
  </StrictMode>
);
