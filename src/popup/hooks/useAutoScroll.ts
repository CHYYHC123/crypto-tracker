import { useEffect, useRef } from 'react';

export function useAutoScroll<T>(list: T[]) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const prevLengthRef = useRef(0);

  useEffect(() => {
    const prevLength = prevLengthRef.current;

    // 新增数据才滚动
    if (list.length > prevLength && prevLength > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
    

    prevLengthRef.current = list.length;
  }, [list.length]);

  return listRef;
}
