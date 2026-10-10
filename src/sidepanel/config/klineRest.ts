import { Exchange, type ExchangeType } from '@/config/exchangeConfig';
import type { KlineRestEndpoint } from '@/types/kline';

/**
 * 各交易所历史 K 线 HTTPS 入口。
 * 域名和路径集中在这里；交易对格式、查询参数名、响应解析放在各自的 source 里。
 */
export const KlineRestConfig: Partial<Record<ExchangeType, KlineRestEndpoint>> = {
  [Exchange.BN]: {
    baseUrl: 'https://api.binance.com',
    path: '/api/v3/klines',
    maxLimit: 1000,
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '1w' }
  },
  [Exchange.OKX]: {
    baseUrl: 'https://www.okx.com',
    path: '/api/v5/market/candles',
    maxLimit: 300,
    intervals: { '1m': '1m', '30m': '30m', '1h': '1H', '1d': '1D', '1w': '1W' }
  },
  [Exchange.Gate]: {
    baseUrl: 'https://api.gateio.ws',
    path: '/api/v4/spot/candlesticks',
    maxLimit: 1000,
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '7d' }
  },
  [Exchange.BNFutures]: {
    baseUrl: 'https://fapi.binance.com',
    path: '/fapi/v1/klines',
    maxLimit: 1500,
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '1w' }
  },
  [Exchange.BNStock]: {
    baseUrl: 'https://www.binance.com',
    path: '/bapi/equity/v1/public/equity/kline/query',
    maxLimit: 1000,
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '1w' }
  }
};
