import { useEffect, useState } from 'react';
import { fetchBnTicker24h } from '@/sidepanel/api/ticker/bn';
import type { ExchangeType } from '@/config/exchangeConfig';

const POLL_MS = 30_000;

interface UseTicker24hParams {
  symbol: string;
  exchange?: ExchangeType;
}

/**
 * 拉取交易所 24h ticker 涨跌幅（API 字段，不本地用 K 线推算）
 * 首版仅 BN
 */
export function useTicker24h({ symbol, exchange = 'BN' }: UseTicker24hParams) {
  const [changePercent, setChangePercent] = useState<number | undefined>();

  useEffect(() => {
    if (exchange !== 'BN' || !symbol) {
      setChangePercent(undefined);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    const load = async () => {
      try {
        const ticker = await fetchBnTicker24h(symbol, ac.signal);
        if (!cancelled) setChangePercent(Number(ticker.priceChangePercent.toFixed(2)));
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        // 保留上次成功值，避免短暂失败闪成 --
      }
    };

    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      ac.abort();
      window.clearInterval(id);
    };
  }, [symbol, exchange]);

  return { changePercent };
}
