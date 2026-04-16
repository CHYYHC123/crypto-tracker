export type BadgeLevel = 'none' | 'info' | 'warning' | 'critical';

/**
 * 设置 badge 图标 和 背景色  --- 浏览器插件图标上的小红点
 * 
*/
export function setBadge(level: BadgeLevel, count?: number) {
  switch (level) {
    case 'critical':
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#e53935' });
      break;

    case 'warning':
      chrome.action.setBadgeText({ text: String(count ?? 1) });
      chrome.action.setBadgeBackgroundColor({ color: '#fb8c00' });
      break;

    case 'info':
      chrome.action.setBadgeText({ text: '•' });
      chrome.action.setBadgeBackgroundColor({ color: '#1e88e5' });
      break;

    case 'none':
    default:
      chrome.action.setBadgeText({ text: '' });
      break;
  }
}
