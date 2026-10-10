import { Exchange } from '@/config/exchangeConfig';
import { KlineWsConfig } from '@/sidepanel/config/klineWs';
import type { KlineBar, KlineWsContext, KlineWsEvent, KlineWsSource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

type BnStyleExchange = typeof Exchange.BN | typeof Exchange.BNFutures;

interface BinanceKlineFrame {
  t: number;
  T: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  q: string;
}

/** 组合流包一层 { stream, data }；单流则直接是事件体 */
function unwrapStreamPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const o = raw as { data?: unknown };
  return o.data !== undefined ? o.data : raw;
}

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

/** 币安现货 / U 本位合约：combined stream 同形，只换 KlineWsConfig.wsUrl */
function createBnStyleWsSource(exchange: BnStyleExchange): KlineWsSource {
  return {
    buildUrl(ctx: KlineWsContext): string {
      const endpoint = KlineWsConfig[exchange];
      if (!endpoint) throw new Error(`[klineWs] ${exchange} 配置缺失`);
      const interval = endpoint.intervals[ctx.interval];
      if (!interval) throw new Error(`[klineWs] ${exchange} 不支持周期 ${ctx.interval}`);

      const s = ctx.symbol.toLowerCase();
      return `${endpoint.wsUrl}?streams=${s}usdt@kline_${interval}/${s}usdt@ticker`;
    },

    parseMessage(raw: unknown): KlineWsEvent | null {
      const msg = unwrapStreamPayload(raw);
      if (!msg || typeof msg !== 'object') return null;

      const e = (msg as { e?: string }).e;
      if (e === 'kline') {
        const bar = parseKlineFrame(msg);
        return bar ? { type: 'kline', bar } : null;
      }
      if (e === '24hrTicker') {
        const ticker = parseTicker24h(msg);
        return ticker ? { type: 'ticker', ...ticker } : null;
      }
      return null;
    }
  };
}

export const bnKlineWsSource = createBnStyleWsSource(Exchange.BN);
export const bnFuturesKlineWsSource = createBnStyleWsSource(Exchange.BNFutures);
