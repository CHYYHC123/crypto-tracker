import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import zh from './locales/zh';
// import { Resource } from 'i18next';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh }
    },
    load: 'languageOnly', // 它会自动截取语言代码的主干部分（zh-CN → zh，en-US → en）：
    fallbackLng: 'en', // 当检测出的语言不在 resources 中时使用的默认语言
    detection: {
      // 检查顺序：优先读取用户手动设置并缓存的值，若无则读取浏览器系统语言
      order: ['localStorage', 'navigator'],
      // 缓存用户手动切换的语言设置
      caches: ['localStorage'],
      lookupLocalStorage: 'app_user_lang'
    },
    interpolation: {
      escapeValue: false // React 已具备 XSS 防护
    }
  });

export default i18n;
