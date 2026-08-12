// GA4 Measurement Protocol
// API Secret 在 GA4 后台获取：管理 → 数据流 → Measurement Protocol API 密钥
const GA_MEASUREMENT_ID = 'G-9XVXC9CHGR';
const GA_API_SECRET = 'YOUR_API_SECRET'; // 替换为你的 API Secret

import { getGaClientId } from '@/utils/local';

export async function trackEvent(eventName: string, params?: Record<string, unknown>) {
  try {
    const clientId = await getGaClientId();
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          events: [{ name: eventName, params: params ?? {} }],
        }),
      }
    );
  } catch {
    // 静默处理，不影响主功能
  }
}
