// GA4 Measurement Protocol
// API Secret 在 GA4 后台获取：管理 → 数据流 → Measurement Protocol API 密钥
const GA_MEASUREMENT_ID = 'G-9XVXC9CHGR';
const GA_API_SECRET = 'YOUR_API_SECRET'; // 替换为你的 API Secret

async function getClientId(): Promise<string> {
  return new Promise(resolve => {
    chrome.storage.local.get('ga_client_id', result => {
      if (result.ga_client_id) {
        resolve(result.ga_client_id as string);
      } else {
        const newId = crypto.randomUUID();
        chrome.storage.local.set({ ga_client_id: newId });
        resolve(newId);
      }
    });
  });
}

export async function trackEvent(eventName: string, params?: Record<string, unknown>) {
  try {
    const clientId = await getClientId();
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
