import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ContentMain from './views/contentMain.tsx';
import tailwindStyles from '@/assets/css/tailwindcss.css?inline';

const container = document.createElement('div');
container.id = 'shadow-content-container';
// 禁止翻译：在容器元素上添加 translate="no" 属性
container.setAttribute('translate', 'no');
container.setAttribute('data-notranslate', 'true');
document.body.appendChild(container);

const shadowRoot = container.attachShadow({ mode: 'open' });

// 先注入 tailwind 样式（必须在重置样式之前，确保 Tailwind 样式不被重置）
const styleEl = document.createElement('style');
styleEl.textContent = tailwindStyles;
shadowRoot.appendChild(styleEl);

// 创建重置样式（有选择性地重置，避免使用 all: initial 覆盖 Tailwind 样式）
const resetStyles = `
  :host {
    font-size: 16px !important;
    font-family: -apple-system, BlinkMacSystemFont, Pretendard, "Helvetica Neue", Helvetica, Arial, sans-serif !important;
    line-height: 1.5 !important;
    color: inherit !important;
    background-color: transparent !important;
    translate: no !important;
    box-sizing: border-box !important;
  }
  * {
    translate: no !important;
    box-sizing: border-box !important;
  }
`;
// 注入重置样式（在 Tailwind 之后，但只重置必要的属性）
const resetStyleEl = document.createElement('style');
resetStyleEl.textContent = resetStyles;
shadowRoot.appendChild(resetStyleEl);

// 挂载一个 div 给 React Root
const mountNode = document.createElement('div');
mountNode.style.fontSize = '16px';
// 移除 all: initial，避免覆盖 Tailwind 样式
// 禁止翻译：在挂载节点上也添加 translate="no" 属性
mountNode.setAttribute('translate', 'no');
mountNode.setAttribute('data-notranslate', 'true');
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

// 检查扩展是否可用
function checkExtensionAvailable(): boolean {
  try {
    // 检查 chrome.runtime.id 是否存在
    // console.log('chrome.runtime?.id', chrome.runtime?.id);
    if (!chrome.runtime?.id) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// 定期检查扩展状态，当扩展被移除/禁用时清理页面
function setupExtensionStatusChecker() {
  // 延迟执行，确保 service worker 已启动
  setTimeout(() => {
    // 首次检查
    if (!checkExtensionAvailable()) {
      cleanup();
      return;
    }

    // 定期检查扩展是否可用（每 2 秒检查一次）
    const checkInterval = setInterval(() => {
      if (!checkExtensionAvailable()) {
        clearInterval(checkInterval);
        cleanup();
      }
    }, 2000);

    // 也监听页面可见性变化，当页面重新可见时立即检查
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !checkExtensionAvailable()) {
        clearInterval(checkInterval);
        cleanup();
      }
    });
  }, 1000);
}

// 先渲染 React 组件
root = createRoot(mountNode);
root.render(
  <StrictMode>
    <ContentMain />
  </StrictMode>
);

// 渲染完成后再初始化扩展状态检查
setupExtensionStatusChecker();
