import { Exchange, type ExchangeType } from '@/config/exchangeConfig';
import type { KlineWsSource } from '@/types/kline';
import { bnKlineWsSource, bnFuturesKlineWsSource } from './sources/bn';
import { okxKlineWsSource } from './sources/okx';
import { gateKlineWsSource } from './sources/gate';
import { bnStockKlineWsSource } from './sources/bnStock';

/** 已实现实时 K 线 WS 的交易所。新交易所在这里登记一行 */
export const KlineWsRegistry: Partial<Record<ExchangeType, KlineWsSource>> = {
  [Exchange.BN]: bnKlineWsSource,
  [Exchange.BNFutures]: bnFuturesKlineWsSource,
  [Exchange.OKX]: okxKlineWsSource,
  [Exchange.Gate]: gateKlineWsSource,
  [Exchange.BNStock]: bnStockKlineWsSource
};
