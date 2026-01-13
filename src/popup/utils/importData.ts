import type { PriceAlert } from '@/types';
import { toast } from 'react-hot-toast';

export interface ImportData {
  coins?: string[];
  price_alerts?: PriceAlert[];
  [key: string]: unknown; // 允许其他字段存在
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: {
    coins?: string[];
    price_alerts?: PriceAlert[];
  };
}

/**
 * 验证导入的 JSON 数据
 */
export function validateImportData(data: unknown): ValidationResult {
  // 检查是否为对象
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      error: 'Invalid file format: JSON must be an object'
    };
  }

  const importData = data as ImportData;
  const hasCoins = 'coins' in importData;
  const hasPriceAlerts = 'price_alerts' in importData;

  // 检查是否至少有一个字段存在
  if (!hasCoins && !hasPriceAlerts) {
    return {
      valid: false,
      error: 'Invalid file: File must contain at least one of "coins" or "price_alerts" fields'
    };
  }

  const result: ValidationResult['data'] = {};

  // 验证 coins 字段
  if (hasCoins) {
    if (!Array.isArray(importData.coins)) {
      return {
        valid: false,
        error: 'Invalid field type: "coins" must be an array'
      };
    }
    // 验证数组中的每个元素是否为字符串
    if (importData.coins.some(coin => typeof coin !== 'string')) {
      return {
        valid: false,
        error: 'Invalid field type: All items in "coins" must be strings'
      };
    }
    result.coins = importData.coins;
  }

  // 验证 price_alerts 字段
  if (hasPriceAlerts) {
    if (!Array.isArray(importData.price_alerts)) {
      return {
        valid: false,
        error: 'Invalid field type: "price_alerts" must be an array'
      };
    }
    // 验证数组中的每个元素是否符合 PriceAlert 类型
    for (let i = 0; i < importData.price_alerts.length; i++) {
      const alert = importData.price_alerts[i];
      if (!alert || typeof alert !== 'object') {
        return {
          valid: false,
          error: `Invalid field type: "price_alerts[${i}]" must be an object`
        };
      }
      // 检查必需字段
      if (typeof alert.symbol !== 'string') {
        return {
          valid: false,
          error: `Invalid field type: "price_alerts[${i}].symbol" must be a string`
        };
      }
      if (typeof alert.targetPrice !== 'number') {
        return {
          valid: false,
          error: `Invalid field type: "price_alerts[${i}].targetPrice" must be a number`
        };
      }
      if (alert.direction !== 'above' && alert.direction !== 'below') {
        return {
          valid: false,
          error: `Invalid field type: "price_alerts[${i}].direction" must be "above" or "below"`
        };
      }
      if (typeof alert.enabled !== 'boolean') {
        return {
          valid: false,
          error: `Invalid field type: "price_alerts[${i}].enabled" must be a boolean`
        };
      }
      if (typeof alert.createdAt !== 'number') {
        return {
          valid: false,
          error: `Invalid field type: "price_alerts[${i}].createdAt" must be a number`
        };
      }
      if (typeof alert.updatedAt !== 'number') {
        return {
          valid: false,
          error: `Invalid field type: "price_alerts[${i}].updatedAt" must be a number`
        };
      }
    }
    result.price_alerts = importData.price_alerts as PriceAlert[];
  }

  // 检查两个字段是否都为空数组
  const coinsEmpty = hasCoins && result.coins?.length === 0;
  const priceAlertsEmpty = hasPriceAlerts && result.price_alerts?.length === 0;
  if (coinsEmpty && priceAlertsEmpty) {
    return {
      valid: false,
      error: 'Invalid file: Both "coins" and "price_alerts" cannot be empty arrays'
    };
  }

  return {
    valid: true,
    data: result
  };
}

/**
 * 读取并解析 JSON 文件
 */
export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        resolve(json);
      } catch (error) {
        reject(new Error('Failed to parse JSON file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

/**
 * 导入币种和预警价格数据
 */
export async function importCryptoData(file: File): Promise<void> {
  try {
    // 读取文件
    const jsonData = await readJsonFile(file);

    // 验证数据
    const validation = validateImportData(jsonData);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file format');
      throw new Error(validation.error);
    }

    if (!validation.data) {
      toast.error('No valid data to import');
      throw new Error('No valid data to import');
    }

    // 获取当前已有的数据
    const currentData = await chrome.storage.local.get(['coins', 'price_alerts']);
    const currentCoins = (currentData.coins as string[]) || [];
    const currentPriceAlerts = (currentData.price_alerts as PriceAlert[]) || [];

    // 导入数据到 chrome.storage.local
    const updates: { coins?: string[]; price_alerts?: PriceAlert[] } = {};

    // 1. 合并 coins 并去重
    if (validation.data.coins !== undefined) {
      // 合并当前和导入的币种
      const mergedCoins = [...currentCoins, ...validation.data.coins];
      // 去重（保持顺序，保留第一次出现的）
      const importedCoins = validation.data.coins;
      const uniqueCoins = Array.from(new Set(mergedCoins.map(coin => coin.toUpperCase()))).map(coin => {
        // 找到原始大小写的币种（优先使用导入的）
        const importedCoin = importedCoins.find(c => c.toUpperCase() === coin);
        return importedCoin || currentCoins.find(c => c.toUpperCase() === coin) || coin;
      });
      updates.coins = uniqueCoins;
    }

    // 2. 合并 price_alerts 并去重，导入的优先级更高
    if (validation.data.price_alerts !== undefined) {
      const importedPriceAlerts = validation.data.price_alerts;
      // 获取导入的预警价格中所有的 symbol（转为大写）
      const importedSymbols = new Set(importedPriceAlerts.map(alert => alert.symbol.toUpperCase()));

      // 从本地的预警价格中过滤掉导入的 symbol（以导入的为主，完全替换）
      const filteredCurrentAlerts = currentPriceAlerts.filter(alert => !importedSymbols.has(alert.symbol.toUpperCase()));

      // 合并：先保留本地未被覆盖的，再添加导入的
      const mergedAlerts = [...filteredCurrentAlerts, ...importedPriceAlerts];

      // 去重：基于 symbol + targetPrice + direction + createdAt 作为唯一标识
      // 如果存在相同的 key，保留后添加的（即导入的）
      const alertMap = new Map<string, PriceAlert>();
      mergedAlerts.forEach(alert => {
        const key = `${alert.symbol.toUpperCase()}-${alert.targetPrice}-${alert.direction}-${alert.createdAt}`;
        // 后添加的会覆盖先添加的，所以导入的会覆盖本地的
        alertMap.set(key, alert);
      });

      updates.price_alerts = Array.from(alertMap.values());
    }

    await chrome.storage.local.set(updates);

    // 显示成功提示
    const importedFields = [];
    if (validation.data.coins !== undefined) {
      importedFields.push(`${validation.data.coins.length} coins`);
    }
    if (validation.data.price_alerts !== undefined) {
      importedFields.push(`${validation.data.price_alerts.length} price alerts`);
    }
    toast.success(`Successfully imported: ${importedFields.join(', ')}`);
  } catch (error) {
    if (error instanceof Error && error.message !== 'Invalid file format' && error.message !== 'No valid data to import') {
      toast.error(error.message || 'Failed to import data');
    }
    throw error;
  }
}

/**
 * 选择文件并导入
 */
export function selectAndImportFile(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        await importCryptoData(file);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    input.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };
    input.click();
  });
}
