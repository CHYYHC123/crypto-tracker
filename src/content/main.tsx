import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

let root: Root | null = null;

// 清理函数：移除注入的 content 元素
function cleanup() {
  try {
    // 卸载 React 组件
    if (root) {
      root.unmount();
      root = null;
    }
    // 移除容器元素
    const existingContainer = document.getElementById('shadow-content-container');
    if (existingContainer) existingContainer.remove();
  } catch (e) {
    // 静默处理错误
  }
}

// 监听扩展连接状态，当扩展被移除/禁用时清理页面
function setupExtensionConnectionListener() {
  try {
    // 尝试与 background 建立持久连接
    const port = chrome.runtime.connect({ name: 'content-script' });

    // 当连接断开时（扩展被移除/禁用/更新），执行清理
    port.onDisconnect.addListener(() => {
      // 检查是否是因为扩展被移除
      // chrome.runtime.lastError 会在扩展不可用时设置
      if (chrome.runtime.lastError || !chrome.runtime.id) cleanup();
    });
  } catch (e) {
    // 如果连接失败，说明扩展已不可用，执行清理
    cleanup();
  }
}

// 初始化连接监听
setupExtensionConnectionListener();

root = createRoot(mountNode);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
