import { KlineWsConfig } from '@/sidepanel/config/klineWs';
import type { KlineBar, KlineWsContext, KlineWsEvent, KlineWsSource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

function pair(symbol: string): string {
  return `${symbol.toUpperCase()}_USDT`;
}

function parseCandlestick(raw: unknown): KlineWsEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const msg = raw as {
    channel?: string;
    event?: string;
    result?: {
      t?: string;
      o?: string;
      h?: string;
      l?: string;
      c?: string;
      a?: string;
      v?: string;
    };
  };

  if (msg.channel !== 'spot.candlesticks' || msg.event !== 'update' || !msg.result) return null;

  const r = msg.result;
  const openTimeSec = Number(r.t);
  if (!Number.isFinite(openTimeSec)) return null;

  const openTime = openTimeSec * 1000;
  const bar: KlineBar = {
    openTime,
    time: openTimeSec as UTCTimestamp,
    open: Number(r.o),
    high: Number(r.h),
    low: Number(r.l),
    close: Number(r.c),
    volume: Number(r.a ?? 0),
    quoteVolume: Number(r.v ?? 0),
    closeTime: openTime
  };
  return { type: 'kline', bar };
}

function parseTicker(raw: unknown): KlineWsEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const msg = raw as {
    channel?: string;
    event?: string;
    result?: { last?: string; change_percentage?: string };
  };

  if (msg.channel !== 'spot.tickers' || msg.event !== 'update' || !msg.result) return null;

  const lastPrice = Number(msg.result.last);
  const changePercent = Number(Number(msg.result.change_percentage).toFixed(2));
  if (!Number.isFinite(lastPrice) || !Number.isFinite(changePercent)) return null;
  return { type: 'ticker', lastPrice, changePercent };
}

/** Gate 现货：同一连接订阅 candlesticks + tickers */
export const gateKlineWsSource: KlineWsSource = {
  buildUrl(_ctx: KlineWsContext): string {
    const endpoint = KlineWsConfig.Gate;
    if (!endpoint) throw new Error('[klineWs] Gate 配置缺失');
    return endpoint.wsUrl;
  },

  buildSubscribe(ctx: KlineWsContext): unknown[] {
    const endpoint = KlineWsConfig.Gate;
    const interval = endpoint?.intervals[ctx.interval];
    if (!interval) throw new Error(`[klineWs] Gate 不支持周期 ${ctx.interval}`);

    const now = Math.floor(Date.now() / 1000);
    const cp = pair(ctx.symbol);
    return [
      {
        time: now,
        channel: 'spot.candlesticks',
        event: 'subscribe',
        payload: [interval, cp]
      },
      {
        time: now,
        channel: 'spot.tickers',
        event: 'subscribe',
        payload: [cp]
      }
    ];
  },

  parseMessage(raw: unknown): KlineWsEvent | null {
    return parseCandlestick(raw) ?? parseTicker(raw);
  }
};
