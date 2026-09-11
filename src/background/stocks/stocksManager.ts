/**
 * Stocks 管理器
 * 持久化时使用防抖，避免频繁写入
 * 优先从 storage 读取用户自定义列表，为空时回退到 DEFAULT_STOCKS
 */

import { DEFAULT_STOCKS } from '@/config/stocks';
import { debounce } from '@/lib/utils';

// 内存缓存
let cachedStocks: string[] | null = null;
// 初始化 Promise，确保只初始化一次
let initPromise: Promise<string[]> | null = null;

/**
 * 异步初始化：从 chrome.storage.local 加载 stocks_list
 * 如果不存在或为空，使用 DEFAULT_STOCKS 并保存
 */
async function initializeStocks(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(['stocks_list']);
    const stored = result.stocks_list as string[] | undefined;

    if (stored && Array.isArray(stored) && stored.length > 0) {
      cachedStocks = stored;
      return stored;
    }

    // 不存在或为空 → 回退到默认值并持久化
    cachedStocks = DEFAULT_STOCKS;
    await chrome.storage.local.set({ stocks_list: DEFAULT_STOCKS });
    return DEFAULT_STOCKS;
  } catch (error) {
    console.error('[StocksManager] 初始化失败:', error);
    cachedStocks = DEFAULT_STOCKS;
    return DEFAULT_STOCKS;
  }
}

/**
 * 获取 stocks（优先从内存缓存读取）
 * 如果缓存未初始化，会先异步初始化
 */
export async function getStocks(): Promise<string[]> {
  if (cachedStocks !== null) return cachedStocks;
  if (initPromise) return initPromise;

  initPromise = initializeStocks();
  return initPromise;
}

/**
 * 同步获取 stocks（从内存缓存）
 * 如果缓存未初始化，返回 null
 */
export function getStocksSync(): string[] | null {
  return cachedStocks;
}

/**
 * 设置 stocks（更新内存缓存 + 持久化到 storage）
 * 持久化操作使用防抖，避免频繁写入
 */
const debouncedPersist = debounce(async (stocks: string[]) => {
  try {
    await chrome.storage.local.set({ stocks_list: stocks });
  } catch (error) {
    console.error('[StocksManager] 持久化失败:', error);
  }
}, 300);

export async function setStocks(stocks: string[]): Promise<void> {
  cachedStocks = stocks;
  debouncedPersist(stocks);
}

/**
 * 强制立即持久化（不使用防抖）
 * 用于需要立即保存的场景
 */
export async function persistStocksImmediately(): Promise<void> {
  if (!cachedStocks) return;

  try {
    await chrome.storage.local.set({ stocks_list: cachedStocks });
  } catch (error) {
    console.error('[StocksManager] 立即持久化失败:', error);
  }
}

/**
 * 重置缓存（用于监听 storage 变化时同步更新）
 */
export function resetCache(): void {
  cachedStocks = null;
  initPromise = null;
}

/**
 * 监听 storage 变化，自动同步缓存
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.stocks_list) return;

  const newStocks = changes.stocks_list.newValue as string[] | undefined;
  if (newStocks && Array.isArray(newStocks)) {
    cachedStocks = newStocks;
  } else {
    resetCache();
  }
});
