import { Exchange, type ExchangeType } from '@/config/exchangeConfig';
import type { KlineWsEndpoint } from '@/types/kline';

/**
 * 各交易所实时 K 线 WebSocket 入口。
 * 域名集中在这里；交易对格式、订阅帧、响应解析放在各自的 source 里。
 */
export const KlineWsConfig: Partial<Record<ExchangeType, KlineWsEndpoint>> = {
  [Exchange.BN]: {
    wsUrl: 'wss://stream.binance.com:9443/stream',
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '1w' }
  },
  [Exchange.BNFutures]: {
    wsUrl: 'wss://fstream.binance.com/stream',
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '1w' }
  },
  [Exchange.OKX]: {
    // candle 在 business；tickers 在 public（source 内用 companion）
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/business',
    intervals: { '1m': '1m', '30m': '30m', '1h': '1H', '1d': '1D', '1w': '1W' }
  },
  [Exchange.Gate]: {
    wsUrl: 'wss://api.gateio.ws/ws/v4/spot',
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '7d' }
  },
  [Exchange.BNStock]: {
    wsUrl: 'wss://nbstream.binance.com/equity/stream',
    intervals: { '1m': '1m', '30m': '30m', '1h': '1h', '1d': '1d', '1w': '1w' }
  }
};
