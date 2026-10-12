import { useEffect, useState } from 'react';
import { fetchEquitySymbol, type EquitySymbolInfo } from '@/sidepanel/api/equity/getSymbol';

/**
 * 股票 Header 首屏：全名 + 价格/涨跌 seed。
 * 仅 enabled 时请求；切 symbol 会 abort 并清空，避免闪旧数据。
 */
export function useEquitySymbol(symbol: string, enabled: boolean): EquitySymbolInfo | null {
  const [info, setInfo] = useState<EquitySymbolInfo | null>(null);

  useEffect(() => {
    if (!enabled || !symbol) {
      setInfo(null);
      return;
    }

    const ac = new AbortController();
    setInfo(null);

    fetchEquitySymbol(symbol, ac.signal).then(next => {
      if (!ac.signal.aborted) setInfo(next);
    });

    return () => ac.abort();
  }, [symbol, enabled]);

  return info;
}
