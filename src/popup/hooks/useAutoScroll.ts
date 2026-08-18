import { useEffect, useRef } from 'react';

export function useAutoScroll<T>(list: T[]) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const prevLength = prevLengthRef.current;

    // 先更新两个 ref
    prevLengthRef.current = list.length;

    // 新增数据才滚动
    if (list.length > prevLength && prevLength > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [list.length]); // 两个依赖放在同一个 effect

  return listRef;
}
