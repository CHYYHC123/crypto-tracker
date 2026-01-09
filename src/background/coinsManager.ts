import { defaultCoinList } from '@/config/exchangeConfig';

/**
 * Coins 管理器
 * 使用内存缓存 + 异步初始化，避免频繁读取 chrome.storage.local
 * 持久化时使用防抖，避免频繁写入（特别是 REORDER_TOKENS 场景）
 */

// 内存缓存
let cachedCoins: string[] | null = null;
// 初始化 Promise，确保只初始化一次
let initPromise: Promise<string[]> | null = null;
// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  return ((...args: Parameters<T>) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      fn(...args);
      debounceTimer = null;
    }, delay) as any;
  }) as T;
}

/**
 * 异步初始化：从 chrome.storage.local 加载 coins
 * 如果不存在，使用默认值并保存
 */
async function initializeCoins(): Promise<string[]> {
  try {
    const result = await chrome.storage.local.get(['coins']);
    const coins = result.coins as string[] | undefined;

    if (coins && Array.isArray(coins) && coins.length > 0) {
      cachedCoins = coins;
      return coins;
    }

    // 如果不存在或为空，使用默认值
    cachedCoins = defaultCoinList;
    await chrome.storage.local.set({ coins: defaultCoinList });
    return defaultCoinList;
  } catch (error) {
    console.error('[CoinsManager] 初始化失败:', error);
    // 出错时使用默认值
    cachedCoins = defaultCoinList;
    return defaultCoinList;
  }
}

/**
 * 获取 coins（优先从内存缓存读取）
 * 如果缓存未初始化，会先异步初始化
 */
export async function getCoins(): Promise<string[]> {
  // 如果缓存已存在，直接返回
  if (cachedCoins !== null) {
    return cachedCoins;
  }

  // 如果正在初始化，等待初始化完成
  if (initPromise) {
    return initPromise;
  }

  // 开始初始化
  initPromise = initializeCoins();
  return initPromise;
}

/**
 * 同步获取 coins（从内存缓存）
 * 如果缓存未初始化，返回 null
 */
export function getCoinsSync(): string[] | null {
  return cachedCoins;
}

/**
 * 设置 coins（更新内存缓存 + 持久化到 storage）
 * 持久化操作使用防抖，避免频繁写入
 */
const debouncedPersist = debounce(async (coins: string[]) => {
  try {
    await chrome.storage.local.set({ coins });
  } catch (error) {
    console.error('[CoinsManager] 持久化失败:', error);
  }
}, 300); // 300ms 防抖延迟

export async function setCoins(coins: string[]): Promise<void> {
  // 立即更新内存缓存
  cachedCoins = coins;
  // 防抖持久化
  debouncedPersist(coins);
}

/**
 * 强制立即持久化（不使用防抖）
 * 用于需要立即保存的场景
 */
export async function persistCoinsImmediately(): Promise<void> {
  // 清除防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // 立即持久化
  if (cachedCoins !== null) {
    try {
      await chrome.storage.local.set({ coins: cachedCoins });
    } catch (error) {
      console.error('[CoinsManager] 立即持久化失败:', error);
    }
  }
}

/**
 * 重置缓存（用于监听 storage 变化时同步更新）
 */
export function resetCache(): void {
  cachedCoins = null;
  initPromise = null;
}

/**
 * 监听 storage 变化，自动同步缓存
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.coins) return;

  // 如果 coins 变化了，更新缓存
  const newCoins = changes.coins.newValue as string[] | undefined;
  if (newCoins && Array.isArray(newCoins)) {
    cachedCoins = newCoins;
  } else {
    // 如果新值为空或无效，重置缓存，下次获取时会重新初始化
    resetCache();
  }
});
