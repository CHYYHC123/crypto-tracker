/**
 * 跨上下文同步 i18n 语言（popup ↔ sidepanel）。
 * 语言源：chrome.storage.local.language（与主题同步方式一致）。
 */
import i18n from '@/i18n';
import { getLanguage, type AppLanguage } from '@/utils/local';

function normalizeLng(lng: string | undefined): string {
  return (lng ?? '').split('-')[0] || '';
}

function applyLanguage(lang: AppLanguage): void {
  if (normalizeLng(i18n.language) === lang) return;
  void i18n.changeLanguage(lang);
}

/** 启动时校正语言，并监听 storage 变更；返回取消监听函数 */
export function initLanguageSync(): () => void {
  getLanguage()
    .then(applyLanguage)
    .catch(() => {});

  const onStorage = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local' || !changes.language) return;
    const next = changes.language.newValue;
    if (next !== 'en' && next !== 'zh') return;
    applyLanguage(next);
  };

  chrome.storage.onChanged.addListener(onStorage);
  return () => chrome.storage.onChanged.removeListener(onStorage);
}
