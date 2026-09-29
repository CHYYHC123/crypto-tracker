import { SUPPORTED_TOKENS } from './tokens';

// platform 位运算常量: BN=1, OKX=2, Gate=4
export const PLATFORM = { BN: 1, OKX: 2, GATE: 4 } as const;

// 模块加载时构建一次 Map，查询 O(1)
const TOKEN_MAP = new Map<string, number>(SUPPORTED_TOKENS.map(t => [t.symbol, t.platform]));



/**
 * 节流函数：在指定时间间隔内只执行一次
 * @param {Function} fn - 需要被节流的函数
 * @param {number} [limit=500] - 节流间隔（毫秒）
 * @returns {Function} 包装后的函数
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, limit: number = 500) {
  if (typeof fn !== 'function') {
    throw new TypeError(`throttle(fn, limit): fn 必须是一个函数，当前类型是 ${typeof fn}`);
  }

  if (typeof limit !== 'number' || Number.isNaN(limit) || limit <= 0) {
    console.warn(`⚠️ limit 参数无效，已自动使用默认值 500`);
    limit = 500;
  }

  let lastTime = 0;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= limit) {
      try {
        fn.apply(this, args);
      } catch (err) {
        console.error('throttle 包装的函数执行出错:', err);
      }
      lastTime = now;
    }
  };
}


/**
 * 查询本地 token 是否存在
 * @param symbol  币种名称，大小写不敏感
 * @param platform 可选，平台位掩码（PLATFORM.BN / PLATFORM.OKX / PLATFORM.GATE 或组合）
 *  不传时只要在任意平台存在即返回 true
 */
export function queryTokenLocal(symbol: string, platform?: number): boolean {
  const bits = TOKEN_MAP.get(symbol.toUpperCase());
  if (bits === undefined) return false;
  if (platform === undefined) return true;
  return (bits & platform) !== 0;
}

/**
 * 获取 token 的平台位掩码，token 不存在时返回 0
 */
export function getTokenPlatform(symbol: string): number {
  return TOKEN_MAP.get(symbol.toUpperCase()) ?? 0;
}

/**
 * 根据涨跌幅返回对应的 Tailwind 文字颜色 class
 * @example getChangeColorClass(2.5) → 'text-success'
 */
export function getChangeColorClass(change?: number | null): string {
  if (change == null) return 'text-muted';
  return change >= 0 ? 'text-success' : 'text-danger';
}



/**
 * 过滤输入值：只保留字母、数字、中文，并转为大写
 * 适用于 symbol 搜索框的 onChange 处理
 */
export function sanitizeSymbolInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9\u4e00-\u9fff\u3400-\u4dbf]/g, '').toUpperCase();
}

/**
 * 格式化钱包地址
 * @param address 地址
 * @param start 保留前面字符数量（包含0x）
 * @param end 保留后面字符数量
 */
export function formatAddress(address: string, start = 12, end = 12): string {
  // return address;
  if (!address) return '';
  if (address.length <= start + end) {
    return address;
  }
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
