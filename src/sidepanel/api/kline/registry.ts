import { Exchange, type ExchangeType } from '@/config/exchangeConfig';
import type { KlineHistorySource } from '@/types/kline';
import { bnKlineSource, bnFuturesKlineSource } from './sources/bn';
import { okxKlineSource } from './sources/okx';
import { gateKlineSource } from './sources/gate';
import { bnStockKlineSource } from './sources/bnStock';

/** 已实现历史 K 线请求的交易所。新交易所在这里登记一行 */
export const KlineHistoryRegistry: Partial<Record<ExchangeType, KlineHistorySource>> = {
  [Exchange.BN]: bnKlineSource,
  [Exchange.BNFutures]: bnFuturesKlineSource,
  [Exchange.OKX]: okxKlineSource,
  [Exchange.Gate]: gateKlineSource,
  [Exchange.BNStock]: bnStockKlineSource
};
