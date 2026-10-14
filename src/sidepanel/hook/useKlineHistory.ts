import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { Exchange, type ExchangeType } from '@/config/exchangeConfig';
import { fetchKlineHistory, getKlinePageLimit } from '@/sidepanel/api/kline';
import type { KlineBar, KlineInterval, VolumeInfo } from '@/types/kline';

/** 请求页大小；实际 limit 由 getKlinePageLimit 按所裁剪 */
const PAGE_LIMIT = 500;

interface UseKlineHistoryOptions {
  exchange?: ExchangeType;
  symbol: string;
  interval: KlineInterval;
  /** false 时不发请求（等待 storage resolve） */
  enabled?: boolean;
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

function toVolumeMap(bars: KlineBar[]): Map<number, VolumeInfo> {
  const map = new Map<number, VolumeInfo>();
  for (const bar of bars) {
    map.set(bar.time, { volume: bar.volume, quoteVolume: bar.quoteVolume });
  }
  return map;
}

function toChartData(bars: KlineBar[]): CandlestickData<UTCTimestamp>[] {
  return bars.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }));
}

/** 首屏拉最近一页，左滑时用最旧 openTime - 1 再拉一页。切交易所 / 币种 / 周期会取消进行中的请求并重拉 */
export function useKlineHistory({ exchange = Exchange.BN, symbol, interval, enabled = true }: UseKlineHistoryOptions) {
  const [candles, setCandles] = useState<KlineBar[]>([]);
  const [volumeMap, setVolumeMap] = useState<Map<number, VolumeInfo>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const genRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const gen = ++genRef.current;
    abortRef.current?.abort();

    if (!enabled || !symbol) {
      setLoading(true);
      setLoadingMore(false);
      setHasMore(true);
      setError(null);
      setCandles([]);
      setVolumeMap(new Map());
      return;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    loadingMoreRef.current = false;
    hasMoreRef.current = true;
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setError(null);
    setCandles([]);
    setVolumeMap(new Map());

    const effectiveLimit = getKlinePageLimit(exchange, PAGE_LIMIT);

    fetchKlineHistory({ exchange, symbol, interval, limit: PAGE_LIMIT }, ac.signal)
      .then(bars => {
        if (gen !== genRef.current) return;
        setCandles(bars);
        setVolumeMap(toVolumeMap(bars));
        const more = bars.length >= effectiveLimit;
        hasMoreRef.current = more;
        setHasMore(more);
      })
      .catch(err => {
        if (gen !== genRef.current || isAbortError(err)) return;
        setError(err instanceof Error ? err.message : '加载 K 线失败');
        hasMoreRef.current = false;
        setHasMore(false);
      })
      .finally(() => {
        if (gen === genRef.current) setLoading(false);
      });

    return () => ac.abort();
  }, [exchange, symbol, interval, enabled]);

  const loadOlder = useCallback(async () => {
    if (!enabled || loadingMoreRef.current || !hasMoreRef.current) return;
    const current = candlesRef.current;
    if (current.length === 0) return;

    const gen = genRef.current;
    const signal = abortRef.current?.signal;
    const effectiveLimit = getKlinePageLimit(exchange, PAGE_LIMIT);
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const older = await fetchKlineHistory(
        {
          exchange,
          symbol,
          interval,
          limit: PAGE_LIMIT,
          endTime: current[0].openTime - 1
        },
        signal
      );
      if (gen !== genRef.current) return;

      const exist = new Set(current.map(bar => bar.openTime));
      const fresh = older.filter(bar => !exist.has(bar.openTime));
      if (older.length < effectiveLimit || fresh.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
      if (fresh.length > 0) {
        const merged = [...fresh, ...current];
        setCandles(merged);
        setVolumeMap(toVolumeMap(merged));
      }
    } catch (err) {
      if (gen !== genRef.current || isAbortError(err)) return;
      setError(err instanceof Error ? err.message : '加载更早 K 线失败');
    } finally {
      if (gen === genRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [exchange, symbol, interval, enabled]);

  const chartData = useMemo(() => toChartData(candles), [candles]);

  return { candles, chartData, volumeMap, loading, loadingMore, hasMore, error, loadOlder };
}
