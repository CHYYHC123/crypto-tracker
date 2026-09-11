import { useState, useEffect, useMemo } from 'react';

import type { AssetTypes } from '@/types/index';
import { type ExchangeType, defaultDataSource } from '@/config/exchangeConfig';
import { SUPPORTED_TOKENS } from '@/utils/tokens';
import { EQUITY_SYMBOLS } from '@/config/stocks_symbols';
import { PLATFORM } from '@/utils/index';
import { getDataSource } from '@/utils/local';
import { fetchEquitySymbols, type EquitySymbol } from '@/popup/utils/getSockets';

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
  const [equitySymbols, setEquitySymbols] = useState<EquitySymbol[] | null>(null);

  useEffect(() => {
    getDataSource().then(setDataSource);
  }, []);

  useEffect(() => {
    fetchEquitySymbols().then(setEquitySymbols);
  }, []);

  const filteredBySource = useMemo(() => {
    if (mode === 'stocks') {
      const source = equitySymbols ?? (EQUITY_SYMBOLS as unknown as EquitySymbol[]);
      return source;
    }
    const bit = EXCHANGE_BIT[dataSource];
    const all = SUPPORTED_TOKENS as unknown as Array<{ symbol: string; platform: number }>;
    return bit === undefined ? all : all.filter(t => (t.platform & bit) !== 0);
  }, [mode, dataSource, equitySymbols]);

  const symbolList = useMemo(() => {
    const q = searchVal.toUpperCase();
    if (!q) return filteredBySource;
    return filteredBySource.filter(t => t.symbol.startsWith(q));
  }, [filteredBySource, searchVal]);

  return { symbolList };
}
