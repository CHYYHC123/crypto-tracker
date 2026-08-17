import { useState, useEffect, useMemo } from 'react';

import type { AssetTypes } from '@/types/index';
import { type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { SUPPORTED_TOKENS } from '@/utils/tokens';
import { EQUITY_SYMBOLS } from '@/config/stocks_symbols';
import { PLATFORM } from '@/utils/index';
import { getDataSource } from '@/utils/local';

const EXCHANGE_BIT: Partial<Record<ExchangeType, number>> = {
  BN: PLATFORM.BN,
  OKX: PLATFORM.OKX,
  Gate: PLATFORM.GATE
};

interface UseSymbolListOptions {
  mode: AssetTypes;
  searchVal: string;
}

export function useSymbolList({ mode, searchVal }: UseSymbolListOptions) {
  const [dataSource, setDataSource] = useState<ExchangeType>(defaultDataSource);

  useEffect(() => {
    getDataSource().then(setDataSource);
  }, []);

  const filteredBySource = useMemo(() => {
    if (mode === 'stocks') {
      return EQUITY_SYMBOLS as Array<{ symbol: string; desc: string }>;
    }
    const bit = EXCHANGE_BIT[dataSource];
    const all = SUPPORTED_TOKENS as unknown as Array<{ symbol: string; platform: number }>;
    return bit === undefined ? all : all.filter(t => (t.platform & bit) !== 0);
  }, [mode, dataSource]);

  const symbolList = useMemo(() => {
    const q = searchVal.toUpperCase();
    if (!q) return filteredBySource;
    return filteredBySource.filter(t => t.symbol.startsWith(q));
  }, [filteredBySource, searchVal]);

  return { symbolList };
}
