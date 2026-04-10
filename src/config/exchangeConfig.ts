import OKXLOGO from '@/assets/image/logo/okx_logo.png';
import GATELOGO from '@/assets/image/logo/gate_logo.png';
import BNLOGO from '@/assets/image/logo/bn_logo.png';
/** 默认展示币种 */
export const defaultCoinList = ['BTC', 'ETH', 'BNB', 'XRP', 'SOL'];

/** 默认数据源 */
export const defaultDataSource: ExchangeType = 'OKX';

/** 交易所类型 */
export type ExchangeType = 'OKX' | 'Gate' | 'BN' | 'HL';
/** 交易所 UI 信息接口 */
export interface ExchangeInfo {
  type: ExchangeType;
  name: string;
  logo: string; // 图片 URL（通过 Vite 导入的图片会被处理为字符串）
  needsVPN: boolean;
  disabled: boolean;
}

/** 交易所 UI 信息配置 */
export const ExchangeListMap: Record<ExchangeType, Omit<ExchangeInfo, 'type'>> = {
  BN: {
    name: 'Binance',
    logo: BNLOGO,
    needsVPN: true,
    disabled: false
  },
  OKX: {
    name: 'OKX',
    logo: OKXLOGO,
    needsVPN: true,
    disabled: false
  },
  Gate: {
    name: 'Gate.io',
    logo: GATELOGO,
    needsVPN: false,
    disabled: false
  },
  HL: {
    name: 'Hyperliquid',
    logo: OKXLOGO, // 暂时使用 OKX logo
    needsVPN: true,
    disabled: true
  }
};
/** 交易所类型 */
export type displayCurrency = 'USD' | 'CNY' | 'EUR' | 'JPY';

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
