import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 防抖函数
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
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
