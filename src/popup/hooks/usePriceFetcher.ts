import { useState, useEffect } from 'react';
import useSWR from 'swr';

import type { AssetItem } from '@/types/asset';

function fetchPrices(): Promise<AssetItem[]> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'GET_LATEST_PRICES' }, resp => {
      resolve(resp?.data || []);
    });
  });
}

export function usePriceFetcher() {
  const [tokens, setTokens] = useState<AssetItem[]>([]);
  const [countdown, setCountdown] = useState(10);

  const { data: tokenList, isLoading, mutate } = useSWR<AssetItem[]>('token-prices', fetchPrices, {
    revalidateOnFocus: true,
    fallbackData: []
  });

  useEffect(() => {
    setTokens(tokenList ?? []);
  }, [tokenList]);

  useEffect(() => {
    setCountdown(10);
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          mutate();
          return 10;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [tokens?.length]);

  return { tokens, setTokens, countdown, setCountdown, isLoading, mutate };
}
