export const defaultCoinList = ['ASTER', 'PEPE', 'BTC', 'ETH', 'BNB', 'SOL'];

/** 默认数据源 */
export const defaultDataSource: ExchangeType = 'OKX';

/** 用于 UI 的下拉列表 */
export const ExchangeList: ExchangeType[] = ['OKX', 'Gate', 'BN'];

// 交易所类型
export type ExchangeType = 'OKX' | 'Gate' | 'BN';

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
        instId: `${token}-USDT`
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

export const ExchangeConfigMap: Record<ExchangeType, ExchangeConfig> = {
  OKX: OKXConfig,
  BN: BNConfig,
  Gate: GateConfig
};
