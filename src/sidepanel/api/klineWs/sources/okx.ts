import { KlineWsConfig } from '@/sidepanel/config/klineWs';
import type { KlineBar, KlineWsContext, KlineWsEvent, KlineWsSource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

const OKX_PUBLIC_WS = 'wss://ws.okx.com:8443/ws/v5/public';

function instId(symbol: string): string {
  return `${symbol.toUpperCase()}-USDT`;
}

/** OKX candle 推送行：[ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm] */
function parseCandleRow(row: unknown): KlineBar | null {
  if (!Array.isArray(row) || row.length < 6) return null;
  const openTime = Number(row[0]);
  if (!Number.isFinite(openTime)) return null;
  return {
    openTime,
    time: Math.floor(openTime / 1000) as UTCTimestamp,
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    quoteVolume: Number(row[7] ?? row[6] ?? 0),
    closeTime: openTime
  };
}

function parseCandleMessage(raw: unknown): KlineWsEvent | null {
  if (raw === 'pong') return { type: 'pong' };
  if (!raw || typeof raw !== 'object') return null;

  const msg = raw as { event?: string; arg?: { channel?: string }; data?: unknown[] };
  if (msg.event) return null; // subscribe / error ack

  const channel = msg.arg?.channel ?? '';
  if (!channel.startsWith('candle') || !Array.isArray(msg.data) || !msg.data.length) return null;

  const bar = parseCandleRow(msg.data[0]);
  return bar ? { type: 'kline', bar } : null;
}

function parseTickerMessage(raw: unknown): KlineWsEvent | null {
  if (raw === 'pong') return { type: 'pong' };
  if (!raw || typeof raw !== 'object') return null;

  const msg = raw as { event?: string; arg?: { channel?: string }; data?: Array<Record<string, string>> };
  if (msg.event) return null;
  if (msg.arg?.channel !== 'tickers' || !msg.data?.[0]) return null;

  const d = msg.data[0];
  const lastPrice = Number(d.last);
  const open24h = Number(d.open24h);
  const changePercent = open24h > 0 ? Number((((lastPrice - open24h) / open24h) * 100).toFixed(2)) : 0;
  if (!Number.isFinite(lastPrice) || !Number.isFinite(changePercent)) return null;
  return { type: 'ticker', lastPrice, changePercent };
}

/**
 * OKX：business 收 candle，public companion 收 tickers。
 * 两端都需约 30s 发一次 "ping"。
 */
export const okxKlineWsSource: KlineWsSource = {
  buildUrl(_ctx: KlineWsContext): string {
    const endpoint = KlineWsConfig.OKX;
    if (!endpoint) throw new Error('[klineWs] OKX 配置缺失');
    return endpoint.wsUrl;
  },

  buildSubscribe(ctx: KlineWsContext): unknown[] {
    const endpoint = KlineWsConfig.OKX;
    const bar = endpoint?.intervals[ctx.interval];
    if (!bar) throw new Error(`[klineWs] OKX 不支持周期 ${ctx.interval}`);

    return [
      {
        op: 'subscribe',
        args: [{ channel: `candle${bar}`, instId: instId(ctx.symbol) }]
      }
    ];
  },

  parseMessage: parseCandleMessage,
  buildPing: () => 'ping',
  pingIntervalMs: 25_000,

  companion: {
    buildUrl: () => OKX_PUBLIC_WS,
    buildSubscribe(ctx: KlineWsContext): unknown[] {
      return [
        {
          op: 'subscribe',
          args: [{ channel: 'tickers', instId: instId(ctx.symbol) }]
        }
      ];
    },
    parseMessage: parseTickerMessage,
    buildPing: () => 'ping',
    pingIntervalMs: 25_000
  }
};
