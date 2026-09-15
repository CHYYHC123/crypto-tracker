import { useState, useEffect } from 'react';
import type React from 'react';
import type { AssetItem } from '@/types/asset';

/**
 * 监听 background 推送的 UPDATE_ASSET_PRICE 消息，维护资产列表状态。
 * 仅当 price / change / lastPrice 发生变化时才触发重渲染。
 * 同时暴露 setTokens 供排序等本地状态操作使用。
 */
export function useAssetTokens(): [AssetItem[], React.Dispatch<React.SetStateAction<AssetItem[]>>] {
  const [tokens, setTokens] = useState<AssetItem[]>([]);

  useEffect(() => {
    function handleMessage(msg: any) {
      if (msg.type !== 'UPDATE_ASSET_PRICE' || !msg.data) return;

      setTokens(prevTokens => {
        if (!prevTokens.length || prevTokens.length !== msg.data.length) return msg.data;

        // 资产类型切换时，symbol 集合会发生变化，需直接替换，否则长度相同时旧引用不会更新
        const prevSymbols = prevTokens.map(t => t.symbol.toUpperCase()).join(',');
        const newSymbols = msg.data.map((t: AssetItem) => t.symbol.toUpperCase()).join(',');
        if (prevSymbols !== newSymbols) return msg.data;

        const updatedMap = new Map<string, AssetItem>();
        msg.data.forEach((token: AssetItem) => {
          updatedMap.set(token.symbol.toUpperCase(), token);
        });

        let hasChanges = false;
        const newTokens = prevTokens.map(token => {
          const updated = updatedMap.get(token.symbol.toUpperCase());
          if (!updated) return token;

          const priceChanged = updated.price !== token.price;
          const changeChanged = updated.change !== token.change;
          const lastPriceChanged = updated.lastPrice !== token.lastPrice;

          if (priceChanged || changeChanged || lastPriceChanged) {
            hasChanges = true;
            return { ...token, price: updated.price, change: updated.change, lastPrice: updated.lastPrice };
          }

          return token;
        });
        return hasChanges ? newTokens : prevTokens;
      });
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  return [tokens, setTokens];
}
