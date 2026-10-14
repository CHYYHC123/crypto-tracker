/**
 * @fileoverview [主题接线]
 * 职责：把主题标识写到目标根元素上，CSS 变量由 assets/css/tailwindcss.css 的
 * `:root[data-theme=...]` / `:host([data-theme=...])` 提供。
 *
 * 约束：本文件会被 background 间接引入（initDefaultStorage），
 * 因此模块顶层不能执行任何 DOM 代码，根元素一律由调用方传入。
 */

export const THEME_ATTR = 'data-theme';

export type ThemeId = 'ct-default' | 'ct-dark' | 'ct-light';

/** 'ct-default' 表示跟随系统，写入 DOM 前必须先 resolve，否则会落到基础暗色变量 */
export const DEFAULT_THEME: ThemeId = 'ct-dark';

export const THEME_IDS: ThemeId[] = ['ct-dark', 'ct-default', 'ct-light'];

/**
 * 解析存储值到实际应用的 ThemeId。
 * ct-default 代表"跟随系统"，运行时根据 OS prefers-color-scheme 返回
 * ct-dark（深色）或 ct-light（浅色）。
 *
 * ⚠️ 仅在 popup / content script 等有 DOM 的上下文中调用，
 * background service worker 中不可调用（无 window 对象）。
 */
export function resolveTheme(theme: ThemeId): ThemeId {
  if (theme !== 'ct-default') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ct-dark' : 'ct-light';
}

/** 把主题写到目标根元素：popup 传 documentElement，content 传 shadow host */
export function applyTheme(theme: ThemeId, el: Element): void {
  el.setAttribute(THEME_ATTR, resolveTheme(theme));
}

/**
 * 监听 storage 与系统配色变更，跨上下文同步；返回取消监听函数。
 * getStored / setStored 用于维护「存储偏好」（可含 ct-default），
 * 以便 OS 配色变化时正确 re-resolve。
 */
export function watchTheme(
  el: Element,
  getStored: () => ThemeId,
  setStored?: (theme: ThemeId) => void
): () => void {
  const onStorage = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local' || !changes.theme) return;
    const next = changes.theme.newValue as ThemeId | undefined;
    if (!next) return;
    setStored?.(next);
    applyTheme(next, el);
  };

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const onSchemeChange = () => {
    if (getStored() === 'ct-default') applyTheme('ct-default', el);
  };

  chrome.storage.onChanged.addListener(onStorage);
  mql.addEventListener('change', onSchemeChange);

  return () => {
    chrome.storage.onChanged.removeListener(onStorage);
    mql.removeEventListener('change', onSchemeChange);
  };
}

/**
 * 入口统一调用：先同步写默认值避免首帧闪色，再用存储值纠正，并开始监听。
 * getTheme 由调用方注入，避免与 utils/local 形成循环依赖。
 */
export function initTheme(el: Element, getTheme: () => Promise<ThemeId>): () => void {
  let stored: ThemeId = DEFAULT_THEME;
  applyTheme(stored, el);

  getTheme()
    .then(theme => {
      stored = theme;
      applyTheme(theme, el);
    })
    .catch(() => {});

  return watchTheme(
    el,
    () => stored,
    theme => {
      stored = theme;
    }
  );
}
