import { useEffect, useRef, useState } from 'react';
import type { ExchangeType } from '@/config/exchangeConfig';
import { KlineWsRegistry } from '@/sidepanel/api/klineWs';
import type {
  KlineBar,
  KlineInterval,
  KlineWsConnectionSpec,
  KlineWsContext,
  KlineWsEvent
} from '@/types/kline';

export type KLineWSStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error' | 'unsupported';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

function getRetryDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
}

interface UseKLineWSParams {
  exchange: ExchangeType;
  symbol: string;
  interval: KlineInterval;
}

interface UseKLineWSResult {
  wsBar: KlineBar | null;
  /** ticker 最新价 */
  lastPrice: number | undefined;
  /** ticker 涨跌幅 % */
  changePercent: number | undefined;
  status: KLineWSStatus;
}

type ApplyEvent = (event: KlineWsEvent) => void;

/**
 * 按交易所 registry 连接实时 K 线 + ticker。
 * 只负责 WS 生命周期；协议细节在 KlineWsSource。
 */
export function useKLineWS({ exchange, symbol, interval }: UseKLineWSParams): UseKLineWSResult {
  const [wsBar, setWsBar] = useState<KlineBar | null>(null);
  const [lastPrice, setLastPrice] = useState<number | undefined>();
  const [changePercent, setChangePercent] = useState<number | undefined>();
  const [status, setStatus] = useState<KLineWSStatus>('idle');

  const socketsRef = useRef<WebSocket[]>([]);
  const pingTimersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    destroyedRef.current = false;
    retryCountRef.current = 0;

    const registered = KlineWsRegistry[exchange];
    if (!registered) {
      setStatus('unsupported');
      setWsBar(null);
      setLastPrice(undefined);
      setChangePercent(undefined);
      return;
    }
    const source = registered;

    const ctx: KlineWsContext = { symbol, interval };

    const applyEvent: ApplyEvent = event => {
      if (event.type === 'kline') {
        setWsBar(event.bar);
        return;
      }
      if (event.type === 'ticker') {
        setLastPrice(event.lastPrice);
        setChangePercent(event.changePercent);
      }
    };

    function clearSockets(): void {
      for (const t of pingTimersRef.current) clearInterval(t);
      pingTimersRef.current = [];

      for (const ws of socketsRef.current) {
        ws.onclose = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onopen = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }
      socketsRef.current = [];
    }

    function attachConnection(spec: KlineWsConnectionSpec, isPrimary: boolean): void {
      let url: string;
      try {
        url = spec.buildUrl(ctx);
      } catch {
        if (isPrimary) setStatus('error');
        return;
      }

      const ws = new WebSocket(url);
      socketsRef.current.push(ws);

      ws.onopen = () => {
        if (destroyedRef.current) {
          ws.close();
          return;
        }
        try {
          const frames = spec.buildSubscribe?.(ctx) ?? [];
          for (const frame of frames) sendJson(ws, frame);
        } catch {
          if (isPrimary) setStatus('error');
          return;
        }

        if (spec.buildPing && spec.pingIntervalMs && spec.pingIntervalMs > 0) {
          const timer = setInterval(() => {
            if (destroyedRef.current || ws.readyState !== WebSocket.OPEN) return;
            sendJson(ws, spec.buildPing!());
          }, spec.pingIntervalMs);
          pingTimersRef.current.push(timer);
        }

        if (isPrimary) {
          retryCountRef.current = 0;
          setStatus('live');
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        if (destroyedRef.current) return;
        try {
          const text = event.data as string;
          // OKX 明文 pong
          if (text === 'pong') {
            spec.parseMessage('pong');
            return;
          }
          const raw: unknown = JSON.parse(text);
          const parsed = spec.parseMessage(raw);
          if (parsed) applyEvent(parsed);
        } catch {
          // 忽略解析失败
        }
      };

      ws.onclose = () => {
        if (destroyedRef.current) return;
        if (isPrimary) scheduleRetry();
      };

      ws.onerror = () => {
        // onerror 之后 onclose 也会触发
      };
    }

    function connect(): void {
      if (destroyedRef.current) return;
      clearSockets();
      setStatus('connecting');

      attachConnection(source, true);
      if (source.companion) {
        attachConnection(source.companion, false);
      }
    }

    function scheduleRetry(): void {
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

    connect();

    return () => {
      destroyedRef.current = true;

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      clearSockets();

      setWsBar(null);
      setLastPrice(undefined);
      setChangePercent(undefined);
      setStatus('idle');
    };
  }, [exchange, symbol, interval]);

  return { wsBar, lastPrice, changePercent, status };
}
