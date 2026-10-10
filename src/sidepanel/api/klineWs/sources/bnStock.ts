import { KlineWsConfig } from '@/sidepanel/config/klineWs';
import type { KlineBar, KlineWsContext, KlineWsEvent, KlineWsSource } from '@/types/kline';
import type { UTCTimestamp } from 'lightweight-charts';

/** 侧栏 symbol 多为 AAPL；stream 名用裸 ticker（与 REST EQ_ 前缀区分） */
function streamSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  return upper.startsWith('EQ_') ? upper.slice(3) : upper;
}

interface EquityKlineFrame {
  t: number;
  T?: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v?: string;
  q?: string;
}

function unwrap(raw: unknown): { stream?: string; data: unknown } {
  if (!raw || typeof raw !== 'object') return { data: raw };
  const o = raw as { stream?: string; data?: unknown };
  if (o.data !== undefined) return { stream: o.stream, data: o.data };
  return { data: raw };
}

function parseKline(data: unknown): KlineBar | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as { e?: string; k?: EquityKlineFrame };
  const k = msg.k ?? (msg as unknown as EquityKlineFrame);
  if (!k || k.t == null || k.o == null) return null;
  // 有 e 字段时要求为 kline
  if (msg.e != null && msg.e !== 'kline') return null;

  return {
    openTime: k.t,
    time: Math.floor(k.t / 1000) as UTCTimestamp,
    open: Number(k.o),
    high: Number(k.h),
    low: Number(k.l),
    close: Number(k.c),
    volume: Number(k.v ?? 0),
    quoteVolume: Number(k.q ?? 0),
    closeTime: k.T ?? k.t
  };
}

/**
 * quote / 单标的行情：尽量兼容 p/pc、c/P、last 等字段。
 * 涨跌幅对齐列表页 (p - pc) / pc。
 */
function parseQuote(data: unknown, expectSym: string): { lastPrice: number; changePercent: number } | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  // 可能包在 rates 数组里（与全局 price 流同形）
  if (Array.isArray(d.rates)) {
    const hit = (d.rates as Array<Record<string, string>>).find(
      r => String(r.s ?? '').toUpperCase() === expectSym || String(r.s ?? '').toUpperCase() === `EQ_${expectSym}`
    );
    if (!hit) return null;
    return fromPricePrevClose(hit.p, hit.pc);
  }

  const sym = String(d.s ?? d.symbol ?? '').toUpperCase();
  if (sym && sym !== expectSym && sym !== `EQ_${expectSym}`) return null;

  if (d.p != null && d.pc != null) return fromPricePrevClose(d.p, d.pc);
  if (d.c != null && d.P != null) {
    const lastPrice = Number(d.c);
    const changePercent = Number(Number(d.P).toFixed(2));
    if (!Number.isFinite(lastPrice) || !Number.isFinite(changePercent)) return null;
    return { lastPrice, changePercent };
  }
  if (d.last != null || d.c != null) {
    const lastPrice = Number(d.last ?? d.c);
    const prev = Number(d.prevClose ?? d.pc ?? d.open);
    if (!Number.isFinite(lastPrice)) return null;
    const changePercent =
      Number.isFinite(prev) && prev > 0 ? Number((((lastPrice - prev) / prev) * 100).toFixed(2)) : 0;
    return { lastPrice, changePercent };
  }
  return null;
}

function fromPricePrevClose(p: unknown, pc: unknown): { lastPrice: number; changePercent: number } | null {
  const lastPrice = Number(p);
  const prevClose = Number(pc);
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) return null;
  const changePercent =
    Number.isFinite(prevClose) && prevClose > 0
      ? Number((((lastPrice - prevClose) / prevClose) * 100).toFixed(2))
      : 0;
  return { lastPrice, changePercent };
}

/** 币安股票：SUBSCRIBE 单标的 kline + quote */
export const bnStockKlineWsSource: KlineWsSource = {
  buildUrl(_ctx: KlineWsContext): string {
    const endpoint = KlineWsConfig.BNStock;
    if (!endpoint) throw new Error('[klineWs] BNStock 配置缺失');
    return endpoint.wsUrl;
  },

  buildSubscribe(ctx: KlineWsContext): unknown[] {
    const endpoint = KlineWsConfig.BNStock;
    const interval = endpoint?.intervals[ctx.interval];
    if (!interval) throw new Error(`[klineWs] BNStock 不支持周期 ${ctx.interval}`);

    const s = streamSymbol(ctx.symbol);
    return [
      {
        method: 'SUBSCRIBE',
        params: [`${s}@kline_${interval}`, `${s}@quote`],
        id: Date.now()
      }
    ];
  },

  parseMessage(raw: unknown): KlineWsEvent | null {
    const { stream, data } = unwrap(raw);
    const streamLower = (stream ?? '').toLowerCase();

    if (streamLower.includes('@kline_') || (data && typeof data === 'object' && (data as { e?: string }).e === 'kline')) {
      const bar = parseKline(data);
      return bar ? { type: 'kline', bar } : null;
    }

    if (streamLower.includes('@quote') || streamLower === 'quote') {
      // expectSym 从 stream 前缀取不到时用空串，parseQuote 在无 s 时仍可读价格字段
      const symFromStream = streamLower.split('@')[0]?.toUpperCase() ?? '';
      const ticker = parseQuote(data, symFromStream);
      return ticker ? { type: 'ticker', ...ticker } : null;
    }

    // 无 stream 包装时尝试两种
    const bar = parseKline(data);
    if (bar) return { type: 'kline', bar };
    const ticker = parseQuote(data, '');
    return ticker ? { type: 'ticker', ...ticker } : null;
  }
};
