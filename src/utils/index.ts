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
export function formatNumberWithCommas(number: number, decimalPlaces = 2): string {
  if (isNaN(number) || number === null) return '0';

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
    return number.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  }
}
