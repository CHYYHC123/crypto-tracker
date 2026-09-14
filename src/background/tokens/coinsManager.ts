/**
 * Coins 管理器
 * 持久化时使用防抖，避免频繁写入（特别是 REORDER_TOKENS 场景）
 *
 * 存储格式：CoinRecord[]
 * 兼容旧格式：检测到 string[] 时自动迁移
 */

import { defaultCoinList } from '@/config/exchangeConfig';
import type { ExchangeType } from '@/config/exchangeConfig';
import type { CoinRecord } from '@/types/asset';
import { debounce } from '@/lib/utils';

// 内存缓存
let cachedCoins: CoinRecord[] | null = null;
// 初始化 Promise，确保只初始化一次
let initPromise: Promise<CoinRecord[]> | null = null;

// ─── 迁移工具

/**
 * 检测并迁移旧格式（string[]）→ 新格式（CoinRecord[]）
 * 旧格式的每条数据 unsupportedExchanges 缺省，语义上等同于全部支持
 * 逐元素检查，兼容混合格式数组（如 ["BTC", {symbol:"ETH"}]）
 */
function normalizeCoins(raw: unknown): CoinRecord[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw.map(item =>
    typeof item === 'string' ? { symbol: item } : (item as CoinRecord)
  );
}

// ─── 初始化

async function initializeCoins(): Promise<CoinRecord[]> {
  try {
    const result = await chrome.storage.local.get(['coins']);
    const raw = result.coins;

    if (raw && Array.isArray(raw) && raw.length > 0) {
      const records = normalizeCoins(raw);

      // 如果检测到旧格式（任意元素为 string），立即写回新格式完成迁移
      const needsMigration = raw.some(item => typeof item === 'string');
      if (needsMigration) {
        console.log('[CoinsManager] 检测到旧格式或混合格式，已迁移为 CoinRecord[]');
        await chrome.storage.local.set({ coins: records });
      }

      cachedCoins = records;
      return records;
    }

    // 不存在或为空，使用默认值
    const defaults: CoinRecord[] = defaultCoinList.map(symbol => ({ symbol }));
    cachedCoins = defaults;
    await chrome.storage.local.set({ coins: defaults });
    return defaults;
  } catch (error) {
    console.error('[CoinsManager] 初始化失败:', error);
    const defaults: CoinRecord[] = defaultCoinList.map(symbol => ({ symbol }));
    cachedCoins = defaults;
    return defaults;
  }
}

// ─── 读取

/**
 * 获取完整的 CoinRecord 列表（优先从内存缓存读取）
 */
export async function getCoinRecords(): Promise<CoinRecord[]> {
  if (cachedCoins !== null) return cachedCoins;
  if (initPromise) return initPromise;
  initPromise = initializeCoins();
  return initPromise;
}

/**
 * 获取 symbol 字符串列表（保持向后兼容）
 */
export async function getCoins(): Promise<string[]> {
  const records = await getCoinRecords();
  return records.map(r => r.symbol);
}

/**
 * 同步获取 symbol 列表（从内存缓存）
 * 缓存未初始化时返回 null
 */
export function getCoinsSync(): string[] | null {
  return cachedCoins ? cachedCoins.map(r => r.symbol) : null;
}

// ─── 写入

const debouncedPersist = debounce(async (records: CoinRecord[]) => {
  try {
    await chrome.storage.local.set({ coins: records });
  } catch (error) {
    console.error('[CoinsManager] 持久化失败:', error);
  }
}, 300);

/**
 * 以 symbol[] 更新列表（保持向后兼容）
 * 内部合并旧记录，保留已有的 unsupportedExchanges 数据
 */
export async function setCoins(symbols: string[]): Promise<void> {
  const existing = cachedCoins ?? [];
  const existingMap = new Map(existing.map(r => [r.symbol, r]));

  const records: CoinRecord[] = symbols.map(symbol => {
    const prev = existingMap.get(symbol);
    return prev ?? { symbol };
  });

  cachedCoins = records;
  debouncedPersist(records);
}

/**
 * 强制立即持久化（不使用防抖）
 */
export async function persistCoinsImmediately(): Promise<void> {
  if (!cachedCoins) return;
  try {
    await chrome.storage.local.set({ coins: cachedCoins });
  } catch (error) {
    console.error('[CoinsManager] 立即持久化失败:', error);
  }
}

// ─── 黑名单

/**
 * 将指定 symbol 列表标记为某交易所不支持
 * 写入黑名单字段 unsupportedExchanges
 */
export async function markUnsupported(symbols: string[], exchange: ExchangeType): Promise<void> {
  const records = await getCoinRecords();
  let changed = false;

  const updated = records.map(r => {
    if (!symbols.includes(r.symbol)) return r;

    const current = r.unsupportedExchanges ?? [];
    if (current.includes(exchange)) return r; // 已存在，无需重复写

    changed = true;
    return { ...r, unsupportedExchanges: [...current, exchange] };
  });

  if (!changed) return;

  cachedCoins = updated;
  debouncedPersist(updated);
  console.log(`[CoinsManager] 已标记 [${symbols.join(', ')}] 在 ${exchange} 不支持`);
}

// ─── 缓存重置

export function resetCache(): void {
  cachedCoins = null;
  initPromise = null;
}

// ─── 监听 storage 变化，自动同步缓存

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.coins) return;

  const newValue = changes.coins.newValue;
  if (newValue && Array.isArray(newValue)) {
    cachedCoins = normalizeCoins(newValue);
  } else {
    resetCache();
  }
});
