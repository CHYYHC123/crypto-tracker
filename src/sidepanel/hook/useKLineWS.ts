import { useEffect, useRef, useState } from 'react';
import type { KlineBar, KlineInterval } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

// ── 状态类型
export type KLineWSStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error';

// ── Binance kline 帧的 k 字段结构
interface BinanceKlineFrame {
  t: number; // K 线开盘时间（ms）
  T: number; // K 线收盘时间（ms）
  o: string; // 开盘价
  h: string; // 最高价
  l: string; // 最低价
  c: string; // 收盘价
  v: string; // 成交量
  q: string; // 成交额
  x: boolean; // 是否已收盘
}

// ── 重连配置
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

function getRetryDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
}

// ── WS URL：kline + 24hr ticker 组合流（首版仅 Binance 现货）
function buildWsUrl(symbol: string, interval: KlineInterval): string {
  const s = symbol.toLowerCase();
  return `wss://stream.binance.com:9443/stream?streams=${s}usdt@kline_${interval}/${s}usdt@ticker`;
}

/** 组合流包一层 { stream, data }；单流则直接是事件体 */
function unwrapStreamPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const o = raw as { data?: unknown };
  return o.data !== undefined ? o.data : raw;
}

// ── Binance kline 消息 → KlineBar
function parseKlineFrame(data: unknown): KlineBar | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as { e?: string; k?: BinanceKlineFrame };
  if (msg.e !== 'kline' || !msg.k) return null;
  const k = msg.k;
  return {
    openTime: k.t,
    time: Math.floor(k.t / 1000) as UTCTimestamp,
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number(k.v),
    quoteVolume: Number(k.q),
    closeTime: k.T
  };
}

function parseTicker24h(data: unknown): { lastPrice: number; changePercent: number } | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as { e?: string; c?: string; P?: string };
  if (msg.e !== '24hrTicker') return null;
  const lastPrice = Number(msg.c);
  const changePercent = Number(Number(msg.P).toFixed(2));
  if (!Number.isFinite(lastPrice) || !Number.isFinite(changePercent)) return null;
  return { lastPrice, changePercent };
}

interface UseKLineWSParams {
  symbol: string;
  interval: KlineInterval;
}

interface UseKLineWSResult {
  wsBar: KlineBar | null;
  /** ticker 最新价（msg.c） */
  lastPrice: number | undefined;
  /** ticker 24h 涨跌幅 %（msg.P） */
  changePercent: number | undefined;
  status: KLineWSStatus;
}

/**
 * 连接 Binance combined 流：kline 增量 + 24hr ticker。
 * 只负责 WS，不拉历史。symbol / interval 变化时自动重建连接。
 */
export function useKLineWS({ symbol, interval }: UseKLineWSParams): UseKLineWSResult {
  const [wsBar, setWsBar] = useState<KlineBar | null>(null);
  const [lastPrice, setLastPrice] = useState<number | undefined>();
  const [changePercent, setChangePercent] = useState<number | undefined>();
  const [status, setStatus] = useState<KLineWSStatus>('idle');

  // 用 ref 持有可变状态，避免 effect 闭包过期
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false); // 标记 effect 已清理，防止异步回调再次触发

  useEffect(() => {
    destroyedRef.current = false;
    retryCountRef.current = 0;

    function connect() {
      if (destroyedRef.current) return;

      const url = buildWsUrl(symbol, interval);
      setStatus('connecting');

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (destroyedRef.current) {
          ws.close();
          return;
        }
        retryCountRef.current = 0;
        setStatus('live');
      };

      ws.onmessage = (event: MessageEvent) => {
        if (destroyedRef.current) return;
        try {
          const raw: unknown = JSON.parse(event.data as string);
          const msg = unwrapStreamPayload(raw);
          if (!msg || typeof msg !== 'object') return;

          const e = (msg as { e?: string }).e;
          if (e === 'kline') {
            const bar = parseKlineFrame(msg);
            if (bar) setWsBar(bar);
            return;
          }
          if (e === '24hrTicker') {
            const ticker = parseTicker24h(msg);
            if (ticker) {
              setLastPrice(ticker.lastPrice);
              setChangePercent(ticker.changePercent);
            }
          }
        } catch {
          // 忽略解析失败
        }
      };

      ws.onclose = () => {
        if (destroyedRef.current) return;
        wsRef.current = null;
        scheduleRetry();
      };

      ws.onerror = () => {
        // onerror 之后 onclose 也会触发，重连逻辑在 onclose 里处理
      };
    }

    function scheduleRetry() {
      if (destroyedRef.current) return;

      retryCountRef.current += 1;
      if (retryCountRef.current > MAX_RETRIES) {
        setStatus('error');
        return;
      }

      setStatus('reconnecting');
      const delay = getRetryDelay(retryCountRef.current - 1);
      retryTimerRef.current = setTimeout(() => {
        if (!destroyedRef.current) connect();
      }, delay);
    }

    // 首次连接
    connect();

    // 清理：symbol / interval 变化 或 unmount 时执行
    return () => {
      destroyedRef.current = true;

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.onclose = null; // 防止触发 scheduleRetry
        wsRef.current.close();
        wsRef.current = null;
      }

      // 重置状态，让下一轮 effect 从干净状态开始
      setWsBar(null);
      setLastPrice(undefined);
      setChangePercent(undefined);
      setStatus('idle');
    };
  }, [symbol, interval]);

  return { wsBar, lastPrice, changePercent, status };
}
