import type { PriceAlert } from '@/types';

export interface ExportData {
  version: string;
  coins: string[];
  price_alerts: PriceAlert[];
  exportedAt: number;
}

/**
 * 导出币种和预警价格数据到 JSON 文件
 */
export async function exportCryptoData(): Promise<void> {
  try {
    // 获取版本号（从 manifest 中获取）
    const manifest = chrome.runtime.getManifest();
    const version = manifest.version || '0.0.0';

    // 从 chrome.storage.local 获取数据
    const result = await chrome.storage.local.get(['coins', 'price_alerts']);

    const coins = (result.coins as string[]) || [];
    const price_alerts = (result.price_alerts as PriceAlert[]) || [];

    // 构建导出数据
    const exportData: ExportData = {
      version,
      coins,
      price_alerts,
      exportedAt: Date.now()
    };

    // 转换为 JSON 字符串
    const jsonString = JSON.stringify(exportData, null, 2);

    // 创建 Blob
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crypto_tracker_token.json';

    // 触发下载
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[exportCryptoData] 导出失败:', error);
    throw error;
  }
}
