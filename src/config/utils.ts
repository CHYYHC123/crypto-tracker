import { Exchange, type ExchangeType } from '@/config/exchangeConfig';

// OKX订阅方法
function getOKXSubscribeMessage(tokenList: string[]) {
  return {
    op: 'subscribe',
    args: tokenList.map(token => ({
      channel: 'tickers',
      instId: `${token}-USDT`
    }))
  };
}

// Gate订阅方法
function getGateSubscribeMessage(tokenList: string[]) {
  return {
    time: Date.now(),
    channel: 'spot.tickers',
    event: 'subscribe',
    payload: tokenList.map(token => `${token}_USDT`)
  };
}

// 币安订阅方法
function getBNSubscribeMessage(tokenList: string[]) {
  return {
    method: 'SUBSCRIBE',
    params: tokenList.map(token => `${token.toLowerCase()}usdt@ticker`),
    id: Date.now()
  };
}

//
export function buildSubscribeMessage(exchange: ExchangeType, tokenList: string[]) {
  switch (exchange) {
    case Exchange.OKX:
      return getOKXSubscribeMessage(tokenList);
    case Exchange.Gate:
      return getGateSubscribeMessage(tokenList);
    case Exchange.BN:
      return getBNSubscribeMessage(tokenList);
  }
}
