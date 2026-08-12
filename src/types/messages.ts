export type ExchangeType = 'OKX' | 'Gate' | 'BN' | 'HL' | 'BNStock';

export type CryptoTicker = {
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
};
