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

export function parseWSMessage(msg: any): Ticker | null {
  return parseGate(msg) || parseOKX(msg) || parseBN(msg);
}

