import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 按需加载插件
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 格式化 K 线/交易时间戳 (支持秒/毫秒级 Unix 时间戳)
 */
export function formatTimestamp(timestamp: number, format = 'YYYY-MM-DD HH:mm:ss'): string {
  const isSeconds = timestamp < 1e11;
  return dayjs.unix(isSeconds ? timestamp : Math.floor(timestamp / 1000)).format(format);
}

/**
 * 获取相对时间（如 "5 分钟前"）
 */
export function formatFromNow(timestamp: number): string {
  return dayjs(timestamp).fromNow();
}
