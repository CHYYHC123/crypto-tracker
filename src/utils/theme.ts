/**
 * @fileoverview [主题接线]
 * 职责：把主题标识写到目标根元素上，CSS 变量由 assets/css/tailwindcss.css 的
 * `:root[data-theme=...]` / `:host([data-theme=...])` 提供。
 *
 * 约束：本文件会被 background 间接引入（initDefaultStorage），
 * 因此模块顶层不能执行任何 DOM 代码，根元素一律由调用方传入。
 */

export const THEME_ATTR = 'data-theme';

export type ThemeId = 'ct-default' | 'ct-ocean' | 'ct-light';

/** 'ct-default' 在 CSS 中无对应选择器，会落到基础 `:root, :host` 的变量上 */
export const DEFAULT_THEME: ThemeId = 'ct-light';

export const THEME_IDS: ThemeId[] = ['ct-default', 'ct-ocean', 'ct-light'];

/** 把主题写到目标根元素：popup 传 documentElement，content 传 shadow host */
export function applyTheme(theme: ThemeId, el: Element): void {
  el.setAttribute(THEME_ATTR, theme);
}

/** 监听 storage 变更，跨上下文同步；返回取消监听函数 */
export function watchTheme(el: Element): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local' || !changes.theme) return;

    const next = changes.theme.newValue as ThemeId | undefined;
    if (next) applyTheme(next, el);
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

/**
 * 入口统一调用：先同步写默认值避免首帧闪色，再用存储值纠正，并开始监听。
 * getTheme 由调用方注入，避免与 utils/local 形成循环依赖。
 */
export function initTheme(el: Element, getTheme: () => Promise<ThemeId>): () => void {
  applyTheme(DEFAULT_THEME, el);

  getTheme()
    .then(theme => applyTheme(theme, el))
    .catch(() => {});

  return watchTheme(el);
}
