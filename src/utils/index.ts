import { SUPPORTED_TOKENS } from './tokens';

// platform 位运算常量: BN=1, OKX=2, Gate=4
export const PLATFORM = { BN: 1, OKX: 2, GATE: 4 } as const;

// 模块加载时构建一次 Map，查询 O(1)
const TOKEN_MAP = new Map<string, number>(SUPPORTED_TOKENS.map(t => [t.symbol, t.platform]));
/**
 * 保留小数点位数
 */
export function formatNumber(number: number, decimalPlaces: number) {
  return Number(
    number.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    })
  );
}

/**
 * 处理价格显示
 */
export function price_show(number: number) {
  if (number === 0) return 0;
  if (number > 1) {
    number = formatNumber(Number(number), 2);
  } else {
    if (number > 0.0001) {
      number = formatNumber(number, 5);
    } else if (number < 0.000000001) {
      number = formatNumber(number, 11);
    } else {
      number = formatNumber(number, 8);
    }
  }
  return number;
}

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
 * @description 千分位格式化数字
 * @param number 需要格式化的数字
 * @param decimalPlaces 保留的小数位数（默认2位）
 * @returns 格式化后的字符串，例如 12345.678 -> "12,345.68"
 */
export function formatNumWithCommas(number: number, decimalPlaces = 2): string {
  if (isNaN(number) || number === null || !number) return '0';
  // 对非常小的数值做特殊处理
  if (Math.abs(number) > 1) {
    return number.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
  } else if (number > 0.0001) {
    return number.toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  } else if (number < 0.000000001) {
    return number.toExponential(8); // 非常小的数使用科学计数法
  } else {
    // return number.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
    // 小于 1 且大于 1e-9，不四舍五入，截断 8 位小数
    return formatNumberNoRound(number, 8);
  }
}

/**
 * @description 千分位格式化数字（不四舍五入，直接截断小数）
 */
export function formatNumberNoRound(number: number, decimalPlaces = 8): string {
  if (isNaN(number) || number === null || number === 0) return '0';

  const factor = Math.pow(10, decimalPlaces);
  const truncated = Math.floor(number * factor) / factor;

  const parts = truncated.toString().split('.');

  // 千分位
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // 补全小数位
  if (decimalPlaces > 0) {
    parts[1] = (parts[1] || '').padEnd(decimalPlaces, '0');
  }

  return parts.join('.');
}
/**
 * 查询本地 token 是否存在
 * @param symbol  币种名称，大小写不敏感
 * @param platform 可选，平台位掩码（PLATFORM.BN / PLATFORM.OKX / PLATFORM.GATE 或组合）
 *                 不传时只要在任意平台存在即返回 true
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
 * @example getChangeColorClass(2.5) → 'text-emerald-400'
 */
export function getChangeColorClass(change?: number | null): string {
  if (change == null) return 'text-gray-400';
  return change >= 0 ? 'text-emerald-400' : 'text-rose-400';
}

/**
 * 格式化涨跌幅百分比，null/undefined 时返回 '—'
 * @example formatChange(2.5) → '+2.5%'  formatChange(-1.2) → '-1.2%'
 */
export function formatChange(change?: number | null): string {
  if (change == null) return '—';
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change}%`;
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
