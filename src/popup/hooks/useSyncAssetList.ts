import { useState, useEffect, useMemo } from 'react';

import type { AssetTypes } from '@/types/index';
import { type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { SUPPORTED_TOKENS } from '@/utils/tokens';
import { EQUITY_SYMBOLS } from '@/config/stocks_symbols';
import { PLATFORM } from '@/utils/index';
import { getDataSource } from '@/utils/local';
import { fetchEquitySymbols, type EquitySymbol } from '@/popup/utils/getSockets';
import { fetchBinanceSpotSymbols, fetchBinanceFuturesSymbols, fetchOkxSymbols, fetchGateSymbols, type ExchangeSymbol } from '@/popup/utils/fetchExchangeSymbols';

// 各交易所对应的本地位运算过滤掩码（fallback 用）
const EXCHANGE_BIT: Partial<Record<ExchangeType, number>> = {
  BN: PLATFORM.BN,
  OKX: PLATFORM.OKX,
  Gate: PLATFORM.GATE
};

/** 根据 dataSource 选择对应的远端拉取函数 */
function fetchCryptoSymbols(dataSource: ExchangeType): Promise<ExchangeSymbol[] | null> {
  switch (dataSource) {
    case 'BN':
      return fetchBinanceSpotSymbols();
    case 'BNFutures':
      return fetchBinanceFuturesSymbols();
    case 'OKX':
      return fetchOkxSymbols();
    case 'Gate':
      return fetchGateSymbols();
    default:
      return Promise.resolve(null);
  }
}

interface UseSyncAssetListOptions {
  mode: AssetTypes;
  searchVal: string;
}

// 同步拉取支持的币种列表
export function useSyncAssetList({ mode, searchVal }: UseSyncAssetListOptions) {
  const [dataSource, setDataSource] = useState<ExchangeType>(defaultDataSource);
  const [equitySymbols, setEquitySymbols] = useState<EquitySymbol[] | null>(null);
  const [cryptoSymbols, setCryptoSymbols] = useState<ExchangeSymbol[] | null>(null);
  const [loading, setLoading] = useState(false);

  // 初始化：读取当前交易所配置，并监听后续变化
  useEffect(() => {
    getDataSource().then(setDataSource);

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.data_source?.newValue) {
        setDataSource(changes.data_source.newValue as ExchangeType);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // 股票：拉取标的（逻辑保持不变，Binance equity API）
  useEffect(() => {
    if (mode !== 'stocks') return;
    fetchEquitySymbols().then(setEquitySymbols);
  }, [mode]);

  // 加密货币：按 dataSource 从对应交易所拉取标的
  useEffect(() => {
    if (mode !== 'crypto') return;
    setLoading(true);
    setCryptoSymbols(null);
    fetchCryptoSymbols(dataSource).then(result => {
      // console.log('result', result);
      setCryptoSymbols(result);
      setLoading(false);
    });
  }, [mode, dataSource]);

  /** 按数据源过滤后的完整列表（未经搜索词过滤） */
  const filteredBySource = useMemo(() => {
    if (mode === 'stocks') {
      return (equitySymbols ?? (EQUITY_SYMBOLS as unknown as EquitySymbol[])) as Array<{ symbol: string; desc?: string }>;
    }

    // 远端拉取成功 → 直接使用
    if (cryptoSymbols !== null) {
      return cryptoSymbols;
    }

    // fallback：使用本地 SUPPORTED_TOKENS 位运算过滤
    const bit = EXCHANGE_BIT[dataSource];
    const all = SUPPORTED_TOKENS as unknown as Array<{ symbol: string; platform: number }>;
    return bit === undefined ? all : all.filter(t => (t.platform & bit) !== 0);
  }, [mode, dataSource, equitySymbols, cryptoSymbols]);

  /** 经搜索词前缀过滤后的最终列表 */
  const symbolList = useMemo(() => {
    const q = searchVal.toUpperCase();
    if (!q) return filteredBySource;
    return filteredBySource.filter(t => t.symbol.startsWith(q));
  }, [filteredBySource, searchVal]);

  return { symbolList, loading };
}
