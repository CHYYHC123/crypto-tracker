// src/types/ticker.ts
import { ExchangeType } from '@/config/exchangeConfig';
export interface Ticker {
  symbol: string; // BTC-USDT
  last: number; // 最新价
  bid: number; // 买一
  ask: number; // 卖一
  high24h: number; // 24h 最高
  low24h: number; // 24h 最低
  volume24h: number; // 成交量（USDT）
  changePercent: number; // 24h 涨跌幅（%）

  exchange: ExchangeType;
  sodUtc8?: number; // 北京时间 00:00 开盘价
}

/** Gate */
function parseGate(msg: any): Ticker | null {
  if (msg?.channel !== 'spot.tickers' || msg?.event !== 'update') return null;
  const r = msg.result;
  if (!r) return null;

  return {
    symbol: r.currency_pair.replace('_', '-'),
    last: Number(r.last),
    bid: Number(r.highest_bid),
    ask: Number(r.lowest_ask),
    high24h: Number(r.high_24h),
    low24h: Number(r.low_24h),
    volume24h: Number(r.quote_volume),
    changePercent: Number(r.change_percentage),
    exchange: 'Gate'
  };
}

/** OKX */
function parseOKX(msg: any): Ticker | null {
  if (msg?.arg?.channel !== 'tickers') return null;
  const d = msg.data?.[0];
  if (!d) return null;

  return {
    symbol: d.instId,
    last: Number(d.last),
    bid: Number(d.bidPx),
    ask: Number(d.askPx),
    high24h: Number(d.high24h),
    low24h: Number(d.low24h),
    volume24h: Number(d.volCcy24h),
    changePercent: ((Number(d.last) - Number(d.open24h)) / Number(d.open24h)) * 100,
    exchange: 'OKX',
    sodUtc8: d.sodUtc8 ? Number(d.sodUtc8) : undefined
  };
}

/** Binance */
function parseBN(msg: any): Ticker | null {
  if (msg?.e !== '24hrTicker') return null;

  return {
    symbol: msg.s.replace('USDT', '-USDT'),
    last: Number(msg.c),
    bid: Number(msg.b),
    ask: Number(msg.a),
    high24h: Number(msg.h),
    low24h: Number(msg.l),
    volume24h: Number(msg.q),
    changePercent: Number(msg.P),
    exchange: 'BN'
  };
}

/** Hyperliquid */
function parseHL(msg: any): Ticker | null {
  if (msg?.channel !== 'candle' || !msg?.data) return null;

  const d = msg.data;

  const close = Number(d.c);
  const open = Number(d.o);

  if (!Number.isFinite(close) || !Number.isFinite(open)) return null;

  return {
    symbol: `${d.s}-USDT`, // BTC → BTC-USDT（与你系统统一）
    last: close,
    bid: close, // ⚠️ 降级处理
    ask: close, // ⚠️ 降级处理
    high24h: Number(d.h), // ⚠️ 实际是当前 interval high
    low24h: Number(d.l), // ⚠️ 实际是当前 interval low
    volume24h: Number(d.v), // ⚠️ 实际是当前 interval volume
    changePercent: open > 0 ? ((close - open) / open) * 100 : 0,
    exchange: 'HL',
    sodUtc8: open > 0 ? open : undefined // 使用 candle 的开盘价作为 sodUtc8
  };
}

export function parseWSMessage(msg: any): Ticker | null {
  return parseGate(msg) || parseOKX(msg) || parseBN(msg) || parseHL(msg);
}
