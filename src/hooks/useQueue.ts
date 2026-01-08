import { useState, useCallback } from 'react';

/**
 * 轻量级队列管理 Hook
 * 提供队列的添加、移除、批量操作等功能
 */
export function useQueue<T>(initialValues: T[] = []) {
  const [queue, setQueue] = useState<T[]>(initialValues);

  /**
   * 添加元素到队列末尾
   */
  const add = useCallback((item: T) => {
    setQueue(prev => [...prev, item]);
  }, []);

  /**
   * 批量添加元素到队列末尾
   */
  const addBatch = useCallback((items: T[]) => {
    if (items.length === 0) return;
    setQueue(prev => [...prev, ...items]);
  }, []);

  /**
   * 移除队列第一个元素，或根据条件移除
   */
  const remove = useCallback((predicate?: (item: T) => boolean) => {
    if (predicate) {
      setQueue(prev => prev.filter(item => !predicate(item)));
    } else {
      setQueue(prev => prev.slice(1)); // 移除第一个
    }
  }, []);

  /**
   * 根据 ID 移除元素
   */
  const removeById = useCallback((id: string, getId: (item: T) => string) => {
    setQueue(prev => prev.filter(item => getId(item) !== id));
  }, []);

  /**
   * 批量移除元素（根据 ID 集合）
   */
  const removeBatch = useCallback((ids: Set<string>, getId: (item: T) => string) => {
    setQueue(prev => prev.filter(item => !ids.has(getId(item))));
  }, []);

  /**
   * 根据条件过滤队列
   */
  const filter = useCallback((predicate: (item: T) => boolean) => {
    setQueue(prev => prev.filter(predicate));
  }, []);

  /**
   * 清空队列
   */
  const clear = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    add,
    addBatch,
    remove,
    removeById,
    removeBatch,
    filter,
    clear,
    size: queue.length,
    first: queue[0],
    last: queue[queue.length - 1],
    isEmpty: queue.length === 0,
  };
}

