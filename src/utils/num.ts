/**
 * 保留小数点位数
 *  toLocaleString 这个会出现千分位变成 字符串
 */
export function formatNumber(number: number, decimalPlaces: number) {
  return number.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
}

/**
 * 处理价格显示
 */
export function price_show(number: number) {
  let result: string = '0';
  if (number === 0) result = '0';
  if (number > 1) {
    result = formatNumber(Number(number), 2);
  } else {
    if (number > 0.0001) {
      result = formatNumber(number, 5);
    } else if (number < 0.000000001) {
      result = formatNumber(number, 11);
    } else {
      result = formatNumber(number, 8);
    }
  }
  return result;
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
 * 格式化涨跌幅百分比，null/undefined 时返回 '—'
 * @example formatChange(2.5) → '+2.5%'  formatChange(-1.2) → '-1.2%'
 */
export function formatChange(change?: number | null): string {
  if (change == null) return '—';
  const prefix = change >= 0 ? '+' : '';
  return `${prefix}${change}%`;
}
