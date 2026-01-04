export const defaultCoinList = ['BTC', 'ETH', 'BNB', 'SOL'];

/** 默认数据源 */
export const defaultDataSource: ExchangeType = 'OKX';

/** 用于 UI 的下拉列表 */
export const ExchangeList: ExchangeType[] = ['OKX', 'Gate', 'BN'];

// 交易所类型
export type ExchangeType = 'OKX' | 'Gate' | 'BN' | 'HL';

type SubscribeBuilder = (tokenList: string[]) => any;

interface ExchangeConfig {
  wsUrl: string;
  buildSubscribeMessage: SubscribeBuilder;
}

const OKXConfig: ExchangeConfig = {
  wsUrl: 'wss://wspri.okx.com:8443/ws/v5/ipublic',
  buildSubscribeMessage(tokenList) {
    return {
      op: 'subscribe',
      args: tokenList.map(token => ({
        channel: 'tickers',
        instId: `${token.toUpperCase()}-USDT`
      }))
    };
  }
};

const GateConfig: ExchangeConfig = {
  wsUrl: 'wss://api.gateio.ws/ws/v4/spot',
  buildSubscribeMessage(tokenList) {
    return {
      time: Date.now(),
      channel: 'spot.tickers',
      event: 'subscribe',
      payload: tokenList.map(token => `${token}_USDT`)
    };
  }
};

const BNConfig: ExchangeConfig = {
  wsUrl: 'wss://stream.binance.com:9443/ws',
  buildSubscribeMessage(tokenList) {
    return {
      method: 'SUBSCRIBE',
      params: tokenList.map(token => `${token.toLowerCase()}usdt@ticker`),
      id: Date.now()
    };
  }
};

const HLConfig: ExchangeConfig = {
  wsUrl: 'wss://api.hyperliquid.xyz/ws',

  buildSubscribeMessage(tokenList: string[], interval: '1m' | '5m' | '1h' | '1d' = '1d') {
    // Hyperliquid 要求 coin 为大写，如 BTC / ETH
    return tokenList.map(symbol => ({
      method: 'subscribe',
      subscription: {
        type: 'candle',
        coin: symbol.toUpperCase(),
        interval // 你之后可以做成配置项
      }
    }));
  }
};

export const ExchangeConfigMap: Record<ExchangeType, ExchangeConfig> = {
  OKX: OKXConfig,
  BN: BNConfig,
  Gate: GateConfig,
  HL: HLConfig
};
